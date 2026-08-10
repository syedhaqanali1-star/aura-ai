import { InferenceClient } from "@huggingface/inference";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ImageRequestBody = {
  prompt?: string;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (
      message.includes("401") ||
      message.includes("unauthorized") ||
      message.includes("token")
    ) {
      return "Your Hugging Face token is invalid.";
    }

    if (
      message.includes("402") ||
      message.includes("credit") ||
      message.includes("billing")
    ) {
      return "Your Hugging Face inference credits are exhausted.";
    }

    if (
      message.includes("429") ||
      message.includes("rate limit")
    ) {
      return "Hugging Face is rate-limiting image generation. Please try again shortly.";
    }

    if (
      message.includes("404") ||
      message.includes("not found")
    ) {
      return "The selected Hugging Face image model could not be found.";
    }

    if (
      message.includes("503") ||
      message.includes("unavailable")
    ) {
      return "The Hugging Face image provider is temporarily unavailable. Please try again.";
    }

    return error.message;
  }

  return "Aura could not generate the image.";
}

export async function POST(request: Request) {
  try {
    const token = process.env.HF_TOKEN?.trim();

    if (!token) {
      return Response.json(
        {
          error:
            "Aura's Hugging Face token is not configured. Add HF_TOKEN to the environment variables.",
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
          error: "An image prompt is required.",
        },
        {
          status: 400,
        }
      );
    }

    const client = new InferenceClient(token);

    const imageBlob = await client.textToImage(
      {
        model:
          process.env.HF_IMAGE_MODEL?.trim() ||
          "black-forest-labs/FLUX.1-dev",

        inputs: prompt,
      },
      {
        outputType: "blob",
      }
    );

    const arrayBuffer =
      await imageBlob.arrayBuffer();

    const base64 = Buffer.from(
      arrayBuffer
    ).toString("base64");

    const mimeType =
      imageBlob.type || "image/png";

    const imageDataUrl =
      `data:${mimeType};base64,${base64}`;

    return Response.json({
      imageDataUrl,
    });
  } catch (error) {
    console.error(
      "Aura Hugging Face image generation error:",
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