import { Ollama } from "ollama";
import { PROMPT } from "../../constants/prompt";

export async function generateDocumentationWithOllama(
  text: string,
  language: string,
  model: string = "",
  languageId: string = "plaintext",
): Promise<string> {

  const ollama = new Ollama({ host: "http://127.0.0.1:11434" });
  const response = await ollama.chat({
    model: model,
    messages: [{ role: "user", content: PROMPT(language, text, languageId) }],
  });

  const documentation = response?.message?.content;
  return documentation?.length > 0 ? documentation + "\n" : "";
}
