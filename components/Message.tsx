"use client";

import {
  Check,
  Copy,
  Download,
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

  const messageRole =
    message?.role ?? role ?? "aura";

  const messageText =
    message?.text ?? text ?? "";

  const imageDataUrl =
    message?.imageDataUrl;

  const isUser =
    messageRole === "user";

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(
          copyTimerRef.current
        );
      }
    };
  }, []);

  async function handleCopy(): Promise<void> {
    if (!messageText.trim()) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        messageText
      );

      setCopied(true);

      if (copyTimerRef.current !== null) {
        window.clearTimeout(
          copyTimerRef.current
        );
      }

      copyTimerRef.current =
        window.setTimeout(() => {
          setCopied(false);
          copyTimerRef.current = null;
        }, 1600);
    } catch {
      setCopied(false);
    }
  }

  if (
    !messageText.trim() &&
    !imageDataUrl
  ) {
    return null;
  }

  return (
    <article
      className={`group flex w-full ${
        isUser
          ? "justify-end"
          : "justify-start"
      }`}
    >
      {isUser ? (
        <div className="flex max-w-[88%] flex-col items-end sm:max-w-[75%]">
          <div className="rounded-[22px] border border-[var(--aura-border)] bg-[var(--aura-user-message)] px-4 py-2.5 text-[15px] leading-7 text-[var(--aura-user-message-text)]">
            <p className="whitespace-pre-wrap break-words">
              {messageText}
            </p>
          </div>

          <div className="mt-1 flex min-h-7 items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--aura-text-muted)] transition hover:bg-[var(--aura-surface-hover)] hover:text-[var(--aura-text)]"
              aria-label="Edit message"
            >
              <Pencil size={13} />
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--aura-text-muted)] transition hover:bg-[var(--aura-surface-hover)] hover:text-[var(--aura-text)]"
              aria-label="Copy message"
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
          {messageText.trim() && (
            <div className="aura-message-content text-[15px] leading-7 text-[var(--aura-text)]">
              <MarkdownMessage
                content={messageText}
              />
            </div>
          )}

          {imageDataUrl && (
            <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--aura-border)] bg-[var(--aura-surface)]">
              <img
                src={imageDataUrl}
                alt={
                  messageText ||
                  "Generated image"
                }
                className="block h-auto w-full object-cover"
              />

              <div className="flex items-center justify-end border-t border-[var(--aura-border)] p-2">
                <a
                  href={imageDataUrl}
                  download="aura-generated-image.png"
                  className="flex h-8 items-center gap-2 rounded-lg px-3 text-xs text-[var(--aura-text-muted)] transition hover:bg-[var(--aura-surface-hover)] hover:text-[var(--aura-text)]"
                >
                  <Download size={14} />
                  Download
                </a>
              </div>
            </div>
          )}

          <div className="mt-2 flex min-h-8 items-center gap-0.5">
            {messageText.trim() && (
              <button
                type="button"
                onClick={handleCopy}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--aura-text-muted)] transition hover:bg-[var(--aura-surface-hover)] hover:text-[var(--aura-text)]"
                aria-label="Copy response"
              >
                {copied ? (
                  <Check size={14} />
                ) : (
                  <Copy size={14} />
                )}
              </button>
            )}

            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--aura-text-muted)] transition hover:bg-[var(--aura-surface-hover)] hover:text-[var(--aura-text)]"
              aria-label="Regenerate response"
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