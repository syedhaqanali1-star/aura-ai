import type {
  Project,
  ProjectColor,
  ProjectSettings,
} from "@/types/project";

export const PROJECTS_STORAGE_KEY = "aura-projects";
export const CURRENT_PROJECT_STORAGE_KEY =
  "aura-current-project-id";

const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  model: "standard",
  webSearch: false,
  temperature: 0.7,
};

export function createProjectId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `project-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

export function createProject(
  name: string,
  description = "",
  color: ProjectColor = "violet"
): Project {
  const timestamp = Date.now();

  return {
    id: createProjectId(),
    name: name.trim() || "Untitled Project",
    description: description.trim(),
    color,
    status: "active",
    createdAt: timestamp,
    updatedAt: timestamp,
    conversations: [],
    files: [],
    notes: [],
    memory: [],
    settings: {
      ...DEFAULT_PROJECT_SETTINGS,
    },
  };
}

export function createStarterProjects(): Project[] {
  const auraProject = createProject(
    "Aura Development",
    "Interface, features, architecture, and AI planning.",
    "violet"
  );

  const businessProject = createProject(
    "Website Business",
    "Client websites, pricing, outreach, and business ideas.",
    "blue"
  );

  const universityProject = createProject(
    "University",
    "Study notes, assignments, quizzes, and research.",
    "emerald"
  );

  return [
    auraProject,
    businessProject,
    universityProject,
  ];
}

export function updateProjectTimestamp(
  project: Project
): Project {
  return {
    ...project,
    updatedAt: Date.now(),
  };
}

export function renameProject(
  project: Project,
  name: string
): Project {
  const cleanedName = name.trim();

  if (!cleanedName) return project;

  return updateProjectTimestamp({
    ...project,
    name: cleanedName,
  });
}

export function updateProjectDescription(
  project: Project,
  description: string
): Project {
  return updateProjectTimestamp({
    ...project,
    description: description.trim(),
  });
}

export function updateProjectColor(
  project: Project,
  color: ProjectColor
): Project {
  return updateProjectTimestamp({
    ...project,
    color,
  });
}

export function isValidProject(
  value: unknown
): value is Project {
  if (!value || typeof value !== "object") {
    return false;
  }

  const project = value as Partial<Project>;

  return (
    typeof project.id === "string" &&
    typeof project.name === "string" &&
    typeof project.description === "string" &&
    typeof project.color === "string" &&
    typeof project.status === "string" &&
    typeof project.createdAt === "number" &&
    typeof project.updatedAt === "number" &&
    Array.isArray(project.conversations) &&
    Array.isArray(project.files) &&
    Array.isArray(project.notes) &&
    Array.isArray(project.memory) &&
    typeof project.settings === "object" &&
    project.settings !== null
  );
}

export function getProjectById(
  projects: Project[],
  projectId: string | null
) {
  if (!projectId) return null;

  return (
    projects.find(
      (project) => project.id === projectId
    ) ?? null
  );
}

export function sortProjectsByUpdatedAt(
  projects: Project[]
) {
  return [...projects].sort(
    (firstProject, secondProject) =>
      secondProject.updatedAt -
      firstProject.updatedAt
  );
}