"use client";

import { useEffect } from "react";

// After the page mounts with ?msg=resend_success (or any other key), strip the
// param from the URL via history.replaceState so a refresh or bookmark doesn't
// keep showing the stale "Confirmation email sent" banner indefinitely. The
// initial render already used the param to pick the right message — this just
// cleans up the URL so reload state matches the user's actual situation.
export function UrlCleanup() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.location.search) return;
    const params = new URLSearchParams(window.location.search);
    if (!params.has("msg")) return;
    params.delete("msg");
    const next = params.toString();
    const url = next
      ? `${window.location.pathname}?${next}`
      : window.location.pathname;
    window.history.replaceState({}, "", url);
  }, []);

  return null;
}
