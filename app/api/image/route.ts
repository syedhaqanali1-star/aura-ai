import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ImageRequestBody = {
  prompt?: string;
};

function getErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Aura could not generate the image.";
  }

  const message = error.message.toLowerCase();

  if (
    message.includes("api key") ||
    message.includes("401") ||
    message.includes("unauthenticated")
  ) {
    return "Your Gemini API key is invalid.";
  }

  if (
    message.includes("quota") ||
    message.includes("429") ||
    message.includes("resource exhausted") ||
    message.includes("rate limit")
  ) {
    return "Gemini image generation quota has been reached.";
  }

  if (
    message.includes("404") ||
    message.includes("not found")
  ) {
    return "The Gemini image model could not be found.";
  }

  return error.message;
}

export async function POST(request: Request) {
  try {
    const apiKey =
      process.env.GEMINI_API_KEY?.trim();

    if (!apiKey) {
      return Response.json(
        {
          error:
            "GEMINI_API_KEY is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    const body =
      (await request.json()) as ImageRequestBody;

    const prompt =
      typeof body.prompt === "string"
        ? body.prompt.trim()
        : "";

    if (!prompt) {
      return Response.json(
        {
          error:
            "An image prompt is required.",
        },
        {
          status: 400,
        }
      );
    }

    const ai = new GoogleGenAI({
      apiKey,
    });

    const response =
      await ai.models.generateContent({
        model:
          process.env
            .GEMINI_IMAGE_MODEL?.trim() ||
          "gemini-3.1-flash-image",

        contents: prompt,

        config: {
          responseModalities: ["IMAGE"],
        },
      });

    const parts =
      response.candidates?.[0]?.content
        ?.parts ?? [];

    for (const part of parts) {
      if (
        part.inlineData?.data &&
        part.inlineData.mimeType
      ) {
        const imageDataUrl =
          `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;

        return Response.json({
          imageDataUrl,
        });
      }
    }

    return Response.json(
      {
        error:
          "Gemini did not return an image.",
      },
      {
        status: 500,
      }
    );
  } catch (error) {
    console.error(
      "Aura image generation error:",
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