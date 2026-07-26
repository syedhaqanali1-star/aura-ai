"use client";

import { useEffect, useState } from "react";

type WelcomeProps = {
  onSuggestionClick?: (message: string) => void;
};

const greetings = [
  "How can I help you today?",
  "What can I help with?",
  "What are you working on?",
  "What would you like to do?",
  "What's on your mind?",
  "Where should we begin?",
  "What can we accomplish today?",
  "What are we creating today?",
];

export default function Welcome({
  onSuggestionClick,
}: WelcomeProps) {
  const [greeting, setGreeting] = useState(
    "How can I help you today?"
  );

  useEffect(() => {
    const randomGreeting =
      greetings[
        Math.floor(Math.random() * greetings.length)
      ];

    setGreeting(randomGreeting);
  }, []);

  return (
    <section className="flex min-h-0 flex-1 items-center justify-center px-5 pb-24 sm:px-8">
      <div className="w-full max-w-2xl text-center">
        <h1 className="text-[27px] font-semibold leading-tight tracking-[-0.025em] text-[var(--aura-text)] transition-colors sm:text-[30px]">
          {greeting}
        </h1>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() =>
              onSuggestionClick?.(
                "Help me write something."
              )
            }
            className="rounded-full border border-[var(--aura-border)] bg-[var(--aura-surface)] px-3.5 py-2 text-[13px] text-[var(--aura-text-muted)] transition-colors hover:bg-[var(--aura-surface-hover)] hover:text-[var(--aura-text)]"
          >
            Help me write
          </button>

          <button
            type="button"
            onClick={() =>
              onSuggestionClick?.(
                "Help me build or fix some code."
              )
            }
            className="rounded-full border border-[var(--aura-border)] bg-[var(--aura-surface)] px-3.5 py-2 text-[13px] text-[var(--aura-text-muted)] transition-colors hover:bg-[var(--aura-surface-hover)] hover:text-[var(--aura-text)]"
          >
            Help me code
          </button>

          <button
            type="button"
            onClick={() =>
              onSuggestionClick?.(
                "Teach me something new."
              )
            }
            className="rounded-full border border-[var(--aura-border)] bg-[var(--aura-surface)] px-3.5 py-2 text-[13px] text-[var(--aura-text-muted)] transition-colors hover:bg-[var(--aura-surface-hover)] hover:text-[var(--aura-text)]"
          >
            Teach me
          </button>

          <button
            type="button"
            onClick={() =>
              onSuggestionClick?.(
                "Help me brainstorm some ideas."
              )
            }
            className="rounded-full border border-[var(--aura-border)] bg-[var(--aura-surface)] px-3.5 py-2 text-[13px] text-[var(--aura-text-muted)] transition-colors hover:bg-[var(--aura-surface-hover)] hover:text-[var(--aura-text)]"
          >
            Brainstorm ideas
          </button>
        </div>
      </div>
    </section>
  );
}