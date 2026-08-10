import type {
  ChatMessage,
  Conversation,
} from "@/types/chat";

export const CONVERSATIONS_STORAGE_KEY =
  "aura-conversations";

export const CURRENT_CHAT_STORAGE_KEY =
  "aura-current-conversation";

export function createStarterConversation(): Conversation {
  return {
    id: crypto.randomUUID(),
    title: "New chat",
    messages: [],
    createdAt: Date.now(),
  };
}
export function createUserMessage(
  text: string
): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role: "user",
    text,
  };
}

export function createAuraMessage(
  text = ""
): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role: "aura",
    text,
  };
}

export function getConversationTitle(
  message: string
): string {
  const cleanedMessage = message.trim();

  if (cleanedMessage.length <= 35) {
    return cleanedMessage;
  }

  return `${cleanedMessage.slice(0, 35)}...`;
}

export function createDemoAuraResponse(
  userMessage: string
): string {
  const cleanedMessage = userMessage.trim();

  return [
    `I received your message: "${cleanedMessage}"`,
    "",
    "Aura's streaming response system is now working.",
    "",
    "This is currently a demonstration response. When we connect a real AI model, the actual answer will stream into this same message area word by word.",
  ].join("\n");
}

export function isValidConversation(
  conversation: unknown
): conversation is Conversation {
  if (
    !conversation ||
    typeof conversation !== "object"
  ) {
    return false;
  }

  const possibleConversation =
    conversation as Partial<Conversation>;

  return (
    typeof possibleConversation.id === "string" &&
    typeof possibleConversation.title === "string" &&
    typeof possibleConversation.createdAt === "number" &&
    Array.isArray(possibleConversation.messages)
  );
}