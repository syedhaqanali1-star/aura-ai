export type ChatMessage = {
  id: string;
  role: "user" | "aura";
  text: string;
};

export type Conversation = {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
};