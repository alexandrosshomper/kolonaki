"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

export function ResendButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="outline"
      disabled={pending}
      className="w-full"
    >
      {pending ? "Sending..." : "Resend"}
    </Button>
  );
}
