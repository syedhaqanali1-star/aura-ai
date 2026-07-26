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
  if (error instanceof OpenAI.APIError) {
    if (error.status === 401) {
      return "Your OpenRouter API key is invalid.";
    }

    if (error.status === 402) {
      return "The selected model requires payment. Aura is currently configured to use free models.";
    }

    if (error.status === 404) {
      return "The selected OpenRouter model could not be found.";
    }

    if (error.status === 429) {
      return "The OpenRouter request limit was reached, or free models are temporarily busy. Please try again later.";
    }

    if (error.status === 503) {
      return "OpenRouter is temporarily unavailable. Please try again shortly.";
    }

    return error.message || "OpenRouter could not complete the request.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred.";
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY?.trim();

    if (!apiKey) {
      console.error(
        "OPENROUTER_API_KEY is not available in the deployment environment."
      );

      return Response.json(
        {
          error:
            "Aura's OpenRouter API key is not configured on the server. Add OPENROUTER_API_KEY to your Netlify environment variables and redeploy.",
        },
        {
          status: 500,
        }
      );
    }

    const openrouter = new OpenAI({
      apiKey,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer":
          process.env.NEXT_PUBLIC_APP_URL?.trim() ||
          "http://localhost:3000",
        "X-Title": "Aura Intelligence AI",
      },
    });

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

    const stream = await openrouter.chat.completions.create({
      model: process.env.OPENROUTER_MODEL?.trim() || "openrouter/free",
      messages: [
        {
          role: "system",
          content: AURA_SYSTEM_PROMPT,
        },
        ...messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      ],
      stream: true,
    });

    const encoder = new TextEncoder();

    const responseStream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;

            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          }

          controller.close();
        } catch (error) {
          console.error("Aura streaming error:", error);

          controller.enqueue(
            encoder.encode(
              `\n\nAura encountered an error: ${getErrorMessage(error)}`
            )
          );

          controller.close();
        }
      },

      async cancel() {
        try {
          stream.controller.abort();
        } catch {
          // The stream may already be closed.
        }
      },
    });

    return new Response(responseStream, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Aura chat API error:", error);

    return Response.json(
      {
        error: getErrorMessage(error),
      },
      {
        status:
          error instanceof OpenAI.APIError
            ? error.status || 500
            : 500,
      }
    );
  }
}