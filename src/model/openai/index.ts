import OpenAI from "openai";

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
    input: `
      Please generate documentation for the following code in ${language}:

      Code: ${text}

      Follow the documentation style for the following programming languages:
      TypeScript / JavaScript	TSDoc / JSDoc
      Go	Godoc
      Python	Docstring (PEP 257)
      Java	Javadoc
      C++	Doxygen
      C	Doxygen 
      Rust	Rustdoc
      PHP	PHPDoc
      Swift	Markdown-style documentation
      Kotlin	KDoc
      HTML	no specific style, but should be clear and concise

      Remark: 
      -Make sure it is commented in the same style as the code, and do not add any additional text or explanation. 
      -Return only the documentation, return original code is not needed.
      -Do not return language-specific code comments if the original code does not have them, just return the documentation content.
      -Make sure it can be directly used as code comments on IDE.
      `,
    store: true,
  });

  const documentation = response.output_text ?? "";
  return documentation?.length > 0 ? documentation + "\n" : "";
}
