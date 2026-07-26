import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { isValidProject } from "@/lib/project";
import type { Project } from "@/types/project";

type UserAuraData = {
  projects: Project[];
  currentProjectId: string | null;
};

type FirestoreAuraDocument = {
  projects?: unknown;
  currentProjectId?: unknown;
};

function getUserDataReference(userId: string) {
  return doc(db, "users", userId, "aura", "data");
}

export async function loadUserAuraData(
  userId: string
): Promise<UserAuraData | null> {
  const cleanUserId = userId.trim();

  if (!cleanUserId) {
    return null;
  }

  const userDataReference =
    getUserDataReference(cleanUserId);

  const snapshot = await getDoc(userDataReference);

  if (!snapshot.exists()) {
    return null;
  }

  const data =
    snapshot.data() as FirestoreAuraDocument;

  const projects = Array.isArray(data.projects)
    ? data.projects.filter(isValidProject)
    : [];

  if (projects.length === 0) {
    return null;
  }

  const savedCurrentProjectId =
    typeof data.currentProjectId === "string"
      ? data.currentProjectId
      : null;

  const currentProjectStillExists =
    savedCurrentProjectId !== null &&
    projects.some(
      (project) =>
        project.id === savedCurrentProjectId
    );

  return {
    projects,
    currentProjectId: currentProjectStillExists
      ? savedCurrentProjectId
      : projects[0]?.id ?? null,
  };
}

export async function saveUserAuraData(
  userId: string,
  projects: Project[],
  currentProjectId: string | null
): Promise<void> {
  const cleanUserId = userId.trim();

  if (!cleanUserId) {
    throw new Error(
      "A valid signed-in user is required to save Aura data."
    );
  }

  const userDataReference =
    getUserDataReference(cleanUserId);

  await setDoc(
    userDataReference,
    {
      projects,
      currentProjectId,
      updatedAt: serverTimestamp(),
    },
    {
      merge: true,
    }
  );
}