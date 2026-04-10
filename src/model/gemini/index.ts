import { PROMPT } from "../../constants/prompt";
import { GEMINI_MODELS } from "../../constants/model";

export async function generateDocumentationWithGemini(
  text: string,
  apiKey: string,
  language: string,
  model: string = GEMINI_MODELS[0],
  languageId: string = "plaintext",
): Promise<string> {
  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: model,
    contents: PROMPT(language, text, languageId),
  });

  const documentation = response.text ?? "";
  return documentation?.length > 0 ? documentation + "\n" : "";
}
