"use client";

import {
  Check,
  Menu,
  Share2,
} from "lucide-react";

type HeaderProps = {
  activeView?: "dashboard" | "chat";
  shareStatus?: "idle" | "copied";
  onHome?: () => void;
  onOpenMenu?: () => void;
  onOpenSearch?: () => void;
  onOpenSettings?: () => void;
  onOpenProfile?: () => void;
  onShare?: () => void;
};

export default function Header({
  activeView = "chat",
  shareStatus = "idle",
  onOpenMenu,
  onShare,
}: HeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--aura-border)] bg-[var(--aura-background)] px-4 text-[var(--aura-text)] transition-colors">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenMenu}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--aura-text-muted)] transition hover:bg-[var(--aura-surface-hover)] hover:text-[var(--aura-text)] lg:hidden"
          aria-label="Open sidebar"
        >
          <Menu size={19} />
        </button>
      </div>

      <div className="flex items-center gap-2">
        {activeView === "chat" && (
          <button
            type="button"
            onClick={onShare}
            className="flex h-9 items-center gap-2 rounded-lg px-3 text-sm text-[var(--aura-text-muted)] transition hover:bg-[var(--aura-surface-hover)] hover:text-[var(--aura-text)]"
          >
            {shareStatus === "copied" ? (
              <Check
                size={16}
                className="text-[var(--aura-success)]"
              />
            ) : (
              <Share2 size={16} />
            )}

            <span className="hidden sm:block">
              {shareStatus === "copied"
                ? "Copied"
                : "Share"}
            </span>
          </button>
        )}
      </div>
    </header>
  );
}