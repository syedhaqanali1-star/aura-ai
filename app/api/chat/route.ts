import Anthropic from "@anthropic-ai/sdk";

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

function isValidMessage(value: unknown): value is IncomingMessage {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const message = value as Partial<IncomingMessage>;

  return (
    (message.role === "user" || message.role === "assistant") &&
    typeof message.content === "string" &&
    message.content.trim().length > 0
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Anthropic.APIError) {
    if (error.status === 401) {
      return "Your Anthropic API key is invalid.";
    }

    if (error.status === 402) {
      return "Your Anthropic account needs billing or credits before this model can be used.";
    }

    if (error.status === 404) {
      return "The selected Claude model could not be found.";
    }

    if (error.status === 429) {
      return "Claude is currently rate-limited or your account usage limit has been reached. Please try again shortly.";
    }

    if (error.status === 503) {
      return "Claude is temporarily unavailable. Please try again shortly.";
    }

    return error.message || "Claude could not complete the request.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred.";
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY?.trim();

    if (!apiKey) {
      return Response.json(
        {
          error:
            "Aura's Anthropic API key is not configured on the server. Add ANTHROPIC_API_KEY to your environment variables and redeploy.",
        },
        {
          status: 500,
        }
      );
    }

    const body = (await request.json()) as ChatRequestBody;

    let messages: IncomingMessage[] = [];

    if (Array.isArray(body.messages)) {
      messages = body.messages.filter(isValidMessage);
    } else if (
      typeof body.message === "string" &&
      body.message.trim().length > 0
    ) {
      messages = [
        {
          role: "user",
          content: body.message.trim(),
        },
      ];
    }

    if (messages.length === 0) {
      return Response.json(
        {
          error: "At least one valid message is required.",
        },
        {
          status: 400,
        }
      );
    }

    const anthropic = new Anthropic({
      apiKey,
    });

    const stream = anthropic.messages.stream({
      model:
        process.env.ANTHROPIC_MODEL?.trim() ||
        "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: AURA_SYSTEM_PROMPT,
      messages: messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    });

    const encoder = new TextEncoder();

    const responseStream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          stream.on("text", (text) => {
            if (text) {
              controller.enqueue(
                encoder.encode(text)
              );
            }
          });

          await stream.finalMessage();
          controller.close();
        } catch (error) {
          console.error(
            "Aura Claude streaming error:",
            error
          );

          controller.enqueue(
            encoder.encode(
              `\n\nAura encountered an error: ${getErrorMessage(error)}`
            )
          );

          controller.close();
        }
      },

      cancel() {
        try {
          stream.abort();
        } catch {
          // Stream may already be closed.
        }
      },
    });

    return new Response(responseStream, {
      status: 200,
      headers: {
        "Content-Type":
          "text/plain; charset=utf-8",
        "Cache-Control":
          "no-cache, no-transform",
        "X-Content-Type-Options":
          "nosniff",
      },
    });
  } catch (error) {
    console.error(
      "Aura Claude API error:",
      error
    );

    return Response.json(
      {
        error: getErrorMessage(error),
      },
      {
        status:
          error instanceof Anthropic.APIError
            ? error.status || 500
            : 500,
      }
    );
  }
}