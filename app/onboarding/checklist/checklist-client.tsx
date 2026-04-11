"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import { trackAhaEvent } from "@/lib/kolonaki/actions";

interface StepData {
  id: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  optional: boolean;
  completedOnSignup: boolean;
  done: boolean;
}

interface Props {
  steps: StepData[];
  ahaReached: boolean;
  ahaEventLabel: string;
}

export function ChecklistClient({ steps: initialSteps, ahaReached: initialAha, ahaEventLabel }: Props) {
  const [steps, setSteps] = useState(initialSteps);
  const [ahaReached, setAhaReached] = useState(initialAha);
  const [isPending, startTransition] = useTransition();

  const completedCount = steps.filter((s) => s.done).length;
  const totalSteps = steps.length;

  // Find the current active step (first non-done, non-auto-completed)
  const currentIndex = steps.findIndex((s) => !s.done && !s.completedOnSignup);

  async function handleStepAction(stepId: string) {
    startTransition(async () => {
      const result = await trackAhaEvent(stepId);
      setSteps((prev) =>
        prev.map((s) => (s.id === stepId ? { ...s, done: true } : s))
      );
      if (result.aha) setAhaReached(true);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1 rounded-full bg-border overflow-hidden">
          <div
            className="h-1 rounded-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${(completedCount / totalSteps) * 100}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {completedCount} of {totalSteps}
        </span>
      </div>

      {/* Step cards */}
      <div className="flex flex-col gap-2">
        {steps.map((step, index) => {
          const isCurrent = index === currentIndex;
          const isLocked = !step.done && !isCurrent && index > currentIndex;

          return (
            <motion.div
              key={step.id}
              layout
              className={`rounded-lg border px-4 py-3 transition-colors duration-200 ${
                step.done
                  ? "border-border bg-muted/30 opacity-50"
                  : isCurrent
                    ? "border-primary bg-background"
                    : "border-border bg-muted/20 opacity-40"
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Status icon */}
                <div className="mt-0.5 shrink-0 text-sm">
                  <AnimatePresence mode="wait">
                    {step.done ? (
                      <motion.span
                        key="done"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 20 }}
                        className="text-primary"
                      >
                        ✓
                      </motion.span>
                    ) : isCurrent ? (
                      <span className="text-primary">→</span>
                    ) : (
                      <span className="text-muted-foreground">○</span>
                    )}
                  </AnimatePresence>
                </div>

                {/* Content */}
                <div className="flex flex-col gap-1 flex-1">
                  <p className="text-sm font-medium">{step.title}</p>
                  {!step.done && (
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  )}
                  {isCurrent && step.actionHref && step.actionLabel && !step.done && (
                    <button
                      type="button"
                      onClick={() => handleStepAction(step.id)}
                      disabled={isPending || isLocked}
                      className="mt-1 text-xs underline text-foreground text-left disabled:opacity-50"
                    >
                      {step.actionLabel} →
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Aha banner */}
      {ahaReached && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 rounded-lg border border-dashed border-border bg-muted/50 px-4 py-3 text-center"
        >
          <p className="text-sm font-medium">You reached your aha moment.</p>
          <p className="text-xs text-muted-foreground mt-1">{ahaEventLabel}</p>
          <a href="/dashboard" className="mt-2 inline-block text-xs underline">
            Go to dashboard →
          </a>
        </motion.div>
      )}
    </div>
  );
}
