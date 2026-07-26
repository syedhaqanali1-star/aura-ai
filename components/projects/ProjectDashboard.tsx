"use client";

import {
  ArrowRight,
  FileText,
  FolderKanban,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useState } from "react";

import { useProjects } from "@/context/ProjectContext";
import type {
  Project,
  ProjectColor,
} from "@/types/project";

type ProjectDashboardProps = {
  onOpenProject?: (projectId: string) => void;
};

const projectColors: Record<
  ProjectColor,
  {
    background: string;
    border: string;
    icon: string;
  }
> = {
  violet: {
    background:
      "from-violet-500/16 to-purple-500/4",
    border: "border-violet-400/15",
    icon: "bg-violet-500/12 text-violet-300",
  },
  blue: {
    background:
      "from-blue-500/16 to-cyan-500/4",
    border: "border-blue-400/15",
    icon: "bg-blue-500/12 text-blue-300",
  },
  emerald: {
    background:
      "from-emerald-500/16 to-teal-500/4",
    border: "border-emerald-400/15",
    icon: "bg-emerald-500/12 text-emerald-300",
  },
  orange: {
    background:
      "from-orange-500/16 to-amber-500/4",
    border: "border-orange-400/15",
    icon: "bg-orange-500/12 text-orange-300",
  },
  rose: {
    background:
      "from-rose-500/16 to-pink-500/4",
    border: "border-rose-400/15",
    icon: "bg-rose-500/12 text-rose-300",
  },
  cyan: {
    background:
      "from-cyan-500/16 to-sky-500/4",
    border: "border-cyan-400/15",
    icon: "bg-cyan-500/12 text-cyan-300",
  },
};

function formatUpdatedTime(timestamp: number) {
  const difference = Date.now() - timestamp;
  const minutes = Math.floor(difference / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "Just now";

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  if (hours < 24) {
    return `${hours}h ago`;
  }

  if (days < 7) {
    return `${days}d ago`;
  }

  return new Date(timestamp).toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
    }
  );
}

type ProjectCardProps = {
  project: Project;
  onOpen: () => void;
  onDelete: () => void;
};

function ProjectCard({
  project,
  onOpen,
  onDelete,
}: ProjectCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const color = projectColors[project.color];

  function handleDelete() {
    const shouldDelete = window.confirm(
      `Delete "${project.name}"? This cannot be undone.`
    );

    if (!shouldDelete) return;

    onDelete();
    setMenuOpen(false);
  }

  return (
    <article
      className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br ${color.background} ${color.border} p-4 transition duration-200 hover:-translate-y-0.5 hover:border-white/15`}
    >
      <div className="absolute -right-12 -top-12 h-28 w-28 rounded-full bg-white/4 blur-3xl" />

      <div className="relative flex items-start justify-between gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${color.icon}`}
        >
          <FolderKanban size={19} />
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() =>
              setMenuOpen((current) => !current)
            }
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 transition hover:bg-white/8 hover:text-white"
            aria-label={`Open options for ${project.name}`}
          >
            <MoreHorizontal size={17} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-9 z-20 w-40 rounded-xl border border-white/10 bg-[#11131a]/95 p-1 shadow-2xl backdrop-blur-xl">
              <button
                type="button"
                onClick={onOpen}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-white/70 transition hover:bg-white/8 hover:text-white"
              >
                <ArrowRight size={14} />
                Open project
              </button>

              <button
                type="button"
                onClick={handleDelete}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-rose-300 transition hover:bg-rose-500/10"
              >
                <Trash2 size={14} />
                Delete project
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="relative mt-4">
        <h3 className="truncate text-base font-semibold text-white">
          {project.name}
        </h3>

        <p className="mt-1.5 line-clamp-2 min-h-9 text-xs leading-5 text-white/45">
          {project.description ||
            "A focused workspace for chats, files, notes, and memory."}
        </p>
      </div>

      <div className="relative mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-white/7 bg-black/10 px-2.5 py-2">
          <div className="flex items-center gap-1 text-white/35">
            <MessageSquare size={12} />
            <span className="text-[9px] uppercase tracking-wide">
              Chats
            </span>
          </div>

          <p className="mt-1 text-xs font-semibold text-white/75">
            {project.conversations.length}
          </p>
        </div>

        <div className="rounded-xl border border-white/7 bg-black/10 px-2.5 py-2">
          <div className="flex items-center gap-1 text-white/35">
            <FileText size={12} />
            <span className="text-[9px] uppercase tracking-wide">
              Files
            </span>
          </div>

          <p className="mt-1 text-xs font-semibold text-white/75">
            {project.files.length}
          </p>
        </div>

        <div className="rounded-xl border border-white/7 bg-black/10 px-2.5 py-2">
          <div className="flex items-center gap-1 text-white/35">
            <Sparkles size={12} />
            <span className="text-[9px] uppercase tracking-wide">
              Notes
            </span>
          </div>

          <p className="mt-1 text-xs font-semibold text-white/75">
            {project.notes.length}
          </p>
        </div>
      </div>

      <div className="relative mt-4 flex items-center justify-between gap-3 border-t border-white/7 pt-3">
        <p className="truncate text-[11px] text-white/30">
          Updated {formatUpdatedTime(project.updatedAt)}
        </p>

        <button
          type="button"
          onClick={onOpen}
          className="flex shrink-0 items-center gap-1 rounded-lg bg-white/7 px-2.5 py-1.5 text-[11px] font-medium text-white/65 transition hover:bg-white/12 hover:text-white"
        >
          Open
          <ArrowRight size={12} />
        </button>
      </div>
    </article>
  );
}

