"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendInvitation } from "@/lib/kolonaki/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function InviteForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setError(null);

    startTransition(async () => {
      try {
        await sendInvitation(email);
        setSent(true);
        setTimeout(() => router.push("/onboarding/checklist"), 1500);
      } catch {
        setError("Failed to send invitation. Please try again.");
      }
    });
  }

  if (sent) {
    return (
      <p className="text-sm text-center text-muted-foreground">
        Invite sent to {email}. Redirecting…
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Input
        type="email"
        placeholder="teammate@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        disabled={isPending}
      />
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" disabled={!email || isPending}>
        {isPending ? "Sending…" : "Send Invite →"}
      </Button>
    </form>
  );
}
