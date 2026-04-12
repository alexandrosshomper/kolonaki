import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted() runs before vi.mock() factories — required for variables used in factories
const { mockGetUser, mockUpdateUser, mockAdminGetInvitation } = vi.hoisted(() => {
  return {
    mockGetUser: vi.fn(),
    mockUpdateUser: vi.fn().mockResolvedValue({ data: {}, error: null }),
    mockAdminGetInvitation: vi.fn(),
  };
});

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
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: mockAdminGetInvitation,
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    }),
    auth: {
      admin: {
        updateUserById: vi.fn().mockResolvedValue({ error: null }),
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

import { completeSegmentation, trackAhaEvent } from "../actions";
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
});
