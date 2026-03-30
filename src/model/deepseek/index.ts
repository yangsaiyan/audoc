import OpenAI from "openai";
import { PROMPT } from "../../constants/prompt";

export async function generateDocumentationWithDeepSeek(
  text: string,
  apiKey: string | null,
  language: string,
  model: string = "deepseek-chat",
): Promise<string> {
  if (!apiKey) {
    throw new Error("DeepSeek API key is not set");
  }

  const openai = new OpenAI({
    baseURL: "https://api.deepseek.com",
    apiKey: apiKey,
  });

  const response = await openai.chat.completions.create({
    model: model,
    messages: [
      {
        role: "system",
        content: PROMPT(language, text),
      },
    ],
  });

  const documentation = response?.choices[0]?.message?.content ?? "";
  return documentation?.length > 0 ? documentation + "\n" : "";
}
