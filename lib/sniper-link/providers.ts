// Sniper link provider detection + URL generation.
//
// Ported from buttondown/sniper-link (MIT licensed):
// https://github.com/buttondown/sniper-link
//
// What's included from upstream:
// - Static provider map (8 providers) with domain aliases
// - Pre-computed domain → provider Map for O(1) lookup
// - Desktop link generators with provider-specific search syntax
// - MX record parsing + ambiguity-aware matching for custom domains
//
// What's omitted in v1:
// - iOS / Android native deep links (web links work everywhere; can add later)
// - PNG provider logos (we only need the pretty name in the button)

export type ProviderKey =
  | "gmail"
  | "yahoo"
  | "microsoft"
  | "proton"
  | "icloud"
  | "hey"
  | "aol"
  | "mail_ru";

type LinkOptions = Readonly<{ recipient: string; sender: string }>;

export type Provider = Readonly<{
  key: ProviderKey;
  prettyName: string;
  domains: ReadonlyArray<string>;
  getDesktopLink: (options: LinkOptions) => string;
}>;

const buildUrl = (baseHref: string, key: string, value: string): string => {
  const result = new URL(baseHref);
  result.searchParams.set(key, value);
  return result.toString();
};

export const PROVIDERS: ReadonlyArray<Provider> = [
  {
    key: "gmail",
    prettyName: "Gmail",
    domains: ["gmail.com", "googlemail.com", "google.com"],
    // Gmail's `/u/<X>/` segment expects a numeric account index, not an email.
    // Passing an email works only when that account happens to be signed in at
    // that index; for Workspace/custom-domain accounts or not-signed-in users
    // it throws an error before the `#search` fragment ever runs. `authuser`
    // is the resolver Gmail itself uses to hand off to the right account
    // (or to sign-in).
    getDesktopLink: ({ recipient, sender }) =>
      `https://mail.google.com/mail/u/0/?authuser=${encodeURIComponent(recipient)}#search/from%3A(${encodeURIComponent(sender)})+in%3Aanywhere+newer_than%3A1h`,
  },
  {
    key: "yahoo",
    prettyName: "Yahoo Mail",
    domains: [
      "yahoo.com",
      "myyahoo.com",
      "yahoo.co.uk",
      "yahoo.fr",
      "yahoo.it",
      "ymail.com",
      "rocketmail.com",
    ],
    getDesktopLink: ({ sender }) =>
      `https://mail.yahoo.com/d/search/keyword=from:${encodeURIComponent(sender)}`,
  },
  {
    key: "microsoft",
    prettyName: "Outlook",
    domains: [
      "outlook.com",
      "live.com",
      "live.de",
      "hotmail.com",
      "hotmail.co.uk",
      "hotmail.de",
      "msn.com",
      "passport.com",
      "passport.net",
    ],
    getDesktopLink: ({ recipient }) =>
      buildUrl("https://outlook.live.com/mail/", "login_hint", recipient),
  },
  {
    key: "proton",
    prettyName: "Proton Mail",
    domains: ["proton.me", "pm.me", "protonmail.com", "protonmail.ch"],
    getDesktopLink: ({ sender }) =>
      `https://mail.proton.me/u/0/all-mail#from=${encodeURIComponent(sender)}`,
  },
  {
    key: "icloud",
    prettyName: "iCloud Mail",
    domains: ["icloud.com", "me.com", "mac.com"],
    getDesktopLink: () => "https://www.icloud.com/mail",
  },
  {
    key: "hey",
    prettyName: "HEY",
    domains: ["hey.com"],
    getDesktopLink: () => "https://app.hey.com/topics/everything",
  },
  {
    key: "aol",
    prettyName: "AOL",
    domains: ["aol.com"],
    getDesktopLink: ({ sender }) =>
      `https://mail.aol.com/d/search/keyword=from:${encodeURIComponent(sender)}`,
  },
  {
    key: "mail_ru",
    prettyName: "Mail.ru",
    domains: ["mail.ru"],
    getDesktopLink: ({ sender }) =>
      buildUrl("https://e.mail.ru/search/", "q_from", sender),
  },
];

const PROVIDER_BY_DOMAIN = new Map<string, Provider>();
for (const provider of PROVIDERS) {
  for (const domain of provider.domains) {
    PROVIDER_BY_DOMAIN.set(domain, provider);
  }
}

export const extractDomain = (email: string): string =>
  email.split("@").pop()?.toLowerCase() ?? "";

export const generateLink = (
  provider: Provider,
  options: LinkOptions,
): string => provider.getDesktopLink(options);

const getProviderForMxExchange = (exchange: string): Provider | undefined => {
  const direct = PROVIDER_BY_DOMAIN.get(exchange);
  if (direct) return direct;

  for (const provider of PROVIDERS) {
    for (const domain of provider.domains) {
      if (exchange.endsWith(`.${domain}`)) return provider;
    }
  }
  return undefined;
};

type MxRecord = { priority: number; exchange: string };

// Cloudflare DNS-over-HTTPS returns MX data as "<priority> <exchange>".
export const parseMxRecords = (
  answer: ReadonlyArray<{ type: number; data: string }>,
): MxRecord[] =>
  answer
    .filter((record) => record.type === 15)
    .map((record) => {
      const spaceIndex = record.data.indexOf(" ");
      const priority = Number.parseInt(record.data.slice(0, spaceIndex), 10);
      const exchange = record.data
        .slice(spaceIndex + 1)
        .replace(/\.$/, "")
        .toLowerCase();
      return { priority, exchange };
    })
    .filter((r) => r.exchange && !Number.isNaN(r.priority));

// Returns a provider only when the lowest-priority level that contains a
// recognized provider has exactly one unique provider. Prevents false
// positives on split-routing setups (e.g. inbound to Gmail + Outlook).
export const matchProviderFromMxRecords = (
  records: ReadonlyArray<MxRecord>,
): Provider | null => {
  let bestPriorityWithProvider = Number.POSITIVE_INFINITY;
  const providersByPriority = new Map<number, Set<Provider | undefined>>();

  for (const { priority, exchange } of records) {
    if (priority > bestPriorityWithProvider) continue;

    const provider = getProviderForMxExchange(exchange);
    const providersAtThisPriority =
      providersByPriority.get(priority) ?? new Set();
    providersAtThisPriority.add(provider);
    providersByPriority.set(priority, providersAtThisPriority);

    if (provider) {
      bestPriorityWithProvider = Math.min(
        bestPriorityWithProvider,
        priority,
      );
    }
  }

  const candidates = providersByPriority.get(bestPriorityWithProvider);
  if (!candidates || candidates.size !== 1) return null;

  const first = candidates.values().next().value;
  return first ?? null;
};

const generateProviderViaDNS = async (
  domain: string,
  signal?: AbortSignal,
): Promise<Provider | null> => {
  try {
    const res = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=MX`,
      { headers: { Accept: "application/dns-json" }, signal },
    );
    if (res.status !== 200) return null;
    const json = (await res.json()) as {
      Status?: number;
      Answer?: Array<{ type: number; data: string }>;
    };
    if (json.Status !== 0 || !json.Answer) return null;
    return matchProviderFromMxRecords(parseMxRecords(json.Answer));
  } catch {
    return null;
  }
};

export const detectProvider = async (
  email: string,
  options?: { signal?: AbortSignal },
): Promise<Provider | null> => {
  const domain = extractDomain(email);
  if (!domain) return null;
  const hardcoded = PROVIDER_BY_DOMAIN.get(domain);
  if (hardcoded) return hardcoded;
  return await generateProviderViaDNS(domain, options?.signal);
};
