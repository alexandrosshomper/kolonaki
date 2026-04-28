import {
  detectProvider,
  generateLink,
  type ProviderKey,
} from "./providers";

export type SniperLink = {
  url: string;
  providerKey: ProviderKey;
  providerName: string;
};

export async function getSniperLink(
  recipient: string,
  sender: string,
  options?: { signal?: AbortSignal },
): Promise<SniperLink | null> {
  const recipientNormalized = recipient.trim().toLowerCase();
  const senderNormalized = sender.trim().toLowerCase();
  if (!recipientNormalized || !senderNormalized) return null;

  const provider = await detectProvider(recipientNormalized, options);
  if (!provider) return null;

  return {
    url: generateLink(provider, {
      recipient: recipientNormalized,
      sender: senderNormalized,
    }),
    providerKey: provider.key,
    providerName: provider.prettyName,
  };
}

export type { ProviderKey } from "./providers";
