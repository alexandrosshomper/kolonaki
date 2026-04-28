"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { completeSegmentation } from "@/lib/kolonaki/actions";
import type { SegmentationQuestion } from "@/lib/kolonaki/types";
import { Button } from "@/components/ui/button";

interface Props {
  questions: SegmentationQuestion[];
}

export function SegmentationWizard({ questions }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const question = questions[step];
  const totalSteps = questions.length;
  const selected = answers[question.id];

  function handleSelect(value: string) {
    setAnswers((prev) => ({ ...prev, [question.id]: value }));
  }

  function handleBack() {
    if (step > 0) setStep((s) => s - 1);
  }

  function handleNext() {
    if (!selected) return;

    if (step < totalSteps - 1) {
      setStep((s) => s + 1);
      return;
    }

    // Final step — submit
    startTransition(async () => {
      await completeSegmentation(answers);
      router.push("/onboarding/checklist");
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Logo placeholder */}
      <div className="text-center">
        <span className="text-xl font-bold tracking-tight">kolonaki</span>
      </div>

      {/* Progress dots */}
      <div className="flex items-center gap-2 justify-center">
        {questions.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 w-6 rounded-full transition-colors duration-200 ${
              i <= step ? "bg-primary" : "bg-border"
            }`}
          />
        ))}
      </div>

      {/* Question */}
      <div className="flex flex-col gap-2">
        <p className="text-xs text-muted-foreground text-center">
          Step {step + 1} of {totalSteps}
        </p>
        <h1 className="text-xl font-bold text-center">{question.text}</h1>
        <p className="text-sm text-muted-foreground text-center">
          Takes 30 seconds.
        </p>
      </div>

      {/* Options */}
      <div className="flex flex-col gap-2">
        {question.options.map((opt) => {
          const isSelected = selected === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleSelect(opt.value)}
              className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors duration-150 ${
                isSelected
                  ? "border-primary bg-primary/5 font-medium"
                  : "border-border hover:border-primary/40 hover:bg-muted/50"
              }`}
            >
              <span className="mr-2">{isSelected ? "●" : "○"}</span>
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        {step > 0 ? (
          <Button variant="ghost" onClick={handleBack} disabled={isPending}>
            Back
          </Button>
        ) : (
          <div />
        )}
        <Button onClick={handleNext} disabled={!selected || isPending}>
          {step < totalSteps - 1 ? "Continue" : isPending ? "Saving…" : "Continue →"}
        </Button>
      </div>
    </div>
  );
}
