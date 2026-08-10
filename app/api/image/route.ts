export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ImageRequestBody = {
  prompt?: string;
};

type CloudflareResponse = {
  result?: {
    image?: string;
  };
  success?: boolean;
  errors?: Array<{
    message?: string;
  }>;
};

function getErrorMessage(
  status: number,
  data?: CloudflareResponse
): string {
  const cloudflareMessage =
    data?.errors?.[0]?.message?.trim();

  if (status === 401) {
    return "Your Cloudflare API token is invalid.";
  }

  if (status === 403) {
    return "Your Cloudflare API token does not have permission to use Workers AI.";
  }

  if (status === 404) {
    return "The Cloudflare image model could not be found.";
  }

  if (status === 429) {
    return "Cloudflare is currently rate-limiting image generation. Please try again shortly.";
  }

  if (status === 503) {
    return "Cloudflare Workers AI is temporarily unavailable. Please try again shortly.";
  }

  return (
    cloudflareMessage ||
    "Aura could not generate the image."
  );
}

export async function POST(
  request: Request
) {
  try {
    const accountId =
      process.env.CLOUDFLARE_ACCOUNT_ID?.trim();

    const apiToken =
      process.env.CLOUDFLARE_API_TOKEN?.trim();

    if (!accountId || !apiToken) {
      return Response.json(
        {
          error:
            "Aura's Cloudflare Workers AI credentials are not configured.",
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

    const model =
      process.env.CLOUDFLARE_IMAGE_MODEL?.trim() ||
      "@cf/black-forest-labs/flux-1-schnell";

    const endpoint =
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

    const response = await fetch(
      endpoint,
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${apiToken}`,

          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          prompt,
          steps: 4,
          seed: Math.floor(
            Math.random() * 1_000_000
          ),
        }),

        cache: "no-store",
      }
    );

    let data: CloudflareResponse = {};

    try {
      data =
        (await response.json()) as CloudflareResponse;
    } catch {
      data = {};
    }

    if (!response.ok) {
      console.error(
        "Aura Cloudflare image API error:",
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

    const base64Image =
      data.result?.image;

    if (!base64Image) {
      console.error(
        "Cloudflare did not return image data:",
        data
      );

      return Response.json(
        {
          error:
            "Cloudflare did not return a generated image.",
        },
        {
          status: 500,
        }
      );
    }

    const imageDataUrl =
      `data:image/jpeg;base64,${base64Image}`;

    return Response.json({
      imageDataUrl,
    });
  } catch (error) {
    console.error(
      "Aura Cloudflare image generation error:",
      error
    );

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Aura could not generate the image.",
      },
      {
        status: 500,
      }
    );
  }
}