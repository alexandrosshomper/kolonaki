import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted() runs before vi.mock() factories — required for variables used in factories
const {
  mockGetUser,
  mockUpdateUser,
  mockAdminFrom,
  mockAdminGetUserById,
  mockResendSend,
} = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockUpdateUser: vi.fn().mockResolvedValue({ data: {}, error: null }),
  mockAdminFrom: vi.fn(),
  mockAdminGetUserById: vi.fn(),
  mockResendSend: vi.fn().mockResolvedValue({ data: {}, error: null }),
}));

vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: mockGetUser,
      updateUser: mockUpdateUser,
    },
  }),
}));

vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient: vi.fn().mockReturnValue({
    from: mockAdminFrom,
    auth: {
      admin: {
        getUserById: mockAdminGetUserById,
      },
    },
  }),
}));

vi.mock("@/lib/posthog/server", () => ({
  posthog: {
    identify: vi.fn(),
    capture: vi.fn(),
  },
}));

vi.mock("@/lib/kolonaki/email", () => ({
  sendKolonakiEmail: vi.fn(),
}));

vi.mock("@/lib/resend/server", () => ({
  resend: {
    emails: {
      send: mockResendSend,
    },
  },
}));

import {
  completeSegmentation,
  trackAhaEvent,
  acceptInvitation,
  sendInvitation,
} from "../actions";
import { posthog } from "@/lib/posthog/server";
import { sendKolonakiEmail } from "../email";

const mockUser = {
  id: "user-123",
  email: "test@example.com",
  user_metadata: {
    onboarding_steps: {},
  },
};

describe("completeSegmentation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
  });

  it("throws if unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    await expect(completeSegmentation({ role: "dev" })).rejects.toThrow(
      "Unauthenticated",
    );
  });

  it("calls updateUser with segmentation answers", async () => {
    await completeSegmentation({ role: "dev", use_case: "side-project" });
    expect(mockUpdateUser).toHaveBeenCalledTimes(1);
    const call = mockUpdateUser.mock.calls[0][0];
    expect(call.data.segmentation).toEqual({
      role: "dev",
      use_case: "side-project",
    });
    expect(call.data.segmentation_completed_at).toBeTruthy();
  });

  it("calls posthog.identify with user id and answers", async () => {
    await completeSegmentation({ role: "dev" });
    expect(posthog.identify).toHaveBeenCalledWith({
      distinctId: "user-123",
      properties: { role: "dev" },
    });
  });

  it("preserves existing onboarding_steps on re-entry", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          ...mockUser,
          user_metadata: { onboarding_steps: { create_account: true } },
        },
      },
    });
    await completeSegmentation({ role: "dev" });
    const call = mockUpdateUser.mock.calls[0][0];
    expect(call.data.onboarding_steps.create_account).toBe(true);
  });

  it("does not overwrite aha_reached_at on re-entry (shallow merge safety)", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          ...mockUser,
          user_metadata: {
            onboarding_steps: { create_account: true },
            aha_reached_at: "2026-01-01T00:00:00.000Z",
          },
        },
      },
    });
    await completeSegmentation({ role: "dev" });
    const call = mockUpdateUser.mock.calls[0][0];
    // completeSegmentation must NOT include aha_reached_at in the write — shallow merge
    // would overwrite the existing value if it were included with undefined.
    expect(call.data).not.toHaveProperty("aha_reached_at");
  });
});

