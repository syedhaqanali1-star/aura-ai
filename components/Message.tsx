"use client";

import {
  Check,
  Copy,
  Pencil,
  RotateCcw,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import MarkdownMessage from "@/components/MarkdownMessage";
import type { ChatMessage } from "@/types/chat";

type MessageProps = {
  message?: ChatMessage;
  role?: "user" | "aura";
  text?: string;
};

export default function Message({
  message,
  role,
  text,
}: MessageProps) {
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<number | null>(null);

  const messageRole = message?.role ?? role ?? "aura";
  const messageText = message?.text ?? text ?? "";
  const isUser = messageRole === "user";

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  async function handleCopy(): Promise<void> {
    if (!messageText.trim()) {
      return;
    }

    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);

      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }

      copyTimerRef.current = window.setTimeout(() => {
        setCopied(false);
        copyTimerRef.current = null;
      }, 1600);
    } catch {
      setCopied(false);
    }
  }

  if (!messageText.trim()) {
    return null;
  }

  return (
    <article
      className={`group flex w-full ${
        isUser ? "justify-end" : "justify-start"
      }`}
    >
      {isUser ? (
        <div className="flex max-w-[88%] flex-col items-end sm:max-w-[75%]">
          <div className="rounded-[22px] border border-[var(--aura-border)] bg-[var(--aura-user-message)] px-4 py-2.5 text-[15px] leading-7 text-[var(--aura-user-message-text)] shadow-sm transition-colors duration-200">
            <p className="whitespace-pre-wrap break-words">
              {messageText}
            </p>
          </div>

          <div className="mt-1 flex min-h-7 items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--aura-text-muted)] transition hover:bg-[var(--aura-surface-hover)] hover:text-[var(--aura-text)]"
              aria-label="Edit message"
              title="Edit message"
            >
              <Pencil size={13} />
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--aura-text-muted)] transition hover:bg-[var(--aura-surface-hover)] hover:text-[var(--aura-text)]"
              aria-label={
                copied ? "Message copied" : "Copy message"
              }
              title={copied ? "Copied" : "Copy message"}
            >
              {copied ? (
                <Check size={13} />
              ) : (
                <Copy size={13} />
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full min-w-0">
          <div className="min-w-0">
            <div className="aura-message-content text-[15px] leading-7 text-[var(--aura-text)] transition-colors duration-200">
              <MarkdownMessage content={messageText} />
            </div>
          </div>

          <div className="mt-2 flex min-h-8 items-center gap-0.5">
            <button
              type="button"
              onClick={handleCopy}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--aura-text-muted)] transition hover:bg-[var(--aura-surface-hover)] hover:text-[var(--aura-text)]"
              aria-label={
                copied ? "Response copied" : "Copy response"
              }
              title={copied ? "Copied" : "Copy response"}
            >
              {copied ? (
                <Check size={14} />
              ) : (
                <Copy size={14} />
              )}
            </button>

            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--aura-text-muted)] transition hover:bg-[var(--aura-surface-hover)] hover:text-[var(--aura-text)]"
              aria-label="Regenerate response"
              title="Regenerate response"
            >
              <RotateCcw size={14} />
            </button>

            {copied && (
              <span className="ml-1 text-xs text-[var(--aura-text-muted)]">
                Copied
              </span>
            )}
          </div>
        </div>
      )}
    </article>
  );
}