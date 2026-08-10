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
      return "Your ZenMux API key is invalid.";
    }

    if (error.status === 402) {
      return "Your ZenMux account does not have enough balance or credits for this model.";
    }

    if (error.status === 404) {
      return "The selected ZenMux model could not be found.";
    }

    if (error.status === 429) {
      return "ZenMux is currently rate-limiting requests. Please try again shortly.";
    }

    if (error.status === 503) {
      return "ZenMux or the selected model provider is temporarily unavailable.";
    }

    return (
      error.message ||
      "ZenMux could not complete the request."
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
      process.env.ZENMUX_API_KEY?.trim();

    if (!apiKey) {
      return Response.json(
        {
          error:
            "Aura's ZenMux API key is not configured. Add ZENMUX_API_KEY to your environment variables and redeploy.",
        },
        {
          status: 500,
        }
      );
    }

    const zenmux = new OpenAI({
      apiKey,
      baseURL:
        "https://zenmux.ai/api/v1",
    });

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

    const stream =
      await zenmux.chat.completions.create(
        {
          model:
            process.env
              .ZENMUX_MODEL?.trim() ||
            "anthropic/claude-fable-5",

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
                "Aura ZenMux streaming error:",
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
      "Aura ZenMux API error:",
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