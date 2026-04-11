import "server-only";
import * as React from "react";
import config from "@/kolonaki.config";
import { resend } from "@/lib/resend/server";
import { WelcomeEmail } from "@/lib/emails/WelcomeEmail";
import { AhaEmail } from "@/lib/emails/AhaEmail";
import { NudgeEmail } from "@/lib/emails/NudgeEmail";
import type { EmailSequence } from "@/lib/kolonaki/types";

const SUBJECTS: Record<EmailSequence["trigger"], string> = {
  signup: `Welcome to ${config.product.name}`,
  aha_moment_reached: "You did it!",
  checklist_stalled: "Still getting started?",
};

const COMPONENTS: Record<EmailSequence["trigger"], React.ReactElement> = {
  signup: React.createElement(WelcomeEmail, { productName: config.product.name }),
  aha_moment_reached: React.createElement(AhaEmail, { productName: config.product.name }),
  checklist_stalled: React.createElement(NudgeEmail, { productName: config.product.name }),
};

/**
 * Fire-and-forget email send. Looks up the trigger in config.emails.sequences.
 * If no matching sequence found, does nothing.
 */
export function sendKolonakiEmail(
  trigger: EmailSequence["trigger"],
  to: string,
): void {
  const seq = config.emails.sequences.find((s) => s.trigger === trigger);
  if (!seq) return;

  void resend.emails
    .send({
      from: config.product.fromEmail,
      to,
      subject: SUBJECTS[trigger],
      react: COMPONENTS[trigger],
    })
    .catch(console.error);
}
