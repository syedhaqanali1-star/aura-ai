export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type VideoRequestBody = {
  prompt?: string;
  image?: string;
};

type NvidiaVideoResponse = {
  b64_video?: string;
  seed?: number;
  error?: string;
  detail?: string;
  message?: string;
};

function getErrorMessage(
  status: number,
  data?: NvidiaVideoResponse
): string {
  const providerMessage =
    data?.error ||
    data?.detail ||
    data?.message ||
    "";

  if (status === 401) {
    return "Your NVIDIA API key is invalid.";
  }

  if (status === 403) {
    return "Your NVIDIA account does not have access to this video endpoint.";
  }

  if (status === 404) {
    return "The NVIDIA Cosmos video endpoint could not be found.";
  }

  if (status === 429) {
    return "NVIDIA is currently rate-limiting video generation. Please try again later.";
  }

  if (status === 503) {
    return "NVIDIA Cosmos is temporarily unavailable.";
  }

  return (
    providerMessage ||
    "Aura could not generate the video."
  );
}

export async function POST(
  request: Request
) {
  try {
    const apiKey =
      process.env.NVIDIA_API_KEY?.trim();

    const endpoint =
      process.env.NVIDIA_VIDEO_ENDPOINT?.trim();

    if (!apiKey) {
      return Response.json(
        {
          error:
            "NVIDIA_API_KEY is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    if (!endpoint) {
      return Response.json(
        {
          error:
            "NVIDIA_VIDEO_ENDPOINT is not configured.",
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
            "A prompt or source image is required.",
        },
        {
          status: 400,
        }
      );
    }

    const payload: {
      prompt: string;
      fps: number;
      guidance_scale: number;
      num_output_frames: number;
      resolution: string;
      steps: number;
      seed: number;
      image?: string;
    } = {
      prompt,
      fps: 24,
      guidance_scale: 6,
      num_output_frames: 189,
      resolution: "480",
      steps: 35,
      seed: Math.floor(
        Math.random() * 1_000_000
      ),
    };

    if (image) {
      payload.image = image;
    }

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
        "Aura NVIDIA video error:",
        response.status,
        data
      );

      return Response.json(
        {
          error:
            getErrorMessage(
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
      return Response.json(
        {
          error:
            "NVIDIA did not return video data.",
        },
        {
          status: 500,
        }
      );
    }

    return Response.json({
      videoUrl:
        `data:video/mp4;base64,${data.b64_video}`,
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