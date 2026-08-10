import {
  experimental_generateVideo as generateVideo,
  NoVideoGeneratedError,
} from "ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const maxDuration = 300;

type VideoRequestBody = {
  prompt?: string;
};

function getErrorMessage(
  error: unknown
): string {
  if (
    NoVideoGeneratedError.isInstance(
      error
    )
  ) {
    return "The video model did not return a video.";
  }

  if (error instanceof Error) {
    const message =
      error.message.toLowerCase();

    if (
      message.includes("api key") ||
      message.includes("unauthorized") ||
      message.includes("401")
    ) {
      return "Your Vercel AI Gateway API key is invalid.";
    }

    if (
      message.includes("payment") ||
      message.includes("billing") ||
      message.includes("credits") ||
      message.includes("402")
    ) {
      return "Video generation requires AI Gateway billing or available credits.";
    }

    if (
      message.includes("rate limit") ||
      message.includes("429")
    ) {
      return "Video generation is currently rate-limited. Please try again shortly.";
    }

    return error.message;
  }

  return "Aura could not generate the video.";
}

export async function POST(
  request: Request
) {
  try {
    const apiKey =
      process.env
        .AI_GATEWAY_API_KEY?.trim();

    if (!apiKey) {
      return Response.json(
        {
          error:
            "AI_GATEWAY_API_KEY is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    const body =
      (await request.json()) as VideoRequestBody;

    const prompt =
      typeof body.prompt === "string"
        ? body.prompt.trim()
        : "";

    if (!prompt) {
      return Response.json(
        {
          error:
            "A video prompt is required.",
        },
        {
          status: 400,
        }
      );
    }

    const { video } =
      await generateVideo({
        model:
          process.env
            .AI_GATEWAY_VIDEO_MODEL?.trim() ||
          "alibaba/wan-v2.6-t2v",

        prompt,

        aspectRatio: "16:9",

        duration: 5,

        abortSignal:
          AbortSignal.timeout(
            240_000
          ),
      });

    const base64 =
      video.base64;

    if (!base64) {
      return Response.json(
        {
          error:
            "The video model returned an empty video.",
        },
        {
          status: 500,
        }
      );
    }

    const videoUrl =
      `data:video/mp4;base64,${base64}`;

    return Response.json({
      videoUrl,
    });
  } catch (error) {
    console.error(
      "Aura AI Gateway video error:",
      error
    );

    return Response.json(
      {
        error:
          getErrorMessage(error),
      },
      {
        status: 500,
      }
    );
  }
}