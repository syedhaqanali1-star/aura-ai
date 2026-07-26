"use client";

import {
  ArrowLeft,
  Brain,
  FileText,
  FolderKanban,
  MessageSquare,
  NotebookPen,
  Settings,
  Sparkles,
} from "lucide-react";

import { useProjects } from "@/context/ProjectContext";

type ProjectWorkspaceProps = {
  onBack: () => void;
  onOpenChats: () => void;
};

type WorkspaceTool = {
  title: string;
  description: string;
  icon: typeof MessageSquare;
  available: boolean;
  onClick?: () => void;
};

export default function ProjectWorkspace({
  onBack,
  onOpenChats,
}: ProjectWorkspaceProps) {
  const { currentProject } = useProjects();

  if (!currentProject) {
    return (
      <main className="flex h-full items-center justify-center px-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white">
            Project not found
          </h2>

          <p className="mt-2 text-sm text-white/45">
            Return to the dashboard and select a project.
          </p>

          <button
            type="button"
            onClick={onBack}
            className="mt-5 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-black"
          >
            Back to Dashboard
          </button>
        </div>
      </main>
    );
  }

  const workspaceTools: WorkspaceTool[] = [
    {
      title: "Chats",
      description:
        "Open conversations connected to this project.",
      icon: MessageSquare,
      available: true,
      onClick: onOpenChats,
    },
    {
      title: "Files",
      description:
        "Upload and organize PDFs, images, documents, and code.",
      icon: FileText,
      available: false,
    },
    {
      title: "Notes",
      description:
        "Write project notes using a clean Markdown editor.",
      icon: NotebookPen,
      available: false,
    },
    {
      title: "Memory",
      description:
        "Manage information Aura should remember for this project.",
      icon: Brain,
      available: false,
    },
    {
      title: "Settings",
      description:
        "Choose the model, instructions, web search, and behavior.",
      icon: Settings,
      available: false,
    },
  ];

  return (
    <main className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-7 lg:px-10 lg:py-10">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/50 transition hover:bg-white/[0.06] hover:text-white"
        >
          <ArrowLeft size={17} />
          Back to Dashboard
        </button>

        <section className="relative mt-5 overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-violet-500/15 via-white/[0.035] to-blue-500/10 px-6 py-8 shadow-2xl shadow-black/30 sm:px-9 sm:py-10 lg:px-12">
          <div className="pointer-events-none absolute -left-24 -top-28 h-72 w-72 rounded-full bg-violet-500/15 blur-[100px]" />

          <div className="pointer-events-none absolute -bottom-32 right-0 h-80 w-80 rounded-full bg-blue-500/10 blur-[110px]" />

          <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex w-fit items-center gap-2 rounded-full border border-violet-300/15 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-200">
                <FolderKanban size={13} />
                Project Workspace
              </div>

              <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
                {currentProject.name}
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/55 sm:text-base">
                {currentProject.description ||
                  "A focused workspace for conversations, files, notes, memory, and AI settings."}
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-white/35">
                    Chats
                  </p>
                  <p className="mt-1 text-lg font-semibold text-white">
                    {currentProject.conversations.length}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-white/35">
                    Files
                  </p>
                  <p className="mt-1 text-lg font-semibold text-white">
                    {currentProject.files.length}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-white/35">
                    Notes
                  </p>
                  <p className="mt-1 text-lg font-semibold text-white">
                    {currentProject.notes.length}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-white/35">
                    Memory
                  </p>
                  <p className="mt-1 text-lg font-semibold text-white">
                    {currentProject.memory.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="relative mx-auto flex h-44 w-44 shrink-0 items-center justify-center lg:mx-0 lg:h-52 lg:w-52">
              <div className="absolute inset-0 rounded-full border border-violet-300/10 bg-violet-500/5" />

              <div className="absolute inset-5 rounded-full border border-blue-300/10 bg-blue-500/5" />

              <div className="absolute inset-10 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-xl" />

              <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-white/15 bg-gradient-to-br from-violet-500/30 to-blue-500/20 text-white shadow-2xl shadow-violet-500/20">
                <Sparkles size={36} />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div>
            <div className="flex w-fit items-center gap-2 rounded-full border border-blue-400/15 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-200">
              <Sparkles size={13} />
              Workspace Tools
            </div>

            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Manage your project
            </h2>

            <p className="mt-2 text-sm leading-6 text-white/50">
              Everything inside this workspace belongs only to{" "}
              {currentProject.name}.
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {workspaceTools.map((tool) => {
              const Icon = tool.icon;

              return (
                <button
                  key={tool.title}
                  type="button"
                  onClick={tool.onClick}
                  disabled={!tool.available}
                  className="group relative overflow-hidden rounded-3xl border border-white/8 bg-white/[0.035] p-6 text-left transition duration-300 enabled:hover:-translate-y-1 enabled:hover:border-white/15 enabled:hover:bg-white/[0.055] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <div className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-violet-500/5 blur-3xl transition group-enabled:group-hover:bg-violet-500/10" />

                  <div className="relative flex items-start justify-between gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.055] text-white/75 transition group-enabled:group-hover:bg-violet-500/15 group-enabled:group-hover:text-violet-200">
                      <Icon size={23} />
                    </div>

                    {!tool.available && (
                      <span className="rounded-full border border-white/8 bg-white/[0.035] px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-white/35">
                        Soon
                      </span>
                    )}
                  </div>

                  <h3 className="relative mt-5 text-lg font-semibold text-white/90">
                    {tool.title}
                  </h3>

                  <p className="relative mt-2 text-sm leading-6 text-white/45">
                    {tool.description}
                  </p>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}