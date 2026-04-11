import type { KolonakiConfig } from "./lib/kolonaki/types";

export default {
  product: {
    name: "YourProduct",
    fromEmail: "onboarding@yourproduct.com", // replace with your Resend verified sender address
  },

  segmentation: {
    // Questions shown post-signup. Answers stored in user_metadata.segmentation
    // and sent to PostHog as identify() traits on flow completion.
    questions: [
      {
        id: "role",
        text: "What best describes you?",
        options: [
          { label: "Indie developer", value: "indie" },
          { label: "Startup founder", value: "founder" },
          { label: "Engineer at a company", value: "engineer" },
        ],
      },
      {
        id: "use_case",
        text: "What are you building?",
        options: [
          { label: "Internal tool", value: "internal_tool" },
          { label: "SaaS product", value: "saas" },
          { label: "Developer tool / API", value: "devtool" },
          { label: "Marketplace", value: "marketplace" },
        ],
      },
      {
        id: "team_size",
        text: "Are you building solo or with a team?",
        options: [
          { label: "Solo", value: "solo" },
          { label: "Small team (2–5)", value: "small" },
          { label: "Larger team", value: "large" },
        ],
      },
    ],
  },

  workspace: {
    // Set to false for solo-user products. Skips the invite step entirely.
    enabled: true,
    allowedDomainsOnly: false,
  },

  activation: {
    ahaEventName: "aha_moment_reached",
    ahaEventLabel: "You've completed the core setup.", // shown in the aha banner

    steps: [
      {
        id: "create_account",
        title: "Create your account",
        description: "Done! Welcome aboard.",
        completedOnSignup: true,
      },
      {
        id: "complete_setup",
        title: "Set up your first project",
        description: (seg) =>
          seg.use_case === "internal_tool"
            ? "Create your first internal tool to start tracking activation."
            : "Create a project to start tracking activation.",
        actionLabel: "Create project",
        actionHref: "/projects/new",
      },
      {
        id: "invite_teammate",
        title: "Invite a teammate",
        description: "Collaboration is where the aha moment hits.",
        actionLabel: "Invite",
        actionHref: "/onboarding/invite",
        optional: true,
      },
    ],
  },

  emails: {
    sequences: [
      {
        trigger: "signup",
        templateId: "resend_template_welcome",
        delayMinutes: 0,
      },
      {
        trigger: "aha_moment_reached",
        templateId: "resend_template_aha_congrats",
        delayMinutes: 0,
      },
      {
        trigger: "checklist_stalled",
        templateId: "resend_template_nudge",
        delayMinutes: 60 * 24,
      },
    ],
  },
} satisfies KolonakiConfig;
