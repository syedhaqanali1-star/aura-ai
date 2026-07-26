"use client";

import {
  ChevronUp,
  LogIn,
  LogOut,
  MessageSquare,
  MoreHorizontal,
  PanelLeftClose,
  PenLine,
  Search,
  Settings,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/context/ChatContext";

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
  onOpenSearch: () => void;
  onOpenSettings: () => void;
  onOpenProfile: () => void;
  onNewChat: () => void;
  onSelectConversation: (conversationId: string) => void;
};

export default function Sidebar({
  isOpen,
  onClose,
  onOpenSearch,
  onOpenSettings,
  onOpenProfile,
  onNewChat,
  onSelectConversation,
}: SidebarProps) {
  const {
    conversations,
    currentConversationId,
    deleteConversation,
  } = useChat();

  const {
    user,
    loading,
    signIn,
    signOut,
  } = useAuth();

  const [isAccountMenuOpen, setIsAccountMenuOpen] =
    useState(false);

  const [
    openConversationMenuId,
    setOpenConversationMenuId,
  ] = useState<string | null>(null);

  const [isSigningIn, setIsSigningIn] =
    useState(false);

  const [isSigningOut, setIsSigningOut] =
    useState(false);

  const accountMenuRef =
    useRef<HTMLDivElement | null>(null);

  const conversationMenuRef =
    useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as Node;

      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(target)
      ) {
        setIsAccountMenuOpen(false);
      }

      if (
        conversationMenuRef.current &&
        !conversationMenuRef.current.contains(target)
      ) {
        setOpenConversationMenuId(null);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsAccountMenuOpen(false);
        setOpenConversationMenuId(null);
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick,
    );

    document.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick,
      );

      document.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setIsAccountMenuOpen(false);
      setOpenConversationMenuId(null);
    }
  }, [isOpen]);

  async function handleSignIn(): Promise<void> {
    if (isSigningIn) return;

    try {
      setIsSigningIn(true);
      await signIn();
      setIsAccountMenuOpen(false);
    } catch (error) {
      console.error(
        "Google sign-in failed:",
        error,
      );
    } finally {
      setIsSigningIn(false);
    }
  }

  async function handleSignOut(): Promise<void> {
    if (isSigningOut) return;

    try {
      setIsSigningOut(true);
      await signOut();
      setIsAccountMenuOpen(false);
    } catch (error) {
      console.error(
        "Sign-out failed:",
        error,
      );
    } finally {
      setIsSigningOut(false);
    }
  }

  function handleOpenProfile(): void {
    setIsAccountMenuOpen(false);
    onOpenProfile();
  }

  function handleOpenSettings(): void {
    setIsAccountMenuOpen(false);
    onOpenSettings();
  }

  function handleDeleteConversation(
    conversationId: string,
  ): void {
    deleteConversation(conversationId);
    setOpenConversationMenuId(null);
  }

  const userInitial =
    user?.displayName
      ?.trim()
      .charAt(0)
      .toUpperCase() ||
    user?.email
      ?.trim()
      .charAt(0)
      .toUpperCase() ||
    "U";

  return (
    <>
      <button
        type="button"
        aria-label="Close sidebar"
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-[var(--aura-overlay)] transition-opacity duration-200 lg:hidden ${
          isOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        aria-label="Aura sidebar"
        className={`fixed inset-y-0 left-0 z-50 flex h-dvh w-[260px] shrink-0 flex-col border-r border-[var(--aura-border)] bg-[var(--aura-sidebar)] text-[var(--aura-text)] shadow-[8px_0_30px_rgba(0,0,0,0.08)] transition-all duration-200 ease-out lg:relative lg:z-auto lg:shadow-none ${
          isOpen
            ? "translate-x-0"
            : "-translate-x-full lg:hidden"
        }`}
      >
        <div className="flex h-14 shrink-0 items-center justify-between px-3">
          <button
            type="button"
            onClick={onNewChat}
            className="group flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 text-left transition hover:bg-[var(--aura-sidebar-hover)]"
            aria-label="Start a new chat"
            title="New chat"
          >
            <span className="truncate font-sans text-[18px] font-semibold tracking-[-0.02em] text-[var(--aura-text)] antialiased">
              Aura Ai
            </span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[var(--aura-text-muted)] transition hover:bg-[var(--aura-sidebar-hover)] hover:text-[var(--aura-text)]"
            aria-label="Close sidebar"
            title="Close sidebar"
          >
            <X
              size={19}
              strokeWidth={1.8}
              className="lg:hidden"
            />

            <PanelLeftClose
              size={19}
              strokeWidth={1.8}
              className="hidden lg:block"
            />
          </button>
        </div>

        <nav
          className="shrink-0 px-3 pb-2"
          aria-label="Primary"
        >
          <button
            type="button"
            onClick={onNewChat}
            className="flex h-10 w-full items-center gap-3 rounded-lg px-2.5 text-sm text-[var(--aura-text-secondary)] transition hover:bg-[var(--aura-sidebar-hover)] hover:text-[var(--aura-text)]"
          >
            <PenLine
              size={18}
              strokeWidth={1.8}
              className="shrink-0"
            />

            <span className="truncate">
              New chat
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenSearch}
            className="flex h-10 w-full items-center gap-3 rounded-lg px-2.5 text-sm text-[var(--aura-text-secondary)] transition hover:bg-[var(--aura-sidebar-hover)] hover:text-[var(--aura-text)]"
          >
            <Search
              size={18}
              strokeWidth={1.8}
              className="shrink-0"
            />

            <span className="truncate">
              Search chats
            </span>

            <span className="ml-auto rounded-md border border-[var(--aura-border)] px-1.5 py-0.5 text-[10px] text-[var(--aura-text-faint)]">
              Ctrl K
            </span>
          </button>
        </nav>

        <div className="min-h-0 flex-1">
          <div className="px-5 pb-2 pt-3">
            <p className="text-xs font-medium text-[var(--aura-text-muted)]">
              Chats
            </p>
          </div>

          <div className="h-full overflow-y-auto px-3 pb-4">
            <div className="space-y-0.5">
              {conversations.map(
                (conversation) => {
                  const isActive =
                    conversation.id ===
                    currentConversationId;

                  const isMenuOpen =
                    openConversationMenuId ===
                    conversation.id;

                  return (
                    <div
                      key={conversation.id}
                      ref={
                        isMenuOpen
                          ? conversationMenuRef
                          : undefined
                      }
                      className={`group relative flex min-w-0 items-center rounded-lg transition ${
                        isActive
                          ? "bg-[var(--aura-sidebar-active)]"
                          : "hover:bg-[var(--aura-sidebar-hover)]"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          onSelectConversation(
                            conversation.id,
                          )
                        }
                        className="flex h-10 min-w-0 flex-1 items-center gap-3 px-2.5 text-left text-sm text-[var(--aura-text-secondary)]"
                      >
                        <MessageSquare
                          size={16}
                          strokeWidth={1.8}
                          className="shrink-0 text-[var(--aura-text-muted)]"
                        />

                        <span className="truncate">
                          {conversation.title ||
                            "New chat"}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();

                          setOpenConversationMenuId(
                            (currentId) =>
                              currentId ===
                              conversation.id
                                ? null
                                : conversation.id,
                          );
                        }}
                        className={`mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[var(--aura-text-muted)] transition hover:bg-[var(--aura-surface-hover)] hover:text-[var(--aura-text)] ${
                          isMenuOpen
                            ? "bg-[var(--aura-surface-hover)] opacity-100"
                            : "opacity-0 group-hover:opacity-100 focus:opacity-100"
                        }`}
                        aria-label={`Open options for ${conversation.title}`}
                        aria-expanded={isMenuOpen}
                        title="Chat options"
                      >
                        <MoreHorizontal size={16} />
                      </button>

                      {isMenuOpen && (
                        <div className="absolute right-1 top-9 z-30 w-40 overflow-hidden rounded-xl border border-[var(--aura-border)] bg-[var(--aura-surface)] p-1.5 shadow-xl">
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteConversation(
                                conversation.id,
                              )
                            }
                            className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm text-[var(--aura-danger)] transition hover:bg-[color-mix(in_srgb,var(--aura-danger)_10%,transparent)]"
                          >
                            <Trash2 size={15} />

                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                },
              )}

              {conversations.length === 0 && (
                <div className="px-2.5 py-8">
                  <p className="text-sm leading-5 text-[var(--aura-text-muted)]">
                    Your conversations will
                    appear here.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div
          ref={accountMenuRef}
          className="relative shrink-0 p-3"
        >
          {isAccountMenuOpen && user && (
            <div className="absolute bottom-[76px] left-3 right-3 z-[70] overflow-hidden rounded-2xl border border-[var(--aura-border)] bg-[var(--aura-surface)] p-1.5 shadow-2xl">
              <div className="border-b border-[var(--aura-border)] px-3 py-3">
                <p className="truncate text-sm font-semibold text-[var(--aura-text)]">
                  {user.displayName ||
                    "Aura User"}
                </p>

                <p className="mt-0.5 truncate text-xs text-[var(--aura-text-muted)]">
                  {user.email ||
                    "Google account"}
                </p>
              </div>

              <div className="py-1">
                <button
                  type="button"
                  onClick={handleOpenProfile}
                  className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm text-[var(--aura-text-secondary)] transition hover:bg-[var(--aura-surface-hover)] hover:text-[var(--aura-text)]"
                >
                  <User size={17} />
                  <span>Profile</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenSettings}
                  className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm text-[var(--aura-text-secondary)] transition hover:bg-[var(--aura-surface-hover)] hover:text-[var(--aura-text)]"
                >
                  <Settings size={17} />
                  <span>Settings</span>
                </button>

                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm text-[var(--aura-danger)] transition hover:bg-[color-mix(in_srgb,var(--aura-danger)_10%,transparent)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <LogOut size={17} />

                  <span>
                    {isSigningOut
                      ? "Signing out..."
                      : "Sign out"}
                  </span>
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex h-12 w-full items-center gap-3 rounded-lg px-2.5">
              <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-[var(--aura-surface-hover)]" />

              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="h-3 w-24 animate-pulse rounded bg-[var(--aura-surface-hover)]" />
                <div className="h-2.5 w-32 animate-pulse rounded bg-[var(--aura-surface-secondary)]" />
              </div>
            </div>
          ) : user ? (
            <button
              type="button"
              onClick={() =>
                setIsAccountMenuOpen(
                  (currentValue) =>
                    !currentValue,
                )
              }
              className="flex h-12 w-full items-center gap-3 rounded-lg px-2.5 text-left transition hover:bg-[var(--aura-sidebar-hover)]"
              aria-expanded={isAccountMenuOpen}
              aria-label="Open account menu"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--aura-text)] text-[var(--aura-background)]">
                {user.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.photoURL}
                    alt={
                      user.displayName ||
                      "User profile"
                    }
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-sm font-semibold">
                    {userInitial}
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[var(--aura-text)]">
                  {user.displayName ||
                    "Aura User"}
                </p>

                <p className="truncate text-xs text-[var(--aura-text-muted)]">
                  {user.email ||
                    "Google account"}
                </p>
              </div>

              <ChevronUp
                size={16}
                className={`shrink-0 text-[var(--aura-text-muted)] transition-transform ${
                  isAccountMenuOpen
                    ? "rotate-180"
                    : ""
                }`}
              />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSignIn}
              disabled={isSigningIn}
              className="flex h-12 w-full items-center gap-3 rounded-lg px-2.5 text-left transition hover:bg-[var(--aura-sidebar-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--aura-text)] text-[var(--aura-background)]">
                <LogIn
                  size={16}
                  strokeWidth={1.9}
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[var(--aura-text)]">
                  {isSigningIn
                    ? "Signing in..."
                    : "Sign in"}
                </p>

                <p className="truncate text-xs text-[var(--aura-text-muted)]">
                  Continue with Google
                </p>
              </div>
            </button>
          )}
        </div>
      </aside>
    </>
  );
}