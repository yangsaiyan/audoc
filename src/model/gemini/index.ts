import { PROMPT } from "../../constants/prompt";

export async function generateDocumentationWithGemini(
  text: string,
  apiKey: string | null,
  language: string,
  model: string = "gemini-3-flash-preview",
): Promise<string> {
  if (!apiKey) {
    throw new Error("Gemini API key is not set");
  }

  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: model,
    contents: PROMPT(language, text),
  });

  const documentation = response.text ?? "";
  return documentation?.length > 0 ? documentation + "\n" : "";
}
