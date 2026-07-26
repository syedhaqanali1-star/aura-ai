"use client";

import { Moon, Sun, X } from "lucide-react";

import { useTheme } from "@/context/ThemeContext";

type SettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function SettingsModal({
  isOpen,
  onClose,
}: SettingsModalProps) {
  const { theme, setTheme } = useTheme();

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close settings"
        onClick={onClose}
        className="absolute inset-0 bg-[var(--aura-overlay)] backdrop-blur-[2px]"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--aura-border)] bg-[var(--aura-surface)] shadow-[var(--aura-shadow-lg)]"
      >
        <div className="flex h-16 items-center justify-between border-b border-[var(--aura-border)] px-5">
          <div>
            <h2
              id="settings-title"
              className="text-lg font-semibold text-[var(--aura-text)]"
            >
              Settings
            </h2>

            <p className="text-xs text-[var(--aura-text-muted)]">
              Customize your Aura experience
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--aura-text-muted)] transition hover:bg-[var(--aura-surface-hover)] hover:text-[var(--aura-text)]"
          >
            <X size={19} />
          </button>
        </div>

        <div className="p-5">
          <section>
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-[var(--aura-text)]">
                Appearance
              </h3>

              <p className="mt-1 text-sm text-[var(--aura-text-muted)]">
                Choose how Aura looks on this device.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTheme("light")}
                aria-pressed={theme === "light"}
                className={`flex min-h-28 flex-col items-center justify-center gap-3 rounded-xl border p-4 transition ${
                  theme === "light"
                    ? "border-[var(--aura-accent)] bg-[var(--aura-accent-soft)] shadow-[0_0_0_1px_var(--aura-accent)]"
                    : "border-[var(--aura-border)] bg-[var(--aura-surface-secondary)] hover:border-[var(--aura-border-hover)] hover:bg-[var(--aura-surface-hover)]"
                }`}
              >
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-full ${
                    theme === "light"
                      ? "bg-[var(--aura-primary)] text-[var(--aura-primary-contrast)]"
                      : "bg-[var(--aura-surface)] text-[var(--aura-text-secondary)]"
                  }`}
                >
                  <Sun size={21} />
                </div>

                <div className="text-center">
                  <p className="text-sm font-semibold text-[var(--aura-text)]">
                    Light
                  </p>

                  <p className="mt-0.5 text-xs text-[var(--aura-text-muted)]">
                    White and deep blue
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTheme("dark")}
                aria-pressed={theme === "dark"}
                className={`flex min-h-28 flex-col items-center justify-center gap-3 rounded-xl border p-4 transition ${
                  theme === "dark"
                    ? "border-[var(--aura-accent)] bg-[var(--aura-accent-soft)] shadow-[0_0_0_1px_var(--aura-accent)]"
                    : "border-[var(--aura-border)] bg-[var(--aura-surface-secondary)] hover:border-[var(--aura-border-hover)] hover:bg-[var(--aura-surface-hover)]"
                }`}
              >
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-full ${
                    theme === "dark"
                      ? "bg-[var(--aura-primary)] text-[var(--aura-primary-contrast)]"
                      : "bg-[var(--aura-surface)] text-[var(--aura-text-secondary)]"
                  }`}
                >
                  <Moon size={21} />
                </div>

                <div className="text-center">
                  <p className="text-sm font-semibold text-[var(--aura-text)]">
                    Dark
                  </p>

                  <p className="mt-0.5 text-xs text-[var(--aura-text-muted)]">
                    Black and light blue
                  </p>
                </div>
              </button>
            </div>
          </section>
        </div>

        <div className="flex justify-end border-t border-[var(--aura-border)] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="aura-button aura-button-primary"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}