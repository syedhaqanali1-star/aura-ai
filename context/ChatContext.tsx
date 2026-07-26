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

import { useProjects } from "@/context/ProjectContext";
import {
  createAuraMessage,
  createStarterConversation,
  createUserMessage,
  getConversationTitle,
} from "@/lib/chat";
import type {
  ChatMessage,
  Conversation,
} from "@/types/chat";

type ChatContextType = {
  conversations: Conversation[];
  currentConversationId: string;
  currentMessages: ChatMessage[];
  isGenerating: boolean;
  createNewChat: () => void;
  selectConversation: (
    conversationId: string
  ) => void;
  deleteConversation: (
    conversationId: string
  ) => void;
  sendMessage: (message: string) => void;
  stopGenerating: () => void;
};

type ApiMessage = {
  role: "user" | "assistant";
  content: string;
};

type ApiErrorResponse = {
  error?: string;
};

const ChatContext =
  createContext<ChatContextType | null>(null);

function createErrorMessage(
  error: unknown
) {
  if (
    error instanceof DOMException &&
    error.name === "AbortError"
  ) {
    return "";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Aura could not complete the response.";
}

function convertMessagesForApi(
  messages: ChatMessage[]
): ApiMessage[] {
  return messages
    .filter(
      (message) =>
        (message.role === "user" ||
          message.role === "aura") &&
        message.text.trim().length > 0
    )
    .map((message) => ({
      role:
        message.role === "user"
          ? "user"
          : "assistant",
      content: message.text.trim(),
    }));
}

export function ChatProvider({
  children,
}: {
  children: ReactNode;
}) {
  const {
    currentProject,
    currentProjectId,
    isLoaded,
    updateProjectConversations,
  } = useProjects();

  const [
    currentConversationId,
    setCurrentConversationId,
  ] = useState("");

  const [isGenerating, setIsGenerating] =
    useState(false);

  const conversations =
    currentProject?.conversations ?? [];

  const conversationsRef =
    useRef<Conversation[]>([]);

  const currentProjectIdRef =
    useRef<string | null>(null);

  const currentConversationIdRef =
    useRef("");

  const previousProjectIdRef =
    useRef<string | null>(null);

  const abortControllerRef =
    useRef<AbortController | null>(null);

  const activeGenerationIdRef =
    useRef(0);

  useEffect(() => {
    conversationsRef.current =
      conversations;
  }, [conversations]);

  useEffect(() => {
    currentProjectIdRef.current =
      currentProjectId ?? null;
  }, [currentProjectId]);

  useEffect(() => {
    currentConversationIdRef.current =
      currentConversationId;
  }, [currentConversationId]);

  const stopGenerating =
    useCallback(() => {
      activeGenerationIdRef.current += 1;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }

      setIsGenerating(false);
    }, []);

  useEffect(() => {
    return () => {
      activeGenerationIdRef.current += 1;

      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (
      !isLoaded ||
      !currentProjectId
    ) {
      return;
    }

    const projectChanged =
      previousProjectIdRef.current !==
      currentProjectId;

    previousProjectIdRef.current =
      currentProjectId;

    if (projectChanged) {
      stopGenerating();
    }

    if (conversations.length === 0) {
      const starterConversation =
        createStarterConversation();

      conversationsRef.current = [
        starterConversation,
      ];

      updateProjectConversations(
        currentProjectId,
        [starterConversation]
      );

      currentConversationIdRef.current =
        starterConversation.id;

      setCurrentConversationId(
        starterConversation.id
      );

      return;
    }

    const selectedConversationExists =
      conversations.some(
        (conversation) =>
          conversation.id ===
          currentConversationIdRef.current
      );

    if (
      projectChanged ||
      !selectedConversationExists
    ) {
      const firstConversationId =
        conversations[0].id;

      currentConversationIdRef.current =
        firstConversationId;

      setCurrentConversationId(
        firstConversationId
      );
    }
  }, [
    isLoaded,
    currentProjectId,
    conversations,
    stopGenerating,
    updateProjectConversations,
  ]);

  const currentConversation =
    useMemo(() => {
      return (
        conversations.find(
          (conversation) =>
            conversation.id ===
            currentConversationId
        ) ?? conversations[0]
      );
    }, [
      conversations,
      currentConversationId,
    ]);

  const currentMessages =
    currentConversation?.messages ?? [];

  const saveConversations =
    useCallback(
      (
        nextConversations: Conversation[],
        projectId?: string
      ) => {
        const targetProjectId =
          projectId ??
          currentProjectIdRef.current;

        if (!targetProjectId) {
          return;
        }

        if (
          targetProjectId ===
          currentProjectIdRef.current
        ) {
          conversationsRef.current =
            nextConversations;
        }

        updateProjectConversations(
          targetProjectId,
          nextConversations
        );
      },
      [updateProjectConversations]
    );

  const updateAssistantMessage =
    useCallback(
      (
        projectId: string,
        conversationId: string,
        messageId: string,
        updater: (
          currentText: string
        ) => string
      ) => {
        if (
          currentProjectIdRef.current !==
          projectId
        ) {
          return;
        }

        const nextConversations =
          conversationsRef.current.map(
            (conversation) => {
              if (
                conversation.id !==
                conversationId
              ) {
                return conversation;
              }

              return {
                ...conversation,
                messages:
                  conversation.messages.map(
                    (message) => {
                      if (
                        message.id !==
                        messageId
                      ) {
                        return message;
                      }

                      return {
                        ...message,
                        text: updater(
                          message.text
                        ),
                      };
                    }
                  ),
              };
            }
          );

        saveConversations(
          nextConversations,
          projectId
        );
      },
      [saveConversations]
    );

  const removeMessage =
    useCallback(
      (
        projectId: string,
        conversationId: string,
        messageId: string
      ) => {
        if (
          currentProjectIdRef.current !==
          projectId
        ) {
          return;
        }

        const nextConversations =
          conversationsRef.current.map(
            (conversation) => {
              if (
                conversation.id !==
                conversationId
              ) {
                return conversation;
              }

              return {
                ...conversation,
                messages:
                  conversation.messages.filter(
                    (message) =>
                      message.id !== messageId
                  ),
              };
            }
          );

        saveConversations(
          nextConversations,
          projectId
        );
      },
      [saveConversations]
    );

  const createNewChat =
    useCallback(() => {
      stopGenerating();

      const projectId =
        currentProjectIdRef.current;

      if (!projectId) {
        return;
      }

      const existingEmptyConversation =
        conversationsRef.current.find(
          (conversation) =>
            !conversation.messages.some(
              (message) =>
                message.role === "user"
            )
        );

      if (existingEmptyConversation) {
        currentConversationIdRef.current =
          existingEmptyConversation.id;

        setCurrentConversationId(
          existingEmptyConversation.id
        );

        return;
      }

      const newConversation =
        createStarterConversation();

      const nextConversations = [
        newConversation,
        ...conversationsRef.current,
      ];

      saveConversations(
        nextConversations,
        projectId
      );

      currentConversationIdRef.current =
        newConversation.id;

      setCurrentConversationId(
        newConversation.id
      );
    }, [
      saveConversations,
      stopGenerating,
    ]);

  const selectConversation =
    useCallback(
      (conversationId: string) => {
        const conversationExists =
          conversationsRef.current.some(
            (conversation) =>
              conversation.id ===
              conversationId
          );

        if (!conversationExists) {
          return;
        }

        stopGenerating();

        currentConversationIdRef.current =
          conversationId;

        setCurrentConversationId(
          conversationId
        );
      },
      [stopGenerating]
    );

  const deleteConversation =
    useCallback(
      (conversationId: string) => {
        stopGenerating();

        const projectId =
          currentProjectIdRef.current;

        if (!projectId) {
          return;
        }

        const remainingConversations =
          conversationsRef.current.filter(
            (conversation) =>
              conversation.id !==
              conversationId
          );

        if (
          remainingConversations.length ===
          0
        ) {
          const starterConversation =
            createStarterConversation();

          saveConversations(
            [starterConversation],
            projectId
          );

          currentConversationIdRef.current =
            starterConversation.id;

          setCurrentConversationId(
            starterConversation.id
          );

          return;
        }

        saveConversations(
          remainingConversations,
          projectId
        );

        if (
          currentConversationIdRef.current ===
          conversationId
        ) {
          const nextConversationId =
            remainingConversations[0].id;

          currentConversationIdRef.current =
            nextConversationId;

          setCurrentConversationId(
            nextConversationId
          );
        }
      },
      [
        saveConversations,
        stopGenerating,
      ]
    );

  const sendMessage =
    useCallback(
      async (message: string) => {
        const cleanedMessage =
          message.trim();

        const projectId =
          currentProjectIdRef.current;

        const conversationId =
          currentConversationIdRef.current;

        if (
          !cleanedMessage ||
          !projectId ||
          !conversationId ||
          isGenerating
        ) {
          return;
        }

        const selectedConversation =
          conversationsRef.current.find(
            (conversation) =>
              conversation.id ===
              conversationId
          );

        if (!selectedConversation) {
          return;
        }

        const userMessage =
          createUserMessage(
            cleanedMessage
          );

        const assistantMessage =
          createAuraMessage("");

        const isFirstUserMessage =
          !selectedConversation.messages.some(
            (chatMessage) =>
              chatMessage.role === "user"
          );

        const messagesForApi =
          convertMessagesForApi([
            ...selectedConversation.messages,
            userMessage,
          ]);

        const updatedConversation: Conversation =
          {
            ...selectedConversation,
            title: isFirstUserMessage
              ? getConversationTitle(
                  cleanedMessage
                )
              : selectedConversation.title,
            messages: [
              ...selectedConversation.messages,
              userMessage,
              assistantMessage,
            ],
          };

        const nextConversations = [
          updatedConversation,
          ...conversationsRef.current.filter(
            (conversation) =>
              conversation.id !==
              conversationId
          ),
        ];

        saveConversations(
          nextConversations,
          projectId
        );

        const generationId =
          activeGenerationIdRef.current + 1;

        activeGenerationIdRef.current =
          generationId;

        const controller =
          new AbortController();

        abortControllerRef.current =
          controller;

        setIsGenerating(true);

        try {
          const response = await fetch(
            "/api/chat",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                messages: messagesForApi,
              }),
              signal: controller.signal,
            }
          );

          if (!response.ok) {
            let errorMessage =
              "Aura could not complete the request.";

            try {
              const errorBody =
                (await response.json()) as ApiErrorResponse;

              if (
                typeof errorBody.error ===
                  "string" &&
                errorBody.error.trim()
              ) {
                errorMessage =
                  errorBody.error;
              }
            } catch {
              errorMessage =
                response.statusText ||
                errorMessage;
            }

            throw new Error(errorMessage);
          }

          if (!response.body) {
            throw new Error(
              "Aura received an empty response."
            );
          }

          const reader =
            response.body.getReader();

          const decoder =
            new TextDecoder();

          let receivedText = false;

          while (true) {
            const { done, value } =
              await reader.read();

            if (
              activeGenerationIdRef.current !==
              generationId
            ) {
              await reader.cancel();
              return;
            }

            if (done) {
              break;
            }

            const chunk = decoder.decode(
              value,
              {
                stream: true,
              }
            );

            if (!chunk) {
              continue;
            }

            receivedText = true;

            updateAssistantMessage(
              projectId,
              conversationId,
              assistantMessage.id,
              (currentText) =>
                currentText + chunk
            );
          }

          const finalChunk =
            decoder.decode();

          if (finalChunk) {
            receivedText = true;

            updateAssistantMessage(
              projectId,
              conversationId,
              assistantMessage.id,
              (currentText) =>
                currentText + finalChunk
            );
          }

          if (!receivedText) {
            throw new Error(
              "Aura returned an empty response."
            );
          }
        } catch (error) {
          const errorMessage =
            createErrorMessage(error);

          if (!errorMessage) {
            const assistantStillEmpty =
              conversationsRef.current
                .find(
                  (conversation) =>
                    conversation.id ===
                    conversationId
                )
                ?.messages.find(
                  (chatMessage) =>
                    chatMessage.id ===
                    assistantMessage.id
                )?.text.trim().length === 0;

            if (assistantStillEmpty) {
              removeMessage(
                projectId,
                conversationId,
                assistantMessage.id
              );
            }

            return;
          }

          updateAssistantMessage(
            projectId,
            conversationId,
            assistantMessage.id,
            (currentText) => {
              if (currentText.trim()) {
                return `${currentText}\n\n---\n\n**Error:** ${errorMessage}`;
              }

              return `**Aura encountered an error:** ${errorMessage}`;
            }
          );
        } finally {
          if (
            activeGenerationIdRef.current ===
            generationId
          ) {
            abortControllerRef.current =
              null;

            setIsGenerating(false);
          }
        }
      },
      [
        isGenerating,
        removeMessage,
        saveConversations,
        updateAssistantMessage,
      ]
    );

  const contextValue =
    useMemo<ChatContextType>(
      () => ({
        conversations,
        currentConversationId,
        currentMessages,
        isGenerating,
        createNewChat,
        selectConversation,
        deleteConversation,
        sendMessage,
        stopGenerating,
      }),
      [
        conversations,
        currentConversationId,
        currentMessages,
        isGenerating,
        createNewChat,
        selectConversation,
        deleteConversation,
        sendMessage,
        stopGenerating,
      ]
    );

  return (
    <ChatContext.Provider
      value={contextValue}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context =
    useContext(ChatContext);

  if (!context) {
    throw new Error(
      "useChat must be used inside ChatProvider"
    );
  }

  return context;
}