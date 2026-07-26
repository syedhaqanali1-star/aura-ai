"use client";

import { LoaderCircle } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

import Message from "@/components/Message";
import Welcome from "@/components/Welcome";
import type { ChatMessage } from "@/types/chat";

type ChatWindowProps = {
  messages: ChatMessage[];
  isThinking?: boolean;
  onSuggestionClick?: (message: string) => void;
};

export default function ChatWindow({
  messages,
  isThinking = false,
  onSuggestionClick,
}: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const validMessages = useMemo(
    () =>
      messages.filter(
        (message): message is ChatMessage =>
          Boolean(
            message &&
              message.id &&
              message.role &&
              typeof message.text === "string"
          )
      ),
    [messages]
  );

  const hasUserMessage = validMessages.some(
    (message) => message.role === "user"
  );

  useEffect(() => {
    if (!hasUserMessage) {
      return;
    }

    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [validMessages, isThinking, hasUserMessage]);

  return (
    <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--aura-background)] text-[var(--aura-text)] transition-colors duration-200">
      {!hasUserMessage ? (
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
          <Welcome
            onSuggestionClick={onSuggestionClick}
          />
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-[768px] flex-col px-4 pb-32 pt-8 sm:px-6 md:pt-10">
            <div className="flex flex-col gap-8">
              {validMessages.map((message) => (
                <Message
                  key={message.id}
                  message={message}
                />
              ))}

              {isThinking && (
                <div className="flex w-full items-start">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm text-[var(--aura-text-muted)]">
                      <LoaderCircle
                        size={16}
                        className="animate-spin"
                      />

                      <span>Aura is thinking</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div
              ref={bottomRef}
              className="h-8 shrink-0"
              aria-hidden="true"
            />
          </div>
        </div>
      )}
    </main>
  );
}