import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockListUsers, mockUpdateUserById, mockCronEmail } = vi.hoisted(() => ({
  mockListUsers: vi.fn(),
  mockUpdateUserById: vi.fn().mockResolvedValue({ data: null, error: null }),
  mockCronEmail: vi.fn(),
}));

vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient: vi.fn().mockReturnValue({
    auth: {
      admin: {
        listUsers: mockListUsers,
        updateUserById: mockUpdateUserById,
      },
    },
  }),
}));

vi.mock("@/lib/kolonaki/email", () => ({
  sendKolonakiEmail: mockCronEmail,
}));

import { GET } from "../route";

function makeRequest(secret: string | null) {
  return new Request("http://localhost/api/cron/activation-nudge", {
    headers: secret !== null ? { Authorization: `Bearer ${secret}` } : {},
  });
}

const CRON_SECRET = "test-cron-secret";

describe("activation-nudge cron", () => {
  let originalSecret: string | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    originalSecret = process.env.CRON_SECRET;
    process.env.CRON_SECRET = CRON_SECRET;
  });

  afterEach(() => {
    process.env.CRON_SECRET = originalSecret;
  });

  it("returns 401 for an invalid CRON_SECRET", async () => {
    const res = await GET(makeRequest("wrong-secret"));
    expect(res.status).toBe(401);
    expect(mockListUsers).not.toHaveBeenCalled();
  });

  it("nudges an eligible user (segmentation done >24h ago, no aha, no prior nudge)", async () => {
    const staleTs = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    mockListUsers.mockResolvedValue({
      data: {
        users: [
          {
            id: "user-stale",
            email: "stale@example.com",
            user_metadata: { segmentation_completed_at: staleTs },
          },
        ],
      },
      error: null,
    });

    const res = await GET(makeRequest(CRON_SECRET));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.nudged).toBe(1);
    expect(mockUpdateUserById).toHaveBeenCalledWith("user-stale", {
      user_metadata: { nudge_sent_at: expect.any(String) },
    });
    expect(mockCronEmail).toHaveBeenCalledWith(
      "checklist_stalled",
      "stale@example.com",
    );
  });

  it("skips users who already received a nudge", async () => {
    const staleTs = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    mockListUsers.mockResolvedValue({
      data: {
        users: [
          {
            id: "user-nudged",
            email: "nudged@example.com",
            user_metadata: {
              segmentation_completed_at: staleTs,
              nudge_sent_at: "2026-01-01T00:00:00.000Z",
            },
          },
        ],
      },
      error: null,
    });

    const res = await GET(makeRequest(CRON_SECRET));
    const body = await res.json();

    expect(body.nudged).toBe(0);
    expect(mockCronEmail).not.toHaveBeenCalled();
  });
});
