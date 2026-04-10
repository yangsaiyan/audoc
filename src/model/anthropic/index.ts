import Anthropic from "@anthropic-ai/sdk";

import { PROMPT } from "../../constants/prompt";
import { ANTHROPIC_MODELS } from "../../constants/model";

export async function generateDocumentationWithAnthropic(
  text: string,
  apiKey: string,
  language: string,
  model: string = ANTHROPIC_MODELS[0],
  languageId: string = "plaintext",
): Promise<string> {
  const client = new Anthropic({
    apiKey: apiKey,
  });

  const response = await client.messages.create({
    model: model,
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: PROMPT(language, text, languageId),
      },
    ],
  });

  const documentation =
    response.content[0]?.type === "text" ? response.content[0].text : "";
  return documentation?.length > 0 ? documentation + "\n" : "";
}
