import { GoogleGenAI } from "@google/genai";

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
  if (!(error instanceof Error)) {
    return "An unexpected Gemini error occurred.";
  }

  const message = error.message.toLowerCase();

  if (
    message.includes("api key") ||
    message.includes("unauthenticated") ||
    message.includes("401")
  ) {
    return "Your Gemini API key is invalid or is not configured correctly.";
  }

  if (
    message.includes("quota") ||
    message.includes("rate limit") ||
    message.includes("429")
  ) {
    return "The Gemini free usage limit was reached. Please wait a little while and try again.";
  }

  if (
    message.includes("not found") ||
    message.includes("404")
  ) {
    return "The selected Gemini model could not be found.";
  }

  if (
    message.includes("unavailable") ||
    message.includes("503")
  ) {
    return "Gemini is temporarily unavailable. Please try again shortly.";
  }

  return error.message || "Gemini could not complete the request.";
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (!apiKey) {
      console.error(
        "GEMINI_API_KEY is not available in the deployment environment."
      );

      return Response.json(
        {
          error:
            "Aura's Gemini API key is not configured on the server. Add GEMINI_API_KEY to your Vercel environment variables and redeploy.",
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

    const ai = new GoogleGenAI({
      apiKey,
    });

    const response = await ai.models.generateContentStream({
      model: "gemini-3.5-flash",
      contents: messages.map((message) => ({
        role:
          message.role === "assistant"
            ? "model"
            : "user",
        parts: [
          {
            text: message.content,
          },
        ],
      })),
      config: {
        systemInstruction: AURA_SYSTEM_PROMPT,
        temperature: 0.7,
        maxOutputTokens: 4096,
      },
    });

    const encoder = new TextEncoder();

    const responseStream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of response) {
            const text = chunk.text;

            if (text) {
              controller.enqueue(
                encoder.encode(text)
              );
            }
          }

          controller.close();
        } catch (error) {
          console.error(
            "Aura Gemini streaming error:",
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
      "Aura Gemini API error:",
      error
    );

    return Response.json(
      {
        error: getErrorMessage(error),
      },
      {
        status: 500,
      }
    );
  }
}