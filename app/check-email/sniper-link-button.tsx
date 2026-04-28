"use client";

import { useEffect, useState } from "react";
import posthog from "posthog-js";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getSniperLink, type SniperLink } from "@/lib/sniper-link";

type Props = {
  email: string;
  from: string;
};

export function SniperLinkButton({ email, from }: Props) {
  const [link, setLink] = useState<SniperLink | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    getSniperLink(email, from, { signal: controller.signal })
      .then((result) => {
        if (cancelled) return;
        setLink(result);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [email, from]);

  if (loading) {
    return <Skeleton className="h-9 w-full" />;
  }

  if (!link) return null;

  return (
    <Button
      asChild
      className="w-full"
      onClick={() =>
        posthog.capture("sniper_link_clicked", {
          provider: link.providerKey,
          recipient_domain: email.split("@").pop()?.toLowerCase(),
        })
      }
    >
      <a href={link.url} target="_blank" rel="noopener noreferrer">
        Open {link.providerName}
      </a>
    </Button>
  );
}
