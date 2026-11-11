import { GoogleGenAI } from "@google/genai";
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
  temperature: 1,
  topP: 0.95,
  maxOutputTokens: 300,
} as const;

const defaultModel = "gemini-3.8-flash";

function makeErrorResponse(error: string): ErrorResponse {
  return { error };
}

router.get("/chat/system-prompt", (_req, res) => {
  res.json(GetCitySystemPromptResponse.parse({ systemPrompt: citySystemPrompt }));
});

router.post("/chat", async (req, res): Promise<void> => {
  // Validate the full request before checking configuration or calling Gemini.
  const parsed = SendCityChatBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(
      makeErrorResponse(
        "Please check your message and Prompt Lab settings, then try again.",
      ),
    );
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    req.log.warn("Gemini API key is not configured");
    res.status(503).json(
      makeErrorResponse(
        "Add a GEMINI_API_KEY secret in Replit Secrets and restart the API server to enable the city guide.",
      ),
    );
    return;
  }

  const requestedSettings = parsed.data.settings ?? {};
  const settings = {
    temperature: requestedSettings.temperature ?? defaultSettings.temperature,
    topP: requestedSettings.topP ?? defaultSettings.topP,
    maxOutputTokens:
      requestedSettings.maxOutputTokens ?? defaultSettings.maxOutputTokens,
  };
  const model = process.env.GEMINI_MODEL || defaultModel;
  const contents = [
    ...(parsed.data.history ?? []).map(({ role, content }) => ({
      role,
      parts: [{ text: content }],
    })),
    {
      role: "user" as const,
      parts: [{ text: parsed.data.message }],
    },
  ];

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction: citySystemPrompt,
        temperature: settings.temperature,
        topP: settings.topP,
        maxOutputTokens: settings.maxOutputTokens,
      },
    });

    const reply = response.text?.trim();
    if (!reply) {
      req.log.warn("Gemini returned no text");
      res.status(502).json(
        makeErrorResponse(
          "The guide could not create a reply. Please try another question.",
        ),
      );
      return;
    }

    const usage = response.usageMetadata;
    const truncated =
      response.candidates?.some(
        (candidate) => candidate.finishReason === "MAX_TOKENS",
      ) ?? false;

    res.json(
      SendCityChatResponse.parse({
        reply,
        usage: {
          inputTokens: usage?.promptTokenCount ?? null,
          outputTokens: usage?.candidatesTokenCount ?? null,
          totalTokens: usage?.totalTokenCount ?? null,
          truncated,
        },
        settings,
        model,
      }),
    );
  } catch {
    // Keep provider details and credentials out of responses and logs.
    req.log.error("Gemini chat request failed");
    res.status(502).json(
      makeErrorResponse(
        "The guide could not reach Gemini. Please try again in a moment.",
      ),
    );
  }
});

export default router;

