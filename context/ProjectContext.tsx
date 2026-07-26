"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useAuth } from "@/context/AuthContext";
import {
  loadUserAuraData,
  saveUserAuraData,
} from "@/lib/firestore";
import {
  CURRENT_PROJECT_STORAGE_KEY,
  PROJECTS_STORAGE_KEY,
  createProject,
  createStarterProjects,
  getProjectById,
  isValidProject,
  renameProject,
  sortProjectsByUpdatedAt,
  updateProjectColor,
  updateProjectDescription,
  updateProjectTimestamp,
} from "@/lib/project";
import type { Conversation } from "@/types/chat";
import type {
  Project,
  ProjectColor,
} from "@/types/project";

type ProjectContextValue = {
  projects: Project[];
  currentProjectId: string | null;
  currentProject: Project | null;
  isLoaded: boolean;

  createNewProject: (
    name: string,
    description?: string,
    color?: ProjectColor
  ) => string;

  selectProject: (projectId: string) => void;
  deleteProject: (projectId: string) => void;

  renameExistingProject: (
    projectId: string,
    name: string
  ) => void;

  changeProjectDescription: (
    projectId: string,
    description: string
  ) => void;

  changeProjectColor: (
    projectId: string,
    color: ProjectColor
  ) => void;

  updateProjectConversations: (
    projectId: string,
    conversations: Conversation[]
  ) => void;
};

type ProjectProviderProps = {
  children: ReactNode;
};

type LocalAuraData = {
  projects: Project[];
  currentProjectId: string | null;
};

const ProjectContext =
  createContext<ProjectContextValue | null>(null);

function createFallbackProjects(): Project[] {
  const starterProjects = createStarterProjects();

  if (starterProjects.length > 0) {
    return starterProjects;
  }

  return [
    createProject(
      "My Project",
      "Your personal Aura workspace.",
      "violet"
    ),
  ];
}

function getValidCurrentProjectId(
  projects: Project[],
  requestedProjectId: string | null
): string | null {
  const requestedProjectExists =
    requestedProjectId !== null &&
    projects.some(
      (project) => project.id === requestedProjectId
    );

  if (requestedProjectExists) {
    return requestedProjectId;
  }

  return projects[0]?.id ?? null;
}

function createFreshAuraData(): LocalAuraData {
  const projects = createFallbackProjects();

  return {
    projects,
    currentProjectId: projects[0]?.id ?? null,
  };
}

function loadAnonymousAuraData(): LocalAuraData {
  try {
    const savedProjects =
      window.localStorage.getItem(
        PROJECTS_STORAGE_KEY
      );

    const savedCurrentProjectId =
      window.localStorage.getItem(
        CURRENT_PROJECT_STORAGE_KEY
      );

    if (savedProjects) {
      const parsedProjects: unknown =
        JSON.parse(savedProjects);

      if (Array.isArray(parsedProjects)) {
        const validProjects =
          parsedProjects.filter(isValidProject);

        if (validProjects.length > 0) {
          const sortedProjects =
            sortProjectsByUpdatedAt(
              validProjects
            );

          return {
            projects: sortedProjects,
            currentProjectId:
              getValidCurrentProjectId(
                sortedProjects,
                savedCurrentProjectId
              ),
          };
        }
      }
    }
  } catch (error) {
    console.error(
      "Could not load anonymous Aura projects:",
      error
    );
  }

  return createFreshAuraData();
}

function saveAnonymousAuraData(
  projects: Project[],
  currentProjectId: string | null
): void {
  try {
    window.localStorage.setItem(
      PROJECTS_STORAGE_KEY,
      JSON.stringify(projects)
    );

    if (currentProjectId) {
      window.localStorage.setItem(
        CURRENT_PROJECT_STORAGE_KEY,
        currentProjectId
      );
    } else {
      window.localStorage.removeItem(
        CURRENT_PROJECT_STORAGE_KEY
      );
    }
  } catch (error) {
    console.error(
      "Could not save anonymous Aura projects:",
      error
    );
  }
}

function clearAnonymousAuraData(): void {
  try {
    window.localStorage.removeItem(
      PROJECTS_STORAGE_KEY
    );
    window.localStorage.removeItem(
      CURRENT_PROJECT_STORAGE_KEY
    );
  } catch (error) {
    console.error(
      "Could not clear anonymous Aura projects:",
      error
    );
  }
}