export default function ProjectDashboard({
  onOpenProject,
}: ProjectDashboardProps) {
  const {
    projects,
    isLoaded,
    selectProject,
    deleteProject,
    createNewProject,
  } = useProjects();

  function openProject(projectId: string) {
    selectProject(projectId);
    onOpenProject?.(projectId);
  }

  function handleCreateProject() {
    const projectName = window.prompt(
      "What would you like to name your project?"
    );

    if (!projectName?.trim()) return;

    const projectId = createNewProject(
      projectName,
      "A new Aura workspace for chats, files, notes, and memory."
    );

    onOpenProject?.(projectId);
  }

  if (!isLoaded) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <div className="flex items-center gap-2 text-xs text-white/45">
          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
          Loading projects...
        </div>
      </div>
    );
  }

  return (
    <section className="w-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex w-fit items-center gap-1.5 rounded-full border border-violet-400/15 bg-violet-500/10 px-2.5 py-1 text-[11px] font-medium text-violet-200">
            <Sparkles size={12} />
            Projects
          </div>

          <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
            Your workspaces
          </h2>

          <p className="mt-1.5 max-w-xl text-sm leading-6 text-white/45">
            Keep chats, files, notes, and memory organized
            by project.
          </p>
        </div>

        <button
          type="button"
          onClick={handleCreateProject}
          className="flex w-fit items-center gap-2 rounded-xl bg-white px-3.5 py-2 text-xs font-semibold text-black shadow-lg shadow-white/10 transition hover:bg-white/90 active:scale-[0.98]"
        >
          <Plus size={15} />
          New Project
        </button>
      </div>

      {projects.length > 0 ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onOpen={() => openProject(project.id)}
              onDelete={() =>
                deleteProject(project.id)
              }
            />
          ))}
        </div>
      ) : (
        <div className="mt-5 flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
            <FolderKanban size={21} />
          </div>

          <h3 className="mt-3 text-base font-semibold text-white">
            No projects yet
          </h3>

          <p className="mt-1.5 max-w-sm text-xs leading-5 text-white/40">
            Create a workspace to organize chats, files,
            notes, and memory.
          </p>

          <button
            type="button"
            onClick={handleCreateProject}
            className="mt-4 flex items-center gap-2 rounded-xl bg-white px-3.5 py-2 text-xs font-semibold text-black"
          >
            <Plus size={15} />
            Create Project
          </button>
        </div>
      )}
    </section>
  );
}