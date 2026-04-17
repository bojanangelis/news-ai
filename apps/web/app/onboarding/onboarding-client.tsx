"use client";

import { useState, useEffect } from "react";
import { StepLanguage } from "@/components/onboarding/step-language";
import { StepCategories, type Category } from "@/components/onboarding/step-categories";
import { StepDone } from "@/components/onboarding/step-done";

interface Props {
  categories: Category[];
}

const TOTAL_STEPS = 3;

export function OnboardingClient({ categories }: Props) {
  const [step, setStep] = useState(0);
  const [language, setLanguage] = useState("mk");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Persist language to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("np_lang", language);
  }, [language]);

  function saveAndAdvanceToStep2() {
    localStorage.setItem("np_onboarding_categories", JSON.stringify(selectedCategories));
    setStep(2);
  }

  function toggleCategory(id: string) {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  }

  const progressPct = ((step + 1) / TOTAL_STEPS) * 100;
  const isDone = step === 2;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Progress bar */}
      <div className="h-1 w-full bg-neutral-100 dark:bg-neutral-800 shrink-0">
        <div
          className={`h-full transition-all duration-500 ${isDone ? "bg-green-500" : "bg-accent"}`}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="flex flex-col flex-1 px-4 py-8 w-full max-w-lg mx-auto">
        {/* Logo */}
        <a
          href="/"
          className="inline-flex items-center gap-1 text-lg font-bold tracking-tight mb-10 self-start"
        >
          <span className="text-accent">News</span>
          <span className="text-neutral-900 dark:text-neutral-100">Plus</span>
        </a>

        {step === 0 && (
          <StepLanguage
            selected={language}
            onSelect={setLanguage}
            onNext={() => setStep(1)}
          />
        )}
        {step === 1 && (
          <StepCategories
            categories={categories}
            selected={selectedCategories}
            onToggle={toggleCategory}
            onNext={saveAndAdvanceToStep2}
            onBack={() => setStep(0)}
          />
        )}
        {step === 2 && <StepDone />}
      </div>
    </div>
  );
}
