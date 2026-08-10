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

/* =========================================================
   TYPES
========================================================= */

type AuraIntent =
  | "chat"
  | "image_generation"
  | "image_edit"
  | "video_generation";

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

  sendMessage: (
    message: string,
    files?: File[]
  ) => void;

  stopGenerating: () => void;
};

type ApiMessage = {
  role: "user" | "assistant";
  content: string;
};

type ApiErrorResponse = {
  error?: string;
};

type ImageApiResponse = {
  imageDataUrl?: string;
  error?: string;
};

type VideoApiResponse = {
  videoUrl?: string;
  error?: string;
};

/* =========================================================
   CONTEXT
========================================================= */

const ChatContext =
  createContext<ChatContextType | null>(
    null
  );

/* =========================================================
   INTENT ROUTER
========================================================= */

function detectAuraIntent(
  message: string,
  files: File[] = []
): AuraIntent {
  const normalized = message
    .toLowerCase()
    .trim();

  const hasImageFile = files.some(
    (file) =>
      file.type.startsWith("image/")
  );

  /* -----------------------------
     IMAGE EDIT
  ----------------------------- */

  if (hasImageFile) {
    const imageEditPatterns = [
      /\b(edit|change|modify|fix|enhance|retouch|restore|improve|clean up)\b/,

      /\b(remove|erase|delete|get rid of)\b/,

      /\b(add|insert|put|place)\b/,

      /\b(replace|swap|switch)\b/,

      /\b(change|make|turn)\b.*\b(color|colour|background|sky|shirt|car|hair|eyes|face|clothes)\b/,

      /\b(make|turn|convert)\b.*\b(anime|cartoon|realistic|cinematic|3d|painting|sketch)\b/,

      /\bbackground\b.*\b(remove|replace|change|blur)\b/,

      /\b(upscale|sharpen|denoise|restore)\b/,

      /\b(make this|change this|edit this|fix this|remove this)\b/,
    ];

    const isEditRequest =
      imageEditPatterns.some(
        (pattern) =>
          pattern.test(normalized)
      );

    if (isEditRequest) {
      return "image_edit";
    }
  }

  /* -----------------------------
     VIDEO GENERATION
  ----------------------------- */

  const videoPatterns = [
    /\b(generate|create|make|produce|render)\b.*\b(video|clip|animation|movie|cinematic)\b/,

    /\b(video|clip|animation)\b.*\b(of|showing|with|featuring|about)\b/,

    /\banimate this\b/,

    /\banimate the image\b/,

    /\bturn this into a video\b/,

    /\bmake this move\b/,

    /\bbring this image to life\b/,

    /\bcreate a short film\b/,

    /\bmake a short film\b/,

    /\btext to video\b/,

    /\bimage to video\b/,
  ];

  const isVideoRequest =
    videoPatterns.some(
      (pattern) =>
        pattern.test(normalized)
    );

  if (isVideoRequest) {
    return "video_generation";
  }

  /* -----------------------------
     IMAGE GENERATION
  ----------------------------- */

  const imagePatterns = [
    /\b(generate|create|make|draw|design|render|illustrate|visualize)\b.*\b(image|photo|picture|art|artwork|poster|logo|wallpaper|portrait|scene|illustration|graphic)\b/,

    /\b(image|photo|picture|art|artwork|poster|logo|wallpaper|portrait|illustration|graphic)\b.*\b(of|for|showing|with|featuring)\b/,

    /\bturn (this|that|it)\b.*\binto\b.*\b(image|photo|picture|art|illustration|poster)\b/,

    /\bcan you draw\b/,

    /\bdraw me\b/,

    /\bpaint me\b/,

    /\bcan you make me\b.*\b(photo|picture|image|poster|logo|art|wallpaper)\b/,

    /\bi want\b.*\b(photo|picture|image|poster|logo|wallpaper|portrait|artwork)\b/,

    /\bshow me\b.*\b(as an image|as a picture|as a photo|visually)\b/,

    /\bcreate artwork\b/,

    /\bdesign a logo\b/,

    /\bdesign a poster\b/,

    /\bmake a wallpaper\b/,

    /\bmake me look like\b/,

    /\bwhat would\b.*\blook like\b.*\b(image|picture|photo|visually)\b/,
  ];

  const isImageRequest =
    imagePatterns.some(
      (pattern) =>
        pattern.test(normalized)
    );

  if (isImageRequest) {
    return "image_generation";
  }

  return "chat";
}

/* =========================================================
   HELPERS
========================================================= */

function createErrorMessage(
  error: unknown
): string {
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
        typeof message.text ===
          "string" &&
        message.text.trim().length > 0
    )
    .map((message) => ({
      role:
        message.role === "user"
          ? "user"
          : "assistant",

      content:
        message.text.trim(),
    }));
}

