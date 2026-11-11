import Anthropic from "@anthropic-ai/sdk";
import {
  GetCitySystemPromptResponse,
  SendCityChatBody,
  SendCityChatResponse,
  type ErrorResponse,
} from "@workspace/api-zod";
import { Router, type IRouter } from "express";
import { citySystemPrompt } from "../city";

const router: IRouter = Router();

const defaultSettings = {
  maxOutputTokens: 300,
} as const;

const defaultModel = "claude-sonnet-5-5";

function makeErrorResponse(error: string): ErrorResponse {
  return { error };
}

router.get("/chat/system-prompt", (_req, res) => {
  res.json(GetCitySystemPromptResponse.parse({ systemPrompt: citySystemPrompt }));
});

router.post("/chat", async (req, res): Promise<void> => {
  // Validate the full request before checking configuration or calling Claude.
  const parsed = SendCityChatBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(
      makeErrorResponse(
        "Please check your message and Prompt Lab settings, then try again.",
      ),
    );
    return;
  }

  const apiKey = process.env.Claude_API_Key;
  if (!apiKey) {
    req.log.warn("Claude API key is not configured");
    res.status(503).json(
      makeErrorResponse(
        "Add a Claude_API_Key secret in Replit Secrets and restart the API server to enable the city guide.",
      ),
    );
    return;
  }

  const requestedSettings = parsed.data.settings ?? {};
  const settings = {
    maxOutputTokens:
      requestedSettings.maxOutputTokens ?? defaultSettings.maxOutputTokens,
  };
  const model = process.env.CLAUDE_MODEL || defaultModel;
  const messages = [
    ...(parsed.data.history ?? []).map(({ role, content }) => ({
      role,
      content,
    })),
    {
      role: "user" as const,
      content: parsed.data.message,
    },
  ];

  try {
    const anthropic = new Anthropic({
      apiKey,
      timeout: 20_000,
    });
    const response = await anthropic.messages.create({
      model,
      max_tokens: settings.maxOutputTokens,
      system: citySystemPrompt,
      messages,
    });

    const reply = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();
    if (!reply) {
      req.log.warn("Claude returned no text");
      res.status(502).json(
        makeErrorResponse(
          "The guide could not create a reply. Please try another question.",
        ),
      );
      return;
    }

    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;

    res.json(
      SendCityChatResponse.parse({
        reply,
        usage: {
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          truncated: response.stop_reason === "max_tokens",
        },
        settings: { maxOutputTokens: settings.maxOutputTokens },
        model: response.model,
      }),
    );
  } catch (error) {
    // Log only safe diagnostics; never log provider messages or credentials.
    const providerError =
      error && typeof error === "object"
        ? (error as { status?: unknown; statusCode?: unknown })
        : {};
    const providerStatus =
      typeof providerError.status === "number"
        ? providerError.status
        : typeof providerError.statusCode === "number"
          ? providerError.statusCode
          : undefined;
    req.log.error(
      {
        providerErrorName: error instanceof Error ? error.name : "UnknownError",
        providerStatus,
      },
      "Claude chat request failed",
    );
    res.status(502).json(
      makeErrorResponse(
        "The guide could not reach Claude. Please try again in a moment.",
      ),
    );
  }
});

export default router;

