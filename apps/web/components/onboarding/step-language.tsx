"use client";

interface Props {
  selected: string;
  onSelect: (lang: string) => void;
  onNext: () => void;
}

const LANGUAGES = [
  { code: "mk", flag: "🇲🇰", label: "Македонски", sublabel: "Macedonian" },
  { code: "en", flag: "🇬🇧", label: "English", sublabel: "English" },
  // TODO: add { code: "sq", flag: "🇦🇱", label: "Shqip", sublabel: "Albanian" } when ready
];

export function StepLanguage({ selected, onSelect, onNext }: Props) {
  return (
    <div className="flex flex-col flex-1">
      <h2 className="text-2xl font-bold tracking-tight mb-2">Welcome! Pick your language.</h2>
      <p className="text-sm text-neutral-500 mb-8">You can change this anytime in settings.</p>

      <div className="flex flex-col gap-3 flex-1">
        {LANGUAGES.map((lang) => {
          const isSelected = selected === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => onSelect(lang.code)}
              className={`flex items-center gap-4 rounded-2xl border-2 px-5 py-4 text-left transition-all ${
                isSelected
                  ? "border-accent bg-accent/5"
                  : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600"
              }`}
            >
              <span className="text-3xl">{lang.flag}</span>
              <div className="flex-1">
                <p className="font-semibold text-neutral-900 dark:text-neutral-100">{lang.label}</p>
                <p className="text-sm text-neutral-500">{lang.sublabel}</p>
              </div>
              {isSelected && (
                <div className="h-5 w-5 rounded-full bg-accent flex items-center justify-center shrink-0">
                  <svg
                    className="h-3 w-3 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onNext}
        className="mt-8 w-full h-11 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors"
      >
        Continue →
      </button>
    </div>
  );
}
