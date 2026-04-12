import { describe, it, expect } from "vitest";
import { validateKolonakiConfig } from "../validate";

const validConfig = {
  product: { name: "Acme", fromEmail: "hello@acme.com" },
  segmentation: {
    questions: [
      {
        id: "role",
        text: "What is your role?",
        options: [{ label: "Developer", value: "dev" }],
      },
    ],
  },
  workspace: { enabled: true, allowedDomainsOnly: false },
  activation: {
    ahaEventName: "aha",
    steps: [
      {
        id: "setup",
        title: "Set up",
        description: "Do the thing",
        completedOnSignup: false,
      },
    ],
  },
  emails: {
    sequences: [
      { trigger: "signup" as const, templateId: "welcome", delayMinutes: 0 },
    ],
  },
};

describe("validateKolonakiConfig", () => {
  it("accepts a valid config", () => {
    expect(() => validateKolonakiConfig(validConfig)).not.toThrow();
  });

  it("returns the parsed config", () => {
    const result = validateKolonakiConfig(validConfig);
    expect(result.product.name).toBe("Acme");
  });

  it("rejects missing product.name", () => {
    const bad = { ...validConfig, product: { name: "", fromEmail: "a@b.com" } };
    expect(() => validateKolonakiConfig(bad)).toThrow();
  });

  it("rejects invalid fromEmail", () => {
    const bad = {
      ...validConfig,
      product: { name: "Acme", fromEmail: "not-an-email" },
    };
    expect(() => validateKolonakiConfig(bad)).toThrow(/email/i);
  });

  it("rejects empty segmentation questions", () => {
    const bad = {
      ...validConfig,
      segmentation: { questions: [] },
    };
    expect(() => validateKolonakiConfig(bad)).toThrow();
  });

  it("rejects duplicate step IDs", () => {
    const bad = {
      ...validConfig,
      activation: {
        ...validConfig.activation,
        steps: [
          { id: "dup", title: "A", description: "a" },
          { id: "dup", title: "B", description: "b" },
        ],
      },
    };
    expect(() => validateKolonakiConfig(bad)).toThrow(/Duplicate step IDs/);
  });

  it("rejects duplicate email triggers", () => {
    const bad = {
      ...validConfig,
      emails: {
        sequences: [
          { trigger: "signup" as const, templateId: "a", delayMinutes: 0 },
          { trigger: "signup" as const, templateId: "b", delayMinutes: 0 },
        ],
      },
    };
    expect(() => validateKolonakiConfig(bad)).toThrow(/Duplicate email triggers/);
  });

  it("accepts a description function for checklist steps", () => {
    const withFn = {
      ...validConfig,
      activation: {
        ...validConfig.activation,
        steps: [
          {
            id: "step1",
            title: "Dynamic",
            description: (seg: Record<string, string>) =>
              `Hello ${seg.role}`,
          },
        ],
      },
    };
    expect(() => validateKolonakiConfig(withFn)).not.toThrow();
  });
});
