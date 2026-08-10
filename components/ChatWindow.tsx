"use client";

import { LoaderCircle } from "lucide-react";
import {
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";

import Message from "@/components/Message";
import Welcome from "@/components/Welcome";
import type { ChatMessage } from "@/types/chat";

type ChatWindowProps = {
  messages: ChatMessage[];
  isThinking?: boolean;
  onSuggestionClick?: (
    message: string
  ) => void;
};

export default function ChatWindow({
  messages,
  isThinking = false,
  onSuggestionClick,
}: ChatWindowProps) {
  const scrollRef =
    useRef<HTMLDivElement | null>(null);

  const bottomRef =
    useRef<HTMLDivElement | null>(null);

  const validMessages = useMemo(
    () =>
      messages.filter(
        (
          message
        ): message is ChatMessage =>
          Boolean(
            message &&
              message.id &&
              message.role &&
              typeof message.text ===
                "string"
          )
      ),
    [messages]
  );

  const hasUserMessage =
    validMessages.some(
      (message) =>
        message.role === "user"
    );

  useLayoutEffect(() => {
    if (!hasUserMessage) {
      return;
    }

    const scrollContainer =
      scrollRef.current;

    if (!scrollContainer) {
      return;
    }

    const scrollToBottom = () => {
      scrollContainer.scrollTop =
        scrollContainer.scrollHeight;
    };

    scrollToBottom();

    const frame =
      requestAnimationFrame(
        scrollToBottom
      );

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [
    validMessages,
    isThinking,
    hasUserMessage,
  ]);

  return (
    <main className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-[var(--aura-background)] text-[var(--aura-text)] transition-colors duration-200">
      {!hasUserMessage ? (
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-4 py-6 sm:px-6">
          <Welcome
            onSuggestionClick={
              onSuggestionClick
            }
          />
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        >
          <div className="mx-auto flex w-full max-w-[768px] flex-col px-4 pb-8 pt-6 sm:px-6 sm:pb-10 sm:pt-8 md:pt-10">
            <div className="flex flex-col gap-6 sm:gap-8">
              {validMessages.map(
                (message) => (
                  <Message
                    key={message.id}
                    message={message}
                  />
                )
              )}

              {isThinking && (
                <div className="flex w-full items-start">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm text-[var(--aura-text-muted)]">
                      <LoaderCircle
                        size={16}
                        className="shrink-0 animate-spin"
                      />

                      <span>
                        Aura is thinking
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div
              ref={bottomRef}
              className="h-6 shrink-0"
              aria-hidden="true"
            />
          </div>
        </div>
      )}
    </main>
  );
}