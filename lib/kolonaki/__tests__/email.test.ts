import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Resend before importing email module
vi.mock("@/lib/resend/server", () => ({
  resend: {
    emails: {
      send: vi.fn().mockResolvedValue({ data: { id: "mock-id" }, error: null }),
    },
  },
}));

// Mock React Email components (render to HTML is not needed in unit tests)
vi.mock("@/lib/emails/WelcomeEmail", () => ({
  WelcomeEmail: () => null,
}));
vi.mock("@/lib/emails/AhaEmail", () => ({
  AhaEmail: () => null,
}));
vi.mock("@/lib/emails/NudgeEmail", () => ({
  NudgeEmail: () => null,
}));

import { resend } from "@/lib/resend/server";
import { sendKolonakiEmail } from "../email";

const mockSend = resend.emails.send as ReturnType<typeof vi.fn>;

describe("sendKolonakiEmail", () => {
  beforeEach(() => {
    mockSend.mockClear();
  });

  it("calls resend.emails.send for a known trigger", () => {
    sendKolonakiEmail("signup", "user@example.com");
    // fire-and-forget: allow the microtask to flush
    expect(mockSend).toHaveBeenCalledTimes(1);
    const call = mockSend.mock.calls[0][0];
    expect(call.to).toBe("user@example.com");
    expect(call.subject).toContain("Welcome");
  });

  it("sends aha_moment_reached email with correct subject", () => {
    sendKolonakiEmail("aha_moment_reached", "aha@example.com");
    expect(mockSend).toHaveBeenCalledTimes(1);
    const call = mockSend.mock.calls[0][0];
    expect(call.subject).toBe("You did it!");
  });

  it("sends checklist_stalled email with correct subject", () => {
    sendKolonakiEmail("checklist_stalled", "stalled@example.com");
    expect(mockSend).toHaveBeenCalledTimes(1);
    const call = mockSend.mock.calls[0][0];
    expect(call.subject).toBe("Still getting started?");
  });

  it("does nothing when trigger has no matching sequence", () => {
    // Force no matching sequence by checking send is not called
    // (all 3 valid triggers have sequences in the default config,
    //  so we verify the guard exists by checking a scenario handled gracefully)
    const originalFind = Array.prototype.find;
    const spy = vi.spyOn(Array.prototype, "find").mockReturnValueOnce(undefined);
    sendKolonakiEmail("signup", "user@example.com");
    expect(mockSend).not.toHaveBeenCalled();
    spy.mockRestore();
    Array.prototype.find = originalFind;
  });
});