describe("trackAhaEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws if unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    await expect(trackAhaEvent("complete_setup")).rejects.toThrow(
      "Unauthenticated",
    );
  });

  it("marks the step done in user_metadata", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          ...mockUser,
          user_metadata: {
            segmentation: { role: "dev" },
            onboarding_steps: { create_account: true },
          },
        },
      },
    });
    await trackAhaEvent("complete_setup");
    expect(mockUpdateUser).toHaveBeenCalled();
    const call = mockUpdateUser.mock.calls[0][0];
    expect(call.data.onboarding_steps.complete_setup).toBe(true);
  });

  it("does not fire aha again if already reached", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          ...mockUser,
          user_metadata: {
            segmentation: { role: "dev" },
            aha_reached_at: "2026-01-01T00:00:00.000Z",
            onboarding_steps: { create_account: true, complete_setup: true },
          },
        },
      },
    });
    await trackAhaEvent("complete_setup");
    expect(sendKolonakiEmail).not.toHaveBeenCalled();
    expect(posthog.capture).not.toHaveBeenCalled();
  });

  it("returns { aha: true } and fires email + PostHog when last required step completes", async () => {
    const user = {
      ...mockUser,
      user_metadata: {
        segmentation: { role: "dev" },
        // create_account is completedOnSignup — not a required step
        onboarding_steps: { create_account: true },
        // no aha_reached_at
      },
    };
    // Called twice: initial getUser + soft race re-check
    mockGetUser.mockResolvedValue({ data: { user } });

    const result = await trackAhaEvent("complete_setup");

    expect(result).toEqual({ aha: true });
    expect(posthog.capture).toHaveBeenCalledWith(
      expect.objectContaining({ event: "aha_moment_reached" }),
    );
    expect(sendKolonakiEmail).toHaveBeenCalledWith(
      "aha_moment_reached",
      "test@example.com",
    );
  });
});

describe("acceptInvitation", () => {
  const futureExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns inviterEmail for a valid invitation", async () => {
    const invitation = {
      id: "inv-1",
      inviter_id: "inviter-123",
      email: "test@example.com",
      accepted_at: null,
      expires_at: futureExpiry,
    };

    mockAdminFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: invitation, error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            select: vi
              .fn()
              .mockResolvedValue({ data: [{ id: "inv-1" }], error: null }),
          }),
        }),
      }),
    });
    mockAdminGetUserById.mockResolvedValue({
      data: { user: { email: "inviter@example.com" } },
    });
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "test@example.com" } },
    });

    const result = await acceptInvitation("valid-token");
    expect(result).toEqual({ inviterEmail: "inviter@example.com" });
  });

  it("throws for an expired invitation", async () => {
    const invitation = {
      id: "inv-2",
      inviter_id: "inviter-123",
      email: "test@example.com",
      accepted_at: null,
      expires_at: new Date(Date.now() - 1000).toISOString(),
    };

    mockAdminFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: invitation, error: null }),
        }),
      }),
    });

    await expect(acceptInvitation("expired-token")).rejects.toThrow(
      "Invitation expired",
    );
  });

  it("throws if invitation is already accepted", async () => {
    const invitation = {
      id: "inv-3",
      inviter_id: "inviter-123",
      email: "test@example.com",
      accepted_at: "2026-01-01T00:00:00.000Z",
      expires_at: futureExpiry,
    };

    mockAdminFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: invitation, error: null }),
        }),
      }),
    });

    await expect(acceptInvitation("used-token")).rejects.toThrow(
      "Invitation already accepted",
    );
  });

  it("throws if user email does not match the invitation", async () => {
    const invitation = {
      id: "inv-4",
      inviter_id: "inviter-123",
      email: "other@example.com",
      accepted_at: null,
      expires_at: futureExpiry,
    };

    mockAdminFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: invitation, error: null }),
        }),
      }),
    });
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "test@example.com" } },
    });

    await expect(acceptInvitation("wrong-email-token")).rejects.toThrow(
      "Invitation email does not match the signed-in account",
    );
  });
});

describe("sendInvitation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates an invitation and sends the invite email", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "sender@example.com" } },
    });
    mockAdminFrom.mockReturnValue({
      upsert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi
            .fn()
            .mockResolvedValue({ data: { token: "test-token-xyz" }, error: null }),
        }),
      }),
    });

    await sendInvitation("invitee@example.com");

    expect(mockResendSend).toHaveBeenCalledWith(
      expect.objectContaining({ to: "invitee@example.com" }),
    );
  });

  it("throws if unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    await expect(sendInvitation("invitee@example.com")).rejects.toThrow(
      "Unauthenticated",
    );
  });
});
