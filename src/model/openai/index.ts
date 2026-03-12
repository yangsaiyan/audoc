import OpenAI from "openai";
import { PROMPT } from "../../constants/prompt";

export async function generateDocumentationWithChatGPT(
  text: string,
  apiKey: string | null,
  language: string,
  model: string = "gpt-4",
): Promise<string> {
  if (!apiKey) {
    throw new Error("ChatGPT API key is not set");
  }

  const openai = new OpenAI({
    apiKey: apiKey,
  });

  const response = await openai.responses.create({
    model: model,
    input: PROMPT(language, text),
    store: true,
  });

  const documentation = response.output_text ?? "";
  return documentation?.length > 0 ? documentation + "\n" : "";
}
