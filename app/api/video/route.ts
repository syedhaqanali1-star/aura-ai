export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type VideoRequestBody = {
  prompt?: string;
  image?: string;
};

type NvidiaVideoResponse = {
  b64_video?: string;
  error?: string;
  detail?: string;
};

function getErrorMessage(
  status: number,
  data?: NvidiaVideoResponse
): string {
  const serverMessage =
    data?.error ||
    data?.detail ||
    "";

  if (status === 401) {
    return "Your NVIDIA API key is invalid.";
  }

  if (status === 403) {
    return "Your NVIDIA account does not have access to the video model.";
  }

  if (status === 404) {
    return "The NVIDIA Cosmos video endpoint could not be found.";
  }

  if (status === 422) {
    return (
      serverMessage ||
      "The video request contained an unsupported option."
    );
  }

  if (status === 429) {
    return "NVIDIA is currently rate-limiting video generation. Please try again shortly.";
  }

  if (status === 503) {
    return "NVIDIA Cosmos is temporarily unavailable. Please try again shortly.";
  }

  return (
    serverMessage ||
    "Aura could not generate the video."
  );
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
      (await request.json()) as VideoRequestBody;

    const prompt =
      typeof body.prompt === "string"
        ? body.prompt.trim()
        : "";

    const image =
      typeof body.image === "string"
        ? body.image.trim()
        : "";

    if (!prompt && !image) {
      return Response.json(
        {
          error:
            "A video prompt or source image is required.",
        },
        {
          status: 400,
        }
      );
    }

    const payload: Record<
      string,
      string | number | boolean
    > = {
      prompt,
      seed: Math.floor(
        Math.random() * 1_000_000
      ),
      guidance_scale: 6,
      steps: 35,
      resolution: "480_16_9",
      num_output_frames: 121,
      fps: 24,
    };

    if (image) {
      payload.image = image;
    }

    const endpoint =
      process.env.NVIDIA_VIDEO_ENDPOINT?.trim() ||
      "https://ai.api.nvidia.com/v1/genai/nvidia/cosmos3-nano";

    const response = await fetch(
      endpoint,
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${apiKey}`,
          Accept:
            "application/json",
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify(
          payload
        ),

        cache: "no-store",
      }
    );

    let data: NvidiaVideoResponse = {};

    try {
      data =
        (await response.json()) as NvidiaVideoResponse;
    } catch {
      data = {};
    }

    if (!response.ok) {
      console.error(
        "Aura NVIDIA video API error:",
        response.status,
        data
      );

      return Response.json(
        {
          error: getErrorMessage(
            response.status,
            data
          ),
        },
        {
          status:
            response.status >= 400 &&
            response.status < 600
              ? response.status
              : 500,
        }
      );
    }

    if (!data.b64_video) {
      console.error(
        "NVIDIA video response did not contain b64_video:",
        data
      );

      return Response.json(
        {
          error:
            "NVIDIA did not return a generated video.",
        },
        {
          status: 500,
        }
      );
    }

    const videoUrl =
      `data:video/mp4;base64,${data.b64_video}`;

    return Response.json({
      videoUrl,
    });
  } catch (error) {
    console.error(
      "Aura video generation error:",
      error
    );

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Aura could not generate the video.",
      },
      {
        status: 500,
      }
    );
  }
}