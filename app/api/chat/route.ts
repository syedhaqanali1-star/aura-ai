import OpenAI from "openai";

import { AURA_SYSTEM_PROMPT } from "@/lib/aura-brain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type IncomingMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatRequestBody = {
  message?: string;
  messages?: IncomingMessage[];
  images?: string[];
};

function isValidMessage(
  value: unknown
): value is IncomingMessage {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const message =
    value as Partial<IncomingMessage>;

  return (
    (message.role === "user" ||
      message.role === "assistant") &&
    typeof message.content === "string" &&
    message.content.trim().length > 0
  );
}

function getErrorMessage(
  error: unknown
): string {
  if (error instanceof OpenAI.APIError) {
    if (error.status === 401) {
      return "Your NVIDIA API key is invalid.";
    }

    if (error.status === 402) {
      return "Your NVIDIA account does not currently have access to this model.";
    }

    if (error.status === 404) {
      return "The selected NVIDIA model could not be found.";
    }

    if (error.status === 413) {
      return "The uploaded image is too large.";
    }

    if (error.status === 429) {
      return "NVIDIA is currently rate-limiting Aura. Please try again shortly.";
    }

    if (error.status === 503) {
      return "NVIDIA's AI service is temporarily unavailable. Please try again shortly.";
    }

    return (
      error.message ||
      "NVIDIA could not complete the request."
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred.";
}

export async function POST(
  request: Request
) {
  try {
    const apiKey =
      process.env.NVIDIA_API_KEY?.trim();

    if (!apiKey) {
      return Response.json(
        {
          error:
            "Aura's NVIDIA API key is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    const body =
      (await request.json()) as ChatRequestBody;

    let messages: IncomingMessage[] = [];

    if (Array.isArray(body.messages)) {
      messages =
        body.messages.filter(
          isValidMessage
        );
    } else if (
      typeof body.message === "string" &&
      body.message.trim()
    ) {
      messages = [
        {
          role: "user",
          content:
            body.message.trim(),
        },
      ];
    }

    const images = Array.isArray(
      body.images
    )
      ? body.images.filter(
          (image) =>
            typeof image === "string" &&
            image.startsWith(
              "data:image/"
            )
        )
      : [];

    /*
     * Allow an image by itself.
     */
    if (
      messages.length === 0 &&
      images.length > 0
    ) {
      messages = [
        {
          role: "user",
          content:
            "Please analyze this image.",
        },
      ];
    }

    if (messages.length === 0) {
      return Response.json(
        {
          error:
            "At least one message or image is required.",
        },
        {
          status: 400,
        }
      );
    }

    const nvidia = new OpenAI({
      apiKey,
      baseURL:
        "https://integrate.api.nvidia.com/v1",
    });

    const hasImages =
      images.length > 0;

    /*
     * Normal text:
     * Llama 3.1 8B
     *
     * Image attached:
     * Nemotron 3 Nano Omni
     */
    const model = hasImages
      ? "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning"
      : process.env
          .NVIDIA_CHAT_MODEL?.trim() ||
        "meta/llama-3.1-8b-instruct";

    const apiMessages:
      OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
      [
        {
          role: "system",
          content:
            AURA_SYSTEM_PROMPT,
        },
      ];

    /*
     * Previous conversation messages.
     *
     * The image is attached only to the
     * newest user message.
     */
    messages.forEach(
      (message, index) => {
        const isLastMessage =
          index ===
          messages.length - 1;

        const shouldAttachImages =
          hasImages &&
          isLastMessage &&
          message.role === "user";

        if (!shouldAttachImages) {
          apiMessages.push({
            role: message.role,
            content:
              message.content,
          });

          return;
        }

        apiMessages.push({
          role: "user",

          content: [
            {
              type: "text",
              text:
                message.content ||
                "Please analyze this image.",
            },

            ...images.map(
              (image) => ({
                type:
                  "image_url" as const,

                image_url: {
                  url: image,
                },
              })
            ),
          ],
        });
      }
    );

    const stream =
      await nvidia.chat.completions.create(
        {
          model,

          messages:
            apiMessages,

          temperature:
            hasImages
              ? 0.6
              : 0.3,

          top_p:
            hasImages
              ? 0.95
              : 0.7,

          max_tokens:
            hasImages
              ? 2048
              : 1024,

          stream: true,

          ...(hasImages
            ? {
                extra_body: {
                  chat_template_kwargs: {
                    enable_thinking:
                      false,
                  },
                },
              }
            : {}),
        }
      );

    const encoder =
      new TextEncoder();

    const responseStream =
      new ReadableStream<Uint8Array>({
        async start(controller) {
          try {
            for await (
              const chunk of stream
            ) {
              const content =
                chunk.choices[0]
                  ?.delta?.content;

              if (content) {
                controller.enqueue(
                  encoder.encode(
                    content
                  )
                );
              }
            }

            controller.close();
          } catch (error) {
            console.error(
              "Aura NVIDIA streaming error:",
              error
            );

            controller.enqueue(
              encoder.encode(
                `\n\nAura encountered an error: ${getErrorMessage(
                  error
                )}`
              )
            );

            controller.close();
          }
        },
      });

    return new Response(
      responseStream,
      {
        status: 200,

        headers: {
          "Content-Type":
            "text/plain; charset=utf-8",

          "Cache-Control":
            "no-cache, no-transform",

          "X-Content-Type-Options":
            "nosniff",
        },
      }
    );
  } catch (error) {
    console.error(
      "Aura NVIDIA API error:",
      error
    );

    return Response.json(
      {
        error:
          getErrorMessage(error),
      },
      {
        status:
          error instanceof
          OpenAI.APIError
            ? error.status || 500
            : 500,
      }
    );
  }
}