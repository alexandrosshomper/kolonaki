"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { posthog } from "@/lib/posthog/server";
import { sendKolonakiEmail } from "@/lib/kolonaki/email";
import config from "@/kolonaki.config";
import type { UserActivationMeta } from "@/lib/kolonaki/types";

/**
 * Called when the user submits the final segmentation question.
 * Stores answers in user_metadata.segmentation and fires PostHog identify().
 * Seeds completedOnSignup steps in onboarding_steps here (not at signup) to keep auth clean.
 *
 * @param answers - Map of question.id → selected option.value
 */
export async function completeSegmentation(
  answers: Record<string, string>,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const now = new Date().toISOString();

  // Read existing steps to avoid overwriting progress on re-entry (back-button, concurrent tab).
  const existingSteps: Record<string, boolean> =
    user.user_metadata?.onboarding_steps ?? {};

  const seededSteps = Object.fromEntries(
    config.activation.steps
      .filter((s) => s.completedOnSignup)
      .map((s) => [s.id, true]),
  );

  // Full object write — Supabase updateUser does a shallow merge on top-level data keys,
  // so we must write the complete merged onboarding_steps object to avoid partial overwrites.
  await supabase.auth.updateUser({
    data: {
      segmentation: answers,
      segmentation_completed_at: now,
      onboarding_steps: { ...existingSteps, ...seededSteps },
    },
  });

  // posthog.identify() is void — do NOT call .catch() on it.
  posthog.identify({
    distinctId: user.id,
    properties: answers,
  });
}

/**
 * Call when a user completes a checklist step.
 * Fires the aha event and sends the aha email when all required steps are done.
 * Idempotent: completing the same step twice is safe. The aha event fires exactly once.
 *
 * @param stepId - The ChecklistStep.id that was just completed
 * @returns { aha: boolean } — true if this call triggered the aha moment
 */
export async function trackAhaEvent(stepId: string): Promise<{ aha: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const meta: UserActivationMeta = {
    segmentation: user.user_metadata?.segmentation ?? null,
    onboarding_steps: user.user_metadata?.onboarding_steps ?? {},
    segmentation_completed_at: user.user_metadata?.segmentation_completed_at,
    aha_reached_at: user.user_metadata?.aha_reached_at,
    nudge_sent_at: user.user_metadata?.nudge_sent_at,
  };

  // Idempotent: already done, skip write
  if (meta.onboarding_steps[stepId]) return { aha: false };

  meta.onboarding_steps[stepId] = true;

  // Required steps: non-optional, not auto-completed on signup
  const requiredSteps = config.activation.steps.filter(
    (s) => !s.optional && !s.completedOnSignup,
  );
  const allDone = requiredSteps.every((s) => meta.onboarding_steps[s.id]);

  let aha = false;
  if (allDone && !meta.aha_reached_at) {
    meta.aha_reached_at = new Date().toISOString();
    aha = true;

    // posthog.capture() is void — do NOT call .catch() on it.
    posthog.capture({
      distinctId: user.id,
      event: config.activation.ahaEventName,
      properties: { segmentation: meta.segmentation },
    });

    if (user.email) {
      sendKolonakiEmail("aha_moment_reached", user.email);
    }
  }

  await supabase.auth.updateUser({ data: meta });

  return { aha };
}

/**
 * Validates an invite token and marks the invitation as accepted.
 * Uses the service role client to bypass RLS for the token lookup.
 *
 * @param token - The invitation token from URL or cookie
 * @returns { inviterEmail: string } on success
 * @throws if token is invalid, expired, or already accepted
 */
export async function acceptInvitation(
  token: string,
): Promise<{ inviterEmail: string }> {
  const adminSupabase = createAdminClient();

  const { data: invitation, error } = await adminSupabase
    .from("invitations")
    .select("id, inviter_id, email, accepted_at, expires_at")
    .eq("token", token)
    .single();

  if (error || !invitation) throw new Error("Invalid invitation");
  if (invitation.accepted_at) throw new Error("Invitation already accepted");
  if (new Date(invitation.expires_at) < new Date())
    throw new Error("Invitation expired");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error: updateError } = await adminSupabase
    .from("invitations")
    .update({ accepted_by: user.id, accepted_at: new Date().toISOString() })
    .eq("id", invitation.id);

  if (updateError) throw new Error("Failed to accept invitation");

  const { data: inviter } = await adminSupabase.auth.admin.getUserById(
    invitation.inviter_id,
  );

  return { inviterEmail: inviter.user?.email ?? "" };
}

/**
 * Sends an invitation email to the given address.
 * Creates a record in the invitations table and sends the link via Resend.
 *
 * @param email - The invitee's email address
 */
export async function sendInvitation(email: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const adminSupabase = createAdminClient();
  const { data: invitation, error } = await adminSupabase
    .from("invitations")
    .insert({ inviter_id: user.id, email })
    .select("token")
    .single();

  if (error || !invitation) throw new Error("Failed to create invitation");

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const inviteUrl = `${baseUrl}/invite/accept?token=${invitation.token}`;

  const { resend } = await import("@/lib/resend/server");
  void resend.emails
    .send({
      from: config.product.fromEmail,
      to: email,
      subject: `You've been invited to ${config.product.name}`,
      html: `<p>You've been invited to join ${config.product.name}. <a href="${inviteUrl}">Accept your invitation</a></p>`,
    })
    .catch(console.error);
}
