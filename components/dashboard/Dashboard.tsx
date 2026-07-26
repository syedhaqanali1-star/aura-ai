"use client";

import {
  ArrowRight,
  Bot,
  Code2,
  FileSearch,
  FileText,
  Globe2,
  ImageIcon,
  MessageSquarePlus,
  Mic2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import ProjectDashboard from "@/components/projects/ProjectDashboard";

type DashboardProps = {
  onNewChat: () => void;
  onOpenProject?: (projectId: string) => void;
};

type QuickAction = {
  title: string;
  description: string;
  icon: typeof MessageSquarePlus;
  available: boolean;
  onClick?: () => void;
};

export default function Dashboard({
  onNewChat,
  onOpenProject,
}: DashboardProps) {
  const quickActions: QuickAction[] = [
    {
      title: "New Chat",
      description: "Start a fresh conversation with Aura.",
      icon: MessageSquarePlus,
      available: true,
      onClick: onNewChat,
    },
    {
      title: "Analyze Document",
      description: "Upload a document and ask questions.",
      icon: FileSearch,
      available: false,
    },
    {
      title: "Code Assistant",
      description: "Write, explain, and debug code.",
      icon: Code2,
      available: false,
    },
    {
      title: "Research",
      description: "Explore topics with organized research.",
      icon: Globe2,
      available: false,
    },
    {
      title: "Image Workspace",
      description: "Create and organize visual content.",
      icon: ImageIcon,
      available: false,
    },
    {
      title: "Voice Mode",
      description: "Speak naturally with Aura.",
      icon: Mic2,
      available: false,
    },
  ];

  return (
    <main className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-violet-500/12 via-white/[0.03] to-blue-500/8 px-5 py-6 shadow-xl shadow-black/20 sm:px-6 lg:px-8">
          <div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-violet-500/12 blur-[85px]" />

          <div className="pointer-events-none absolute -bottom-24 right-0 h-64 w-64 rounded-full bg-blue-500/8 blur-[90px]" />

          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="flex w-fit items-center gap-1.5 rounded-full border border-violet-300/15 bg-violet-500/10 px-2.5 py-1 text-[11px] font-medium text-violet-200">
                <Sparkles size={12} />
                Aura Workspace
              </div>

              <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Welcome back.
              </h1>

              <p className="mt-2.5 max-w-xl text-sm leading-6 text-white/50">
                Organize projects, continue conversations,
                upload files, save notes, and manage your AI
                workspace.
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={onNewChat}
                  className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black shadow-lg shadow-white/10 transition hover:bg-white/90 active:scale-[0.98]"
                >
                  <MessageSquarePlus size={16} />
                  New Chat
                </button>

                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-xs text-white/55">
                  <ShieldCheck
                    size={15}
                    className="text-emerald-300"
                  />
                  Saved locally
                </div>
              </div>
            </div>

            <div className="relative mx-auto flex h-28 w-28 shrink-0 items-center justify-center lg:mx-0 lg:h-32 lg:w-32">
              <div className="absolute inset-0 rounded-full border border-violet-300/10 bg-violet-500/5" />

              <div className="absolute inset-4 rounded-full border border-blue-300/10 bg-blue-500/5" />

              <div className="absolute inset-8 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-xl" />

              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-gradient-to-br from-violet-500/25 to-blue-500/20 text-white shadow-xl shadow-violet-500/15">
                <Bot size={27} />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-7">
          <ProjectDashboard onOpenProject={onOpenProject} />
        </section>

        <section className="mt-8">
          <div>
            <div className="flex w-fit items-center gap-1.5 rounded-full border border-blue-400/15 bg-blue-500/10 px-2.5 py-1 text-[11px] font-medium text-blue-200">
              <Sparkles size={12} />
              Quick Actions
            </div>

            <h2 className="mt-2.5 text-xl font-semibold tracking-tight text-white sm:text-2xl">
              What would you like to do?
            </h2>

            <p className="mt-1.5 text-sm leading-6 text-white/45">
              Open a tool or begin a new conversation.
            </p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {quickActions.map((action) => {
              const Icon = action.icon;

              return (
                <button
                  key={action.title}
                  type="button"
                  onClick={action.onClick}
                  disabled={!action.available}
                  className="group relative overflow-hidden rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-left transition duration-200 enabled:hover:-translate-y-0.5 enabled:hover:border-white/15 enabled:hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-violet-500/5 blur-3xl" />

                  <div className="relative flex items-start justify-between gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/8 bg-white/[0.05] text-white/70 transition group-enabled:group-hover:bg-violet-500/15 group-enabled:group-hover:text-violet-200">
                      <Icon size={18} />
                    </div>

                    {action.available ? (
                      <ArrowRight
                        size={15}
                        className="mt-1 text-white/20 transition group-hover:translate-x-0.5 group-hover:text-white/60"
                      />
                    ) : (
                      <span className="rounded-full border border-white/8 bg-white/[0.03] px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-white/30">
                        Soon
                      </span>
                    )}
                  </div>

                  <h3 className="relative mt-4 text-sm font-semibold text-white/90">
                    {action.title}
                  </h3>

                  <p className="relative mt-1.5 text-xs leading-5 text-white/40">
                    {action.description}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-8 grid gap-3 pb-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-white/8 bg-white/[0.025] p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10 text-orange-300">
              <FileText size={18} />
            </div>

            <h3 className="mt-4 text-base font-semibold text-white">
              Project tools are coming
            </h3>

            <p className="mt-1.5 text-xs leading-5 text-white/40">
              Each project will have its own files, notes,
              memory, and AI settings.
            </p>
          </article>

          <article className="rounded-2xl border border-emerald-400/10 bg-gradient-to-br from-emerald-500/8 to-white/[0.02] p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300">
                <Bot size={18} />
              </div>

              <div className="flex items-center gap-1.5 rounded-full border border-emerald-400/15 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium text-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                Ready
              </div>
            </div>

            <h3 className="mt-4 text-base font-semibold text-white">
              Aura status
            </h3>

            <p className="mt-1.5 text-xs leading-5 text-white/40">
              Chat, projects, Markdown, code highlighting,
              and file previews are active.
            </p>
          </article>
        </section>
      </div>
    </main>
  );
}