function fileToDataUrl(
  file: File
): Promise<string> {
  return new Promise(
    (resolve, reject) => {
      const reader =
        new FileReader();

      reader.onload = () => {
        if (
          typeof reader.result ===
          "string"
        ) {
          resolve(
            reader.result
          );

          return;
        }

        reject(
          new Error(
            "Aura could not read the uploaded image."
          )
        );
      };

      reader.onerror = () => {
        reject(
          new Error(
            "Aura could not read the uploaded image."
          )
        );
      };

      reader.readAsDataURL(file);
    }
  );
}

/* =========================================================
   PROVIDER
========================================================= */

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

  const [
    isGenerating,
    setIsGenerating,
  ] = useState(false);

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
    useRef<AbortController | null>(
      null
    );

  const activeGenerationIdRef =
    useRef(0);

  /* =======================================================
     REF SYNCHRONIZATION
  ======================================================= */

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

  /* =======================================================
     STOP GENERATION
  ======================================================= */

  const stopGenerating =
    useCallback(() => {
      activeGenerationIdRef.current +=
        1;

      if (
        abortControllerRef.current
      ) {
        abortControllerRef.current.abort();

        abortControllerRef.current =
          null;
      }

      setIsGenerating(false);
    }, []);

  useEffect(() => {
    return () => {
      activeGenerationIdRef.current +=
        1;

      abortControllerRef.current?.abort();

      abortControllerRef.current =
        null;
    };
  }, []);

  /* =======================================================
     PROJECT / CONVERSATION INITIALIZATION
  ======================================================= */

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

    if (
      conversations.length === 0
    ) {
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

  /* =======================================================
     CURRENT CONVERSATION
  ======================================================= */

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

  /* =======================================================
     SAVE CONVERSATIONS
  ======================================================= */

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
      [
        updateProjectConversations,
      ]
    );

  /* =======================================================
     UPDATE ASSISTANT TEXT
  ======================================================= */

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

  /* =======================================================
     UPDATE ASSISTANT VIDEO
  ======================================================= */

  const updateAssistantVideo =
    useCallback(
      (
        projectId: string,
        conversationId: string,
        messageId: string,
        videoDataUrl: string
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
                        videoDataUrl,
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

  /* =======================================================
     UPDATE ASSISTANT IMAGE
  ======================================================= */

  const updateAssistantImage =
    useCallback(
      (
        projectId: string,
        conversationId: string,
        messageId: string,
        imageDataUrl: string
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
                        imageDataUrl,
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

  /* =======================================================
     REMOVE MESSAGE
  ======================================================= */

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
                      message.id !==
                      messageId
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

  /* =======================================================
     CREATE NEW CHAT
  ======================================================= */

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
                message.role ===
                "user"
            )
        );

      if (
        existingEmptyConversation
      ) {
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

  /* =======================================================
     SELECT CONVERSATION
  ======================================================= */

  const selectConversation =
    useCallback(
      (
        conversationId: string
      ) => {
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

  /* =======================================================
     DELETE CONVERSATION
  ======================================================= */

  const deleteConversation =
    useCallback(
      (
        conversationId: string
      ) => {
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
            remainingConversations[0]
              .id;

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

  /* =======================================================
     SEND MESSAGE
  ======================================================= */

  const sendMessage =
    useCallback(
      async (
        message: string,
        files: File[] = []
      ) => {
        const cleanedMessage =
          message.trim();

        const imageFiles =
          files.filter(
            (file) =>
              file.type.startsWith(
                "image/"
              )
          );

        /*
         * This lets somebody upload an image
         * without typing anything.
         */
        const effectiveMessage =
          cleanedMessage ||
          (imageFiles.length > 0
            ? "What is in this image?"
            : "");

        const intent =
          detectAuraIntent(
            effectiveMessage,
            files
          );

        console.log(
          "[Aura Router]",
          {
            intent,

            message:
              effectiveMessage,

            files: files.map(
              (file) => ({
                name: file.name,
                type: file.type,
                size: file.size,
              })
            ),
          }
        );

        const projectId =
          currentProjectIdRef.current;

        const conversationId =
          currentConversationIdRef.current;

        if (
          !effectiveMessage ||
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

        if (
          !selectedConversation
        ) {
          return;
        }

        const userMessage =
          createUserMessage(
            effectiveMessage
          );

        const assistantMessage =
          createAuraMessage("");

        const isFirstUserMessage =
          !selectedConversation.messages.some(
            (chatMessage) =>
              chatMessage.role ===
              "user"
          );

        const messagesForApi =
          convertMessagesForApi([
            ...selectedConversation.messages,
            userMessage,
          ]);

        const updatedConversation: Conversation =
          {
            ...selectedConversation,

            title:
              isFirstUserMessage
                ? getConversationTitle(
                    effectiveMessage
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
          activeGenerationIdRef.current +
          1;

        activeGenerationIdRef.current =
          generationId;

        const controller =
          new AbortController();

        abortControllerRef.current =
          controller;

        setIsGenerating(true);

        try {
          /* ===============================================
             IMAGE GENERATION
          =============================================== */

          if (
            intent ===
            "image_generation"
          ) {
            const response =
              await fetch(
                "/api/image",
                {
                  method: "POST",

                  headers: {
                    "Content-Type":
                      "application/json",
                  },

                  body:
                    JSON.stringify({
                      prompt:
                        effectiveMessage,
                    }),

                  signal:
                    controller.signal,
                }
              );

            const data =
              (await response.json()) as ImageApiResponse;

            if (!response.ok) {
              throw new Error(
                data.error ||
                  "Aura could not generate the image."
              );
            }

            if (
              !data.imageDataUrl
            ) {
              throw new Error(
                "Aura did not receive an image from the image model."
              );
            }

            updateAssistantMessage(
              projectId,
              conversationId,
              assistantMessage.id,
              () =>
                "Here’s the image I generated:"
            );

            updateAssistantImage(
              projectId,
              conversationId,
              assistantMessage.id,
              data.imageDataUrl
            );

            return;
          }

          /* ===============================================
             VIDEO GENERATION
          =============================================== */

          if (
            intent ===
            "video_generation"
          ) {
            const response =
              await fetch(
                "/api/video",
                {
                  method: "POST",

                  headers: {
                    "Content-Type":
                      "application/json",
                  },

                  body:
                    JSON.stringify({
                      prompt:
                        effectiveMessage,
                    }),

                  signal:
                    controller.signal,
                }
              );

            const data =
              (await response.json()) as VideoApiResponse;

            if (!response.ok) {
              throw new Error(
                data.error ||
                  "Aura could not generate the video."
              );
            }

            if (
              !data.videoUrl
            ) {
              throw new Error(
                "Aura did not receive a video from the video model."
              );
            }

            updateAssistantMessage(
              projectId,
              conversationId,
              assistantMessage.id,
              () =>
                "Here’s the video I generated:"
            );

            updateAssistantVideo(
              projectId,
              conversationId,
              assistantMessage.id,
              data.videoUrl
            );

            return;
          }

          /* ===============================================
             IMAGE EDIT
          =============================================== */

          if (
            intent ===
            "image_edit"
          ) {
            updateAssistantMessage(
              projectId,
              conversationId,
              assistantMessage.id,
              () =>
                "I understand that you want to edit the uploaded image. Aura's image-editing model is being connected next."
            );

            return;
          }

          /* ===============================================
             NORMAL CHAT / IMAGE UNDERSTANDING
          =============================================== */

          const imageDataUrls =
            await Promise.all(
              imageFiles.map(
                fileToDataUrl
              )
            );

          const response =
            await fetch(
              "/api/chat",
              {
                method: "POST",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body:
                  JSON.stringify({
                    messages:
                      messagesForApi,

                    images:
                      imageDataUrls,
                  }),

                signal:
                  controller.signal,
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

            throw new Error(
              errorMessage
            );
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
            const {
              done,
              value,
            } =
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

            const chunk =
              decoder.decode(
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
              (
                currentText
              ) =>
                currentText +
                chunk
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
              (
                currentText
              ) =>
                currentText +
                finalChunk
            );
          }

          if (!receivedText) {
            throw new Error(
              "Aura returned an empty response."
            );
          }
        } catch (error) {
          const errorMessage =
            createErrorMessage(
              error
            );

          if (!errorMessage) {
            const assistantStillEmpty =
              conversationsRef.current
                .find(
                  (
                    conversation
                  ) =>
                    conversation.id ===
                    conversationId
                )
                ?.messages.find(
                  (
                    chatMessage
                  ) =>
                    chatMessage.id ===
                    assistantMessage.id
                )
                ?.text.trim()
                .length === 0;

            if (
              assistantStillEmpty
            ) {
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
            (
              currentText
            ) => {
              if (
                currentText.trim()
              ) {
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

            setIsGenerating(
              false
            );
          }
        }
      },
      [
        isGenerating,
        removeMessage,
        saveConversations,
        updateAssistantImage,
        updateAssistantMessage,
        updateAssistantVideo,
      ]
    );

  /* =======================================================
     CONTEXT VALUE
  ======================================================= */

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

/* =========================================================
   HOOK
========================================================= */

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