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
      return "Your NVIDIA API account does not currently have access to this model.";
    }

    if (error.status === 404) {
      return "The selected NVIDIA model could not be found.";
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
            "Aura's NVIDIA API key is not configured. Add NVIDIA_API_KEY to your environment variables and redeploy.",
        },
        {
          status: 500,
        }
      );
    }

    const body =
      (await request.json()) as ChatRequestBody;

    let messages: IncomingMessage[] =
      [];

    if (
      Array.isArray(body.messages)
    ) {
      messages =
        body.messages.filter(
          isValidMessage
        );
    } else if (
      typeof body.message ===
        "string" &&
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

    if (messages.length === 0) {
      return Response.json(
        {
          error:
            "At least one valid message is required.",
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

    const stream =
      await nvidia.chat.completions.create(
        {
          model:
            process.env
              .NVIDIA_CHAT_MODEL?.trim() ||
            "meta/llama-3.3-70b-instruct",

          messages: [
            {
              role: "system",
              content:
                AURA_SYSTEM_PROMPT,
            },

            ...messages.map(
              (message) => ({
                role: message.role,
                content:
                  message.content,
              })
            ),
          ],

          temperature: 0.3,
          top_p: 0.7,
          max_tokens: 4096,
          stream: true,
        }
      );

    const encoder =
      new TextEncoder();

    const responseStream =
      new ReadableStream<Uint8Array>(
        {
          async start(controller) {
            try {
              for await (const chunk of stream) {
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
        }
      );

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