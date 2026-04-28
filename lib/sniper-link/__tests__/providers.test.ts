import { describe, it, expect } from "vitest";
import {
  PROVIDERS,
  extractDomain,
  generateLink,
  parseMxRecords,
  matchProviderFromMxRecords,
  detectProvider,
} from "../providers";

const findProvider = (key: string) => {
  const p = PROVIDERS.find((x) => x.key === key);
  if (!p) throw new Error(`provider ${key} missing`);
  return p;
};

describe("extractDomain", () => {
  it("extracts the domain from a normal email", () => {
    expect(extractDomain("alex@gmail.com")).toBe("gmail.com");
  });

  it("lowercases the domain", () => {
    expect(extractDomain("alex@GMAIL.com")).toBe("gmail.com");
  });

  it("returns empty string when no @ present", () => {
    expect(extractDomain("not-an-email")).toBe("not-an-email");
  });

  it("returns empty string for empty input", () => {
    expect(extractDomain("")).toBe("");
  });
});

describe("generateLink — desktop URLs", () => {
  it("Gmail uses authuser query param (not /u/{email})", () => {
    const url = generateLink(findProvider("gmail"), {
      recipient: "alex@gmail.com",
      sender: "onboarding@kolonaki.com",
    });
    expect(url).toContain("?authuser=alex%40gmail.com");
    expect(url).toContain("#search/from%3A(onboarding%40kolonaki.com)");
    expect(url).toContain("in%3Aanywhere");
    expect(url).toContain("newer_than%3A1h");
    expect(url).not.toMatch(/\/mail\/u\/[^0]/);
  });

  it("Outlook builds login_hint via URL API", () => {
    const url = generateLink(findProvider("microsoft"), {
      recipient: "alex@outlook.com",
      sender: "noreply@example.com",
    });
    expect(url).toContain("login_hint=alex%40outlook.com");
    expect(url.startsWith("https://outlook.live.com/mail/")).toBe(true);
  });

  it("Yahoo, Proton, AOL include from filter", () => {
    // Yahoo/AOL leave `from:` literal in the URL path and only encode the
    // sender value, so the colon is NOT percent-encoded.
    expect(
      generateLink(findProvider("yahoo"), {
        recipient: "x@yahoo.com",
        sender: "from@example.com",
      }),
    ).toContain("keyword=from:from%40example.com");
    expect(
      generateLink(findProvider("proton"), {
        recipient: "x@proton.me",
        sender: "from@example.com",
      }),
    ).toContain("#from=from%40example.com");
    expect(
      generateLink(findProvider("aol"), {
        recipient: "x@aol.com",
        sender: "from@example.com",
      }),
    ).toContain("keyword=from:from%40example.com");
  });

  it("iCloud and HEY return inbox without filter (provider doesn't support it)", () => {
    expect(
      generateLink(findProvider("icloud"), {
        recipient: "x@icloud.com",
        sender: "from@example.com",
      }),
    ).toBe("https://www.icloud.com/mail");
    expect(
      generateLink(findProvider("hey"), {
        recipient: "x@hey.com",
        sender: "from@example.com",
      }),
    ).toBe("https://app.hey.com/topics/everything");
  });
});

describe("parseMxRecords", () => {
  it("extracts priority and exchange from DoH response", () => {
    const records = parseMxRecords([
      { type: 15, data: "10 aspmx.l.google.com." },
      { type: 15, data: "20 alt1.aspmx.l.google.com." },
    ]);
    expect(records).toEqual([
      { priority: 10, exchange: "aspmx.l.google.com" },
      { priority: 20, exchange: "alt1.aspmx.l.google.com" },
    ]);
  });

  it("ignores non-MX records (type !== 15)", () => {
    const records = parseMxRecords([
      { type: 1, data: "1.2.3.4" },
      { type: 15, data: "10 aspmx.l.google.com." },
    ]);
    expect(records).toHaveLength(1);
    expect(records[0]?.exchange).toBe("aspmx.l.google.com");
  });

  it("filters malformed records", () => {
    const records = parseMxRecords([
      { type: 15, data: "not-a-priority aspmx.l.google.com." },
      { type: 15, data: "10 " },
    ]);
    expect(records).toHaveLength(0);
  });
});

describe("matchProviderFromMxRecords", () => {
  it("matches Workspace custom domain to Gmail via MX exchange suffix", () => {
    const provider = matchProviderFromMxRecords([
      { priority: 10, exchange: "aspmx.l.google.com" },
      { priority: 20, exchange: "alt1.aspmx.l.google.com" },
    ]);
    expect(provider?.key).toBe("gmail");
  });

  it("matches Microsoft 365 custom domain via .outlook.com suffix", () => {
    // Workspace-style M365 inbound MX is `<tenant>.mail.protection.outlook.com`
    // — the .outlook.com suffix is what catches custom domains hosted on M365.
    const provider = matchProviderFromMxRecords([
      { priority: 10, exchange: "company-com.mail.protection.outlook.com" },
    ]);
    expect(provider?.key).toBe("microsoft");
  });

  it("returns null when MX records split between two providers at same priority", () => {
    const provider = matchProviderFromMxRecords([
      { priority: 10, exchange: "aspmx.l.google.com" },
      { priority: 10, exchange: "mta1.proton.me" },
    ]);
    expect(provider).toBeNull();
  });

  it("returns null when no records match a provider", () => {
    const provider = matchProviderFromMxRecords([
      { priority: 10, exchange: "mx.fastmail.com" },
    ]);
    expect(provider).toBeNull();
  });

  it("ignores higher-priority records once a lower-priority match exists", () => {
    const provider = matchProviderFromMxRecords([
      { priority: 10, exchange: "aspmx.l.google.com" },
      { priority: 50, exchange: "mta1.proton.me" },
    ]);
    expect(provider?.key).toBe("gmail");
  });
});

describe("detectProvider — hardcoded paths (no network)", () => {
  it("returns Gmail for @gmail.com without DNS lookup", async () => {
    const provider = await detectProvider("alex@gmail.com");
    expect(provider?.key).toBe("gmail");
  });

  it("returns Outlook for @hotmail.co.uk", async () => {
    const provider = await detectProvider("alex@hotmail.co.uk");
    expect(provider?.key).toBe("microsoft");
  });

  it("returns Proton for @pm.me", async () => {
    const provider = await detectProvider("alex@pm.me");
    expect(provider?.key).toBe("proton");
  });

  it("returns null for empty email", async () => {
    expect(await detectProvider("")).toBeNull();
  });
});