export function ProjectProvider({
  children,
}: ProjectProviderProps) {
  const {
    user,
    loading: authLoading,
  } = useAuth();

  const [projects, setProjects] =
    useState<Project[]>([]);

  const [
    currentProjectId,
    setCurrentProjectId,
  ] = useState<string | null>(null);

  const [isLoaded, setIsLoaded] =
    useState(false);

  const projectsRef = useRef<Project[]>([]);
  const currentProjectIdRef =
    useRef<string | null>(null);

  const saveTimeoutRef =
    useRef<ReturnType<typeof setTimeout> | null>(
      null
    );

  const observedUserIdRef =
    useRef<string | null | undefined>(
      undefined
    );

  const activeDataOwnerRef =
    useRef<string | null | undefined>(
      undefined
    );

  const previousSignedInUserIdRef =
    useRef<string | null>(null);

  useEffect(() => {
    projectsRef.current = projects;
  }, [projects]);

  useEffect(() => {
    currentProjectIdRef.current =
      currentProjectId;
  }, [currentProjectId]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    const userId = user?.uid ?? null;

    if (observedUserIdRef.current === userId) {
      return;
    }

    const previousUserId =
      previousSignedInUserIdRef.current;

    observedUserIdRef.current = userId;
    activeDataOwnerRef.current = undefined;
    previousSignedInUserIdRef.current = userId;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    setIsLoaded(false);
    setProjects([]);
    setCurrentProjectId(null);

    projectsRef.current = [];
    currentProjectIdRef.current = null;

    let cancelled = false;

    async function loadProjects(): Promise<void> {
      try {
        if (!userId) {
          /*
           * When a signed-in user signs out, remove any old
           * browser copy that may have been created by the
           * earlier storage implementation. This prevents one
           * account's chats from remaining visible after logout.
           */
          if (previousUserId) {
            clearAnonymousAuraData();
          }

          const anonymousData =
            loadAnonymousAuraData();

          if (cancelled) {
            return;
          }

          activeDataOwnerRef.current = null;
          projectsRef.current =
            anonymousData.projects;
          currentProjectIdRef.current =
            anonymousData.currentProjectId;

          setProjects(anonymousData.projects);
          setCurrentProjectId(
            anonymousData.currentProjectId
          );
          setIsLoaded(true);

          return;
        }

        const cloudData =
          await loadUserAuraData(userId);

        if (cancelled) {
          return;
        }

        if (
          cloudData &&
          cloudData.projects.length > 0
        ) {
          const sortedProjects =
            sortProjectsByUpdatedAt(
              cloudData.projects
            );

          const nextCurrentProjectId =
            getValidCurrentProjectId(
              sortedProjects,
              cloudData.currentProjectId
            );

          activeDataOwnerRef.current =
            userId;
          projectsRef.current =
            sortedProjects;
          currentProjectIdRef.current =
            nextCurrentProjectId;

          setProjects(sortedProjects);
          setCurrentProjectId(
            nextCurrentProjectId
          );
          setIsLoaded(true);

          return;
        }

        /*
         * A Google account with no cloud document receives a
         * completely fresh workspace. We intentionally do not
         * import shared localStorage data because that could
         * belong to a different Google account.
         */
        const freshData =
          createFreshAuraData();

        await saveUserAuraData(
          userId,
          freshData.projects,
          freshData.currentProjectId
        );

        if (cancelled) {
          return;
        }

        activeDataOwnerRef.current =
          userId;
        projectsRef.current =
          freshData.projects;
        currentProjectIdRef.current =
          freshData.currentProjectId;

        setProjects(freshData.projects);
        setCurrentProjectId(
          freshData.currentProjectId
        );
        setIsLoaded(true);
      } catch (error) {
        console.error(
          "Could not load Aura account data:",
          error
        );

        if (cancelled) {
          return;
        }

        /*
         * Do not display another account's local chats when a
         * signed-in account fails to load. Show a fresh temporary
         * workspace instead.
         */
        const safeData =
          createFreshAuraData();

        activeDataOwnerRef.current =
          userId;
        projectsRef.current =
          safeData.projects;
        currentProjectIdRef.current =
          safeData.currentProjectId;

        setProjects(safeData.projects);
        setCurrentProjectId(
          safeData.currentProjectId
        );
        setIsLoaded(true);
      }
    }

    void loadProjects();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.uid]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    const expectedOwner = user?.uid ?? null;

    if (
      activeDataOwnerRef.current !==
      expectedOwner
    ) {
      return;
    }

    if (!user?.uid) {
      saveAnonymousAuraData(
        projects,
        currentProjectId
      );
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    const userId = user.uid;
    const projectsToSave = projects;
    const currentProjectIdToSave =
      currentProjectId;

    saveTimeoutRef.current = setTimeout(
      () => {
        if (
          activeDataOwnerRef.current !==
          userId
        ) {
          return;
        }

        void saveUserAuraData(
          userId,
          projectsToSave,
          currentProjectIdToSave
        ).catch((error: unknown) => {
          console.error(
            "Could not save Aura data to Firestore:",
            error
          );
        });
      },
      600
    );

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [
    projects,
    currentProjectId,
    isLoaded,
    user?.uid,
  ]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const currentProject = useMemo(() => {
    return getProjectById(
      projects,
      currentProjectId
    );
  }, [projects, currentProjectId]);

  const createNewProject = useCallback(
    (
      name: string,
      description = "",
      color: ProjectColor = "violet"
    ) => {
      const cleanName = name.trim();

      const newProject = createProject(
        cleanName || "Untitled Project",
        description.trim(),
        color
      );

      setProjects((currentProjects) => {
        const nextProjects =
          sortProjectsByUpdatedAt([
            newProject,
            ...currentProjects,
          ]);

        projectsRef.current = nextProjects;

        return nextProjects;
      });

      currentProjectIdRef.current =
        newProject.id;

      setCurrentProjectId(newProject.id);

      return newProject.id;
    },
    []
  );

  const selectProject = useCallback(
    (projectId: string) => {
      const projectExists =
        projectsRef.current.some(
          (project) =>
            project.id === projectId
        );

      if (!projectExists) {
        return;
      }

      currentProjectIdRef.current =
        projectId;

      setCurrentProjectId(projectId);
    },
    []
  );

  const deleteProject = useCallback(
    (projectId: string) => {
      setProjects((currentProjects) => {
        const remainingProjects =
          currentProjects.filter(
            (project) =>
              project.id !== projectId
          );

        if (
          remainingProjects.length === 0
        ) {
          const fallbackProjects =
            createFallbackProjects();

          const fallbackProjectId =
            fallbackProjects[0]?.id ?? null;

          projectsRef.current =
            fallbackProjects;

          currentProjectIdRef.current =
            fallbackProjectId;

          setCurrentProjectId(
            fallbackProjectId
          );

          return fallbackProjects;
        }

        const sortedProjects =
          sortProjectsByUpdatedAt(
            remainingProjects
          );

        projectsRef.current =
          sortedProjects;

        if (
          currentProjectIdRef.current ===
          projectId
        ) {
          const nextProjectId =
            sortedProjects[0]?.id ?? null;

          currentProjectIdRef.current =
            nextProjectId;

          setCurrentProjectId(
            nextProjectId
          );
        }

        return sortedProjects;
      });
    },
    []
  );

  const renameExistingProject =
    useCallback(
      (
        projectId: string,
        name: string
      ) => {
        const cleanName = name.trim();

        if (!cleanName) {
          return;
        }

        setProjects((currentProjects) => {
          const nextProjects =
            sortProjectsByUpdatedAt(
              currentProjects.map(
                (project) =>
                  project.id === projectId
                    ? renameProject(
                        project,
                        cleanName
                      )
                    : project
              )
            );

          projectsRef.current =
            nextProjects;

          return nextProjects;
        });
      },
      []
    );

  const changeProjectDescription =
    useCallback(
      (
        projectId: string,
        description: string
      ) => {
        setProjects((currentProjects) => {
          const nextProjects =
            sortProjectsByUpdatedAt(
              currentProjects.map(
                (project) =>
                  project.id === projectId
                    ? updateProjectDescription(
                        project,
                        description.trim()
                      )
                    : project
              )
            );

          projectsRef.current =
            nextProjects;

          return nextProjects;
        });
      },
      []
    );

  const changeProjectColor =
    useCallback(
      (
        projectId: string,
        color: ProjectColor
      ) => {
        setProjects((currentProjects) => {
          const nextProjects =
            sortProjectsByUpdatedAt(
              currentProjects.map(
                (project) =>
                  project.id === projectId
                    ? updateProjectColor(
                        project,
                        color
                      )
                    : project
              )
            );

          projectsRef.current =
            nextProjects;

          return nextProjects;
        });
      },
      []
    );

  const updateProjectConversations =
    useCallback(
      (
        projectId: string,
        conversations: Conversation[]
      ) => {
        setProjects((currentProjects) => {
          let projectWasFound = false;

          const updatedProjects =
            currentProjects.map(
              (project) => {
                if (
                  project.id !== projectId
                ) {
                  return project;
                }

                projectWasFound = true;

                return updateProjectTimestamp({
                  ...project,
                  conversations,
                });
              }
            );

          if (!projectWasFound) {
            return currentProjects;
          }

          const nextProjects =
            sortProjectsByUpdatedAt(
              updatedProjects
            );

          projectsRef.current =
            nextProjects;

          return nextProjects;
        });
      },
      []
    );

  const value =
    useMemo<ProjectContextValue>(
      () => ({
        projects,
        currentProjectId,
        currentProject,
        isLoaded,
        createNewProject,
        selectProject,
        deleteProject,
        renameExistingProject,
        changeProjectDescription,
        changeProjectColor,
        updateProjectConversations,
      }),
      [
        projects,
        currentProjectId,
        currentProject,
        isLoaded,
        createNewProject,
        selectProject,
        deleteProject,
        renameExistingProject,
        changeProjectDescription,
        changeProjectColor,
        updateProjectConversations,
      ]
    );

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjects() {
  const context = useContext(ProjectContext);

  if (!context) {
    throw new Error(
      "useProjects must be used inside ProjectProvider."
    );
  }

  return context;
}
