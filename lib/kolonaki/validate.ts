import { z } from "zod";
import type { KolonakiConfig } from "./types";

const SegmentationQuestionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  options: z
    .array(z.object({ label: z.string(), value: z.string() }))
    .min(1),
});

const ChecklistStepSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    description: z.union([z.string(), z.function()]),
    completedOnSignup: z.boolean().optional(),
    actionLabel: z.string().optional(),
    actionHref: z.string().optional(),
    optional: z.boolean().optional(),
  })
  .refine((s) => !s.actionLabel || !!s.actionHref, {
    message: "actionLabel requires actionHref",
    path: ["actionHref"],
  });

const EmailSequenceSchema = z.object({
  trigger: z.enum(["signup", "aha_moment_reached", "checklist_stalled"]),
  templateId: z.string().min(1),
  delayMinutes: z.number().nonnegative(),
});

const KolonakiConfigSchema = z
  .object({
    product: z.object({
      name: z.string().min(1),
      fromEmail: z
        .string()
        .email("product.fromEmail must be a valid email address"),
    }),
    segmentation: z.object({
      questions: z
        .array(SegmentationQuestionSchema)
        .min(1, "At least one segmentation question required"),
    }),
    workspace: z.object({
      enabled: z.boolean(),
      allowedDomainsOnly: z.boolean(),
    }),
    activation: z.object({
      ahaEventName: z.string().min(1),
      ahaEventLabel: z.string().optional(),
      steps: z.array(ChecklistStepSchema).min(1),
    }),
    emails: z.object({
      sequences: z.array(EmailSequenceSchema),
    }),
  })
  .superRefine((config, ctx) => {
    const stepIds = config.activation.steps.map((s) => s.id);
    const dupeSteps = stepIds.filter((id, i) => stepIds.indexOf(id) !== i);
    if (dupeSteps.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate step IDs: ${dupeSteps.join(", ")}`,
      });
    }

    const triggers = config.emails.sequences.map((s) => s.trigger);
    const dupeTriggers = triggers.filter((t, i) => triggers.indexOf(t) !== i);
    if (dupeTriggers.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate email triggers: ${dupeTriggers.join(", ")}`,
      });
    }
  });

export function validateKolonakiConfig(config: unknown): KolonakiConfig {
  return KolonakiConfigSchema.parse(config) as KolonakiConfig;
}
