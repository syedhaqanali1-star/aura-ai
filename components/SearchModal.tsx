"use client";

import {
  ArrowRight,
  FileText,
  Folder,
  MessageSquare,
  Search,
  X,
} from "lucide-react";
import {
  KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { ChatMessage } from "@/types/chat";

type SearchConversation = {
  id: string;
  title: string;
  projectId?: string;
  projectName?: string;
  messages?: ChatMessage[];
};

type SearchModalProps = {
  isOpen: boolean;
  conversations: SearchConversation[];
  onClose: () => void;
  onSelectConversation: (conversationId: string) => void;
};

type SearchResult = {
  conversationId: string;
  conversationTitle: string;
  projectName?: string;
  matchedText: string;
  resultType: "title" | "message";
};

function normalizeText(value: string) {
  return value.toLowerCase().trim();
}

function createPreview(text: string, query: string) {
  const cleanText = text.replace(/\s+/g, " ").trim();

  if (!query || cleanText.length <= 120) {
    return cleanText;
  }

  const normalizedText = cleanText.toLowerCase();
  const normalizedQuery = query.toLowerCase();
  const matchIndex = normalizedText.indexOf(normalizedQuery);

  if (matchIndex === -1) {
    return `${cleanText.slice(0, 117)}...`;
  }

  const previewStart = Math.max(0, matchIndex - 45);
  const previewEnd = Math.min(
    cleanText.length,
    matchIndex + normalizedQuery.length + 65
  );

  const preview = cleanText.slice(previewStart, previewEnd);

  return `${previewStart > 0 ? "..." : ""}${preview}${
    previewEnd < cleanText.length ? "..." : ""
  }`;
}

function HighlightedText({
  text,
  query,
}: {
  text: string;
  query: string;
}) {
  if (!query.trim()) {
    return <>{text}</>;
  }

  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escapedQuery})`, "gi"));

  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark
            key={`${part}-${index}`}
            className="rounded bg-violet-400/20 px-0.5 text-violet-100"
          >
            {part}
          </mark>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        )
      )}
    </>
  );
}

export default function SearchModal({
  isOpen,
  conversations,
  onClose,
  onSelectConversation,
}: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement | null>(null);

  const results = useMemo<SearchResult[]>(() => {
    const normalizedQuery = normalizeText(query);

    if (!normalizedQuery) {
      return conversations.slice(0, 8).map((conversation) => ({
        conversationId: conversation.id,
        conversationTitle: conversation.title || "Untitled conversation",
        projectName: conversation.projectName,
        matchedText: conversation.title || "Untitled conversation",
        resultType: "title",
      }));
    }

    const matchingResults: SearchResult[] = [];

    conversations.forEach((conversation) => {
      const conversationTitle =
        conversation.title || "Untitled conversation";

      if (
        normalizeText(conversationTitle).includes(normalizedQuery) ||
        normalizeText(conversation.projectName ?? "").includes(
          normalizedQuery
        )
      ) {
        matchingResults.push({
          conversationId: conversation.id,
          conversationTitle,
          projectName: conversation.projectName,
          matchedText: conversationTitle,
          resultType: "title",
        });
      }

      conversation.messages?.forEach((message) => {
        if (!normalizeText(message.text).includes(normalizedQuery)) {
          return;
        }

        matchingResults.push({
          conversationId: conversation.id,
          conversationTitle,
          projectName: conversation.projectName,
          matchedText: createPreview(message.text, query),
          resultType: "message",
        });
      });
    });

    return matchingResults.slice(0, 30);
  }, [conversations, query]);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setSelectedIndex(0);
      return;
    }

    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    function handleGlobalKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleGlobalKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [isOpen, onClose]);

  function openConversation(conversationId: string) {
    onSelectConversation(conversationId);
    onClose();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();

      setSelectedIndex((currentIndex) =>
        Math.min(currentIndex + 1, results.length - 1)
      );
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      setSelectedIndex((currentIndex) =>
        Math.max(currentIndex - 1, 0)
      );
    }

    if (event.key === "Enter" && results[selectedIndex]) {
      event.preventDefault();
      openConversation(results[selectedIndex].conversationId);
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 px-3 pt-[10vh] backdrop-blur-sm sm:px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Search conversations"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111117]/98 shadow-[0_28px_90px_rgba(0,0,0,0.65)]">
        <div className="flex h-14 items-center gap-3 border-b border-white/[0.07] px-4">
          <Search
            size={17}
            className="shrink-0 text-neutral-500"
          />

          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search chats and messages..."
            className="min-w-0 flex-1 bg-transparent text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none"
            aria-label="Search chats and messages"
          />

          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-600 transition hover:bg-white/[0.05] hover:text-neutral-300"
              aria-label="Clear search"
              title="Clear search"
            >
              <X size={15} />
            </button>
          )}

          <span className="hidden rounded-md border border-white/[0.06] bg-white/[0.035] px-2 py-1 text-[10px] text-neutral-600 sm:block">
            Esc
          </span>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {results.length === 0 ? (
            <div className="flex min-h-52 flex-col items-center justify-center px-6 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03] text-neutral-500">
                <Search size={18} />
              </div>

              <p className="mt-3 text-sm font-medium text-neutral-300">
                No results found
              </p>

              <p className="mt-1 text-xs text-neutral-600">
                Try searching for another conversation title or message.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {results.map((result, index) => {
                const isSelected = index === selectedIndex;

                return (
                  <button
                    key={`${result.conversationId}-${result.resultType}-${index}`}
                    type="button"
                    onClick={() =>
                      openConversation(result.conversationId)
                    }
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`group flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition ${
                      isSelected
                        ? "bg-white/[0.07]"
                        : "hover:bg-white/[0.045]"
                    }`}
                  >
                    <div
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                        result.resultType === "message"
                          ? "border-violet-400/15 bg-violet-500/10 text-violet-200"
                          : "border-white/[0.06] bg-white/[0.035] text-neutral-400"
                      }`}
                    >
                      {result.resultType === "message" ? (
                        <MessageSquare size={14} />
                      ) : result.projectName ? (
                        <Folder size={14} />
                      ) : (
                        <FileText size={14} />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-[13px] font-medium text-neutral-200">
                          <HighlightedText
                            text={result.conversationTitle}
                            query={query}
                          />
                        </p>

                        {result.projectName && (
                          <span className="hidden shrink-0 rounded-md bg-white/[0.04] px-1.5 py-0.5 text-[9px] text-neutral-600 sm:block">
                            {result.projectName}
                          </span>
                        )}
                      </div>

                      <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-neutral-500">
                        <HighlightedText
                          text={result.matchedText}
                          query={query}
                        />
                      </p>
                    </div>

                    <ArrowRight
                      size={14}
                      className={`mt-2 shrink-0 transition ${
                        isSelected
                          ? "translate-x-0 text-violet-300"
                          : "-translate-x-1 text-neutral-700 group-hover:translate-x-0 group-hover:text-neutral-400"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-white/[0.07] px-4 py-2.5 text-[10px] text-neutral-700">
          <span>
            {results.length} result{results.length === 1 ? "" : "s"}
          </span>

          <div className="hidden items-center gap-3 sm:flex">
            <span>↑↓ Navigate</span>
            <span>Enter Open</span>
            <span>Esc Close</span>
          </div>
        </div>
      </div>
    </div>
  );
}