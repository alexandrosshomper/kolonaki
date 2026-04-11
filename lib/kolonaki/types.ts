export interface SegmentationQuestion {
  id: string;
  text: string;
  options: { label: string; value: string }[];
}

export interface ChecklistStep {
  id: string;
  title: string;
  // Static string or a function personalized by segmentation answers.
  // Resolved in the checklist server component:
  //   typeof description === "function" ? description(seg) : description
  // seg defaults to {} if segmentation is null (e.g. user skipped or was invited).
  description: string | ((seg: Record<string, string>) => string);
  completedOnSignup?: boolean;
  actionLabel?: string;
  actionHref?: string;
  optional?: boolean;
}

export interface EmailSequence {
  trigger: "signup" | "aha_moment_reached" | "checklist_stalled";
  templateId: string; // developer label only — React Email components are used, not Resend templates
  delayMinutes: number;
}

export interface KolonakiConfig {
  product: { name: string; fromEmail: string };
  segmentation: { questions: SegmentationQuestion[] };
  workspace: { enabled: boolean; allowedDomainsOnly: boolean };
  activation: {
    ahaEventName: string;
    ahaEventLabel?: string; // shown in the aha banner; defaults to "You've seen the value."
    steps: ChecklistStep[];
  };
  emails: { sequences: EmailSequence[] };
}

// Shape stored in Supabase user_metadata.
// Supabase updateUser({ data }) does a shallow merge on the top-level keys.
// Always write the full meta object in a single updateUser call to avoid partial overwrites.
export interface UserActivationMeta {
  segmentation: Record<string, string> | null;
  onboarding_steps: Record<string, boolean>;
  segmentation_completed_at?: string;
  aha_reached_at?: string;
  nudge_sent_at?: string;
}
