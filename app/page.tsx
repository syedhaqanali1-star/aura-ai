"use client";

import {
  Check,
  Copy,
  Moon,
  Palette,
  PanelLeftOpen,
  Sparkles,
  Sun,
  User,
  X,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
} from "react";

import ChatWindow from "@/components/ChatWindow";
import Header from "@/components/Header";
import LiveVoiceMode from "@/components/LiveVoiceMode";
import MessageInput from "@/components/MessageInput";
import SearchModal from "@/components/SearchModal";
import Sidebar from "@/components/Sidebar";
import Welcome from "@/components/Welcome";
import { useChat } from "@/context/ChatContext";
import { useProjects } from "@/context/ProjectContext";
import { useTheme } from "@/context/ThemeContext";

const SIDEBAR_STORAGE_KEY =
  "aura-sidebar-open";

type OpenPanel =
  | "settings"
  | "profile"
  | null;

export default function Home() {
  const {
    conversations,
    currentConversationId,
    currentMessages,
    isGenerating,
    createNewChat,
    selectConversation,
    sendMessage,
    stopGenerating,
  } = useChat();

  const { currentProject } =
    useProjects();

  const {
    theme,
    toggleTheme,
  } = useTheme();

  const [
    isSearchOpen,
    setIsSearchOpen,
  ] = useState(false);

  const [
    isSidebarOpen,
    setIsSidebarOpen,
  ] = useState(true);

  const [
    isSidebarReady,
    setIsSidebarReady,
  ] = useState(false);

  const [
    isLiveVoiceOpen,
    setIsLiveVoiceOpen,
  ] = useState(false);

  const [
    openPanel,
    setOpenPanel,
  ] = useState<OpenPanel>(null);

  const [
    shareStatus,
    setShareStatus,
  ] = useState<"idle" | "copied">(
    "idle"
  );

  const shareTimerRef =
    useRef<number | null>(null);

  const hasStartedChat =
    currentMessages.some(
      (message) =>
        message &&
        message.role === "user" &&
        typeof message.text ===
          "string"
    );

  useEffect(() => {
    const isDesktop =
      window.innerWidth >= 1024;

    if (!isDesktop) {
      setIsSidebarOpen(false);
      setIsSidebarReady(true);
      return;
    }

    const savedSidebarState =
      window.localStorage.getItem(
        SIDEBAR_STORAGE_KEY
      );

    setIsSidebarOpen(
      savedSidebarState === null
        ? true
        : savedSidebarState === "true"
    );

    setIsSidebarReady(true);
  }, []);

  useEffect(() => {
    if (!isSidebarReady) {
      return;
    }

    window.localStorage.setItem(
      SIDEBAR_STORAGE_KEY,
      String(isSidebarOpen)
    );
  }, [
    isSidebarOpen,
    isSidebarReady,
  ]);

  useEffect(() => {
    function handleKeyboardShortcut(
      event: globalThis.KeyboardEvent
    ) {
      const isSearchShortcut =
        (event.ctrlKey ||
          event.metaKey) &&
        event.key.toLowerCase() ===
          "k";

      const isSidebarShortcut =
        (event.ctrlKey ||
          event.metaKey) &&
        event.shiftKey &&
        event.key.toLowerCase() ===
          "s";

      if (isSidebarShortcut) {
        event.preventDefault();

        setIsSidebarOpen(
          (currentValue) =>
            !currentValue
        );

        return;
      }

      if (isSearchShortcut) {
        event.preventDefault();
        setIsSearchOpen(true);
        return;
      }

      if (event.key === "Escape") {
        if (isLiveVoiceOpen) {
          setIsLiveVoiceOpen(false);
          return;
        }

        setIsSearchOpen(false);
        setOpenPanel(null);
      }
    }

    document.addEventListener(
      "keydown",
      handleKeyboardShortcut
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyboardShortcut
      );
    };
  }, [isLiveVoiceOpen]);

  useEffect(() => {
    return () => {
      if (
        shareTimerRef.current !== null
      ) {
        window.clearTimeout(
          shareTimerRef.current
        );
      }
    };
  }, []);

  useEffect(() => {
    if (!isLiveVoiceOpen) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [isLiveVoiceOpen]);

  function closeMobileSidebar(): void {
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  }

  function handleNewChat(): void {
    stopGenerating();
    setIsLiveVoiceOpen(false);
    createNewChat();
    closeMobileSidebar();
  }

  function handleOpenSearch(): void {
    setIsSearchOpen(true);
    setOpenPanel(null);
    closeMobileSidebar();
  }

  function handleSelectConversation(
    conversationId: string
  ): void {
    stopGenerating();
    setIsLiveVoiceOpen(false);

    selectConversation(
      conversationId
    );

    closeMobileSidebar();
  }

  function handleOpenSettings(): void {
    setOpenPanel("settings");
    setIsSearchOpen(false);
    closeMobileSidebar();
  }

  function handleOpenProfile(): void {
    setOpenPanel("profile");
    setIsSearchOpen(false);
    closeMobileSidebar();
  }

  function handleOpenLiveVoice(): void {
    setIsSearchOpen(false);
    setOpenPanel(null);
    setIsSidebarOpen(false);
    setIsLiveVoiceOpen(true);
  }

  function handleCloseLiveVoice(): void {
    setIsLiveVoiceOpen(false);
  }

  async function handleShareConversation(): Promise<void> {
    const currentConversation =
      conversations.find(
        (conversation) =>
          conversation.id ===
          currentConversationId
      );

    if (!currentConversation) {
      return;
    }

    const conversationText =
      currentConversation.messages
        .map((message) => {
          const speaker =
            message.role === "user"
              ? "You"
              : "Aura";

          return `${speaker}:\n${message.text}`;
        })
        .join("\n\n");

    const shareText =
      `${currentConversation.title}\n\n${conversationText}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title:
            currentConversation.title,
          text: shareText,
        });

        return;
      }

      await navigator.clipboard.writeText(
        shareText
      );

      setShareStatus("copied");

      if (
        shareTimerRef.current !== null
      ) {
        window.clearTimeout(
          shareTimerRef.current
        );
      }

      shareTimerRef.current =
        window.setTimeout(() => {
          setShareStatus("idle");
          shareTimerRef.current =
            null;
        }, 2000);
    } catch {
      // The user may cancel sharing.
    }
  }

  function handleSendMessage(
    message: string,
    files: File[] = []
  ): void {
    let messageToSend = message;

    if (files.length > 0) {
      const fileList = files
        .map(
          (file) =>
            `• ${file.name}`
        )
        .join("\n");

      messageToSend = message
        ? `${message}\n\nAttached files:\n${fileList}`
        : `Attached files:\n${fileList}`;
    }

    const cleanedMessage =
      messageToSend.trim();

    if (!cleanedMessage) {
      return;
    }

    sendMessage(cleanedMessage);
  }

  function handleSuggestionClick(
    message: string
  ): void {
    handleSendMessage(message);
  }

  const searchableConversations =
    conversations.map(
      (conversation) => ({
        ...conversation,
        projectId:
          currentProject?.id,
        projectName:
          currentProject?.name,
      })
    );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[var(--aura-background)] text-[var(--aura-text)] transition-colors duration-200">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() =>
          setIsSidebarOpen(false)
        }
        onOpenSearch={
          handleOpenSearch
        }
        onOpenSettings={
          handleOpenSettings
        }
        onOpenProfile={
          handleOpenProfile
        }
        onNewChat={handleNewChat}
        onSelectConversation={
          handleSelectConversation
        }
      />

      {!isSidebarOpen && (
        <button
          type="button"
          onClick={() =>
            setIsSidebarOpen(true)
          }
          className="fixed left-3 top-2.5 z-40 hidden h-9 w-9 items-center justify-center rounded-lg text-[var(--aura-text-muted)] transition hover:bg-[var(--aura-surface-hover)] hover:text-[var(--aura-text)] lg:flex"
          aria-label="Open sidebar"
          title="Open sidebar (Ctrl+Shift+S)"
        >
          <PanelLeftOpen
            size={19}
            strokeWidth={1.8}
          />
        </button>
      )}

      <div className="flex min-w-0 flex-1 flex-col bg-[var(--aura-background)] transition-colors duration-200">
        <Header
          activeView="chat"
          shareStatus={shareStatus}
          onOpenMenu={() =>
            setIsSidebarOpen(true)
          }
          onOpenSearch={
            handleOpenSearch
          }
          onOpenSettings={
            handleOpenSettings
          }
          onOpenProfile={
            handleOpenProfile
          }
          onShare={
            handleShareConversation
          }
        />

        {!hasStartedChat ? (
          <main className="relative flex min-h-0 flex-1 items-center justify-center overflow-y-auto bg-[var(--aura-background)] px-4 transition-colors duration-200">
            <div className="w-full max-w-[760px] -translate-y-8 sm:-translate-y-10">
              <div className="[&>section]:h-auto [&>section]:min-h-0 [&>section]:px-0 [&>section]:pb-0">
                <Welcome
                  onSuggestionClick={
                    handleSuggestionClick
                  }
                />
              </div>

              <div className="mx-auto mt-6 w-full">
                <MessageInput
                  onSend={
                    handleSendMessage
                  }
                  onOpenLiveVoice={
                    handleOpenLiveVoice
                  }
                  disabled={
                    isGenerating
                  }
                />
              </div>
            </div>
          </main>
        ) : (
          <>
            <ChatWindow
              messages={
                currentMessages
              }
              isThinking={
                isGenerating
              }
              onSuggestionClick={
                handleSuggestionClick
              }
            />

            <div className="shrink-0 bg-[var(--aura-background)] transition-colors duration-200">
              <MessageInput
                onSend={
                  handleSendMessage
                }
                onOpenLiveVoice={
                  handleOpenLiveVoice
                }
                disabled={
                  isGenerating
                }
              />
            </div>
          </>
        )}
      </div>

      <SearchModal
        isOpen={isSearchOpen}
        conversations={
          searchableConversations
        }
        onClose={() =>
          setIsSearchOpen(false)
        }
        onSelectConversation={
          handleSelectConversation
        }
      />

      <LiveVoiceMode
        isOpen={isLiveVoiceOpen}
        onClose={
          handleCloseLiveVoice
        }
      />

      {openPanel && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-[var(--aura-overlay)] px-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setOpenPanel(null);
            }
          }}
        >
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[var(--aura-border)] bg-[var(--aura-surface)] shadow-[var(--aura-shadow-lg)] transition-colors duration-200">
            <div className="flex h-14 items-center justify-between border-b border-[var(--aura-border)] px-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--aura-accent-soft)] text-[var(--aura-accent)]">
                  {openPanel ===
                  "settings" ? (
                    <Palette
                      size={16}
                    />
                  ) : (
                    <User size={16} />
                  )}
                </div>

                <div>
                  <h2 className="text-sm font-semibold text-[var(--aura-text)]">
                    {openPanel ===
                    "settings"
                      ? "Settings"
                      : "Profile"}
                  </h2>

                  <p className="text-xs text-[var(--aura-text-muted)]">
                    {openPanel ===
                    "settings"
                      ? "Customize Aura"
                      : "Your Aura account"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setOpenPanel(null)
                }
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--aura-text-muted)] transition hover:bg-[var(--aura-surface-hover)] hover:text-[var(--aura-text)]"
                aria-label="Close panel"
              >
                <X size={16} />
              </button>
            </div>

            {openPanel ===
            "settings" ? (
              <div className="space-y-2 p-4">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="flex w-full items-center gap-3 rounded-xl border border-[var(--aura-border)] bg-[var(--aura-surface-secondary)] p-3 text-left transition hover:border-[var(--aura-border-hover)] hover:bg-[var(--aura-surface-hover)]"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--aura-accent-soft)] text-[var(--aura-accent)]">
                    {theme === "light" ? (
                      <Moon size={16} />
                    ) : (
                      <Sun size={16} />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--aura-text)]">
                      {theme === "light"
                        ? "Switch to Dark Mode"
                        : "Switch to Light Mode"}
                    </p>

                    <p className="mt-0.5 text-xs text-[var(--aura-text-muted)]">
                      {theme === "light"
                        ? "Light mode is currently active"
                        : "Dark mode is currently active"}
                    </p>
                  </div>

                  <Check
                    size={15}
                    className="text-[var(--aura-accent)]"
                  />
                </button>

                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-xl border border-[var(--aura-border)] bg-[var(--aura-surface-secondary)] p-3 text-left transition hover:border-[var(--aura-border-hover)] hover:bg-[var(--aura-surface-hover)]"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--aura-accent-soft)] text-[var(--aura-accent)]">
                    <Sparkles
                      size={16}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--aura-text)]">
                      Aura model
                    </p>

                    <p className="mt-0.5 text-xs text-[var(--aura-text-muted)]">
                      Model connection
                      will be added later
                    </p>
                  </div>
                </button>
              </div>
            ) : (
              <div className="p-4">
                <div className="flex items-center gap-3 rounded-xl border border-[var(--aura-border)] bg-[var(--aura-surface-secondary)] p-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--aura-primary)] text-sm font-semibold text-[var(--aura-primary-contrast)]">
                    S
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--aura-text)]">
                      Aura User
                    </p>

                    <p className="mt-0.5 truncate text-xs text-[var(--aura-text-muted)]">
                      Local account
                    </p>
                  </div>
                </div>

                <div className="mt-3 rounded-xl border border-[var(--aura-border)] bg-[var(--aura-surface-secondary)] p-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-[var(--aura-text-muted)]">
                    Conversations
                  </p>

                  <p className="mt-2 text-sm text-[var(--aura-text-secondary)]">
                    {
                      conversations.length
                    }{" "}
                    conversation
                    {conversations.length ===
                    1
                      ? ""
                      : "s"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {shareStatus === "copied" && (
        <div className="fixed bottom-5 left-1/2 z-[120] flex -translate-x-1/2 items-center gap-2 rounded-xl border border-[var(--aura-border)] bg-[var(--aura-surface)] px-4 py-2.5 text-sm text-[var(--aura-text-secondary)] shadow-[var(--aura-shadow-lg)]">
          <Copy size={14} />
          Conversation copied
        </div>
      )}
    </div>
  );
}