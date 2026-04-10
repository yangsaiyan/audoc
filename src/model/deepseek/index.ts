import OpenAI from "openai";
import { PROMPT } from "../../constants/prompt";
import { DEEPSEEK_MODELS } from "../../constants/model";

export async function generateDocumentationWithDeepSeek(
  text: string,
  apiKey: string,
  language: string,
  model: string = DEEPSEEK_MODELS[0],
  languageId: string = "plaintext",
): Promise<string> {
  const openai = new OpenAI({
    baseURL: "https://api.deepseek.com",
    apiKey: apiKey,
  });

  const response = await openai.chat.completions.create({
    model: model,
    messages: [
      {
        role: "system",
        content: PROMPT(language, text, languageId),
      },
    ],
  });

  const documentation = response?.choices[0]?.message?.content ?? "";
  return documentation?.length > 0 ? documentation + "\n" : "";
}
