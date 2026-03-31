import OpenAI from "openai";
import { PROMPT } from "../../constants/prompt";
import { CHATGPT_MODELS } from "../../constants/model";

export async function generateDocumentationWithChatGPT(
  text: string,
  apiKey: string,
  language: string,
  model: string = CHATGPT_MODELS[0],
): Promise<string> {
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
