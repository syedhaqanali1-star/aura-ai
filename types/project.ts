import type { Conversation } from "./chat";

export type ProjectColor =
  | "violet"
  | "blue"
  | "emerald"
  | "orange"
  | "rose"
  | "cyan";

export type ProjectStatus =
  | "active"
  | "archived"
  | "completed";

export type ProjectFile = {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: number;
};

export type ProjectNote = {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
};

export type ProjectMemory = {
  id: string;
  title: string;
  content: string;
  createdAt: number;
};

export type ProjectSettings = {
  model: string;
  webSearch: boolean;
  temperature: number;
};

export type Project = {
  id: string;
  name: string;
  description: string;

  color: ProjectColor;
  status: ProjectStatus;

  createdAt: number;
  updatedAt: number;

  conversations: Conversation[];
  files: ProjectFile[];
  notes: ProjectNote[];
  memory: ProjectMemory[];

  settings: ProjectSettings;
};