import * as vscode from "vscode";
import { AIProvider } from "./type.ts/aiProvider";
import { generateDocumentationWithGemini } from "./gemini/index";
import { CHATGPT_MODELS, GEMINI_MODELS } from "../constants/model";
import { generateDocumentationWithChatGPT } from "./openai";

export async function generateDocumentation(
  text: string,
  context: vscode.ExtensionContext,
) {
  const provider = getAIProvider();
  const apiKey = await getApiKey(context);
  const language = getDocumentationLanguage();
  const model = getModel();

  switch (provider) {
    case AIProvider.GoogleGemini:
      return generateDocumentationWithGemini(
        text,
        apiKey ?? "",
        language,
        model,
      );
    case AIProvider.ChatGPT:
      return generateDocumentationWithChatGPT(
        text,
        apiKey ?? "",
        language,
        model,
      );
    default:
      vscode.window.showErrorMessage(
        "Selected AI provider is not supported yet",
      );
      return "";
  }
}

function getAIProvider() {
  const config = vscode.workspace.getConfiguration("audoc");
  const provider = config.get<AIProvider>("aiProvider");

  return provider;
}

function getDocumentationLanguage() {
  const config = vscode.workspace.getConfiguration("audoc");
  const language = config.get<string>("documentationLanguage") || "English";

  return language;
}

function getModel() {
  const config = vscode.workspace.getConfiguration("audoc");
  const provider = getAIProvider();

  switch (provider) {
    case AIProvider.GoogleGemini: {
      const model = config.get<string>("geminiModel");
      if (
        model &&
        GEMINI_MODELS.includes(model as (typeof GEMINI_MODELS)[number])
      ) {
        return model;
      }
      return "gemini-3-flash-preview";
    }
    case AIProvider.ChatGPT: {
      const model = config.get<string>("chatgptModel");
      if (
        model &&
        CHATGPT_MODELS.includes(model as (typeof CHATGPT_MODELS)[number])
      ) {
        return model;
      }
      return "gpt-5-nano";
    }
    default:
      return "gemini-3-flash-preview";
  }
}

export async function getApiKey(
  context: vscode.ExtensionContext,
): Promise<string | undefined> {
  try {
    let apiKey = await context.secrets.get("audoc.apiKey");

    if (!apiKey) {
      apiKey = await vscode.window.showInputBox({
        prompt: "Enter your API key for documentation generation",
        placeHolder: "API key will be stored securely",
        password: true,
        ignoreFocusOut: true,
        validateInput: (value: string) => {
          if (!value || value.trim().length === 0) {
            return "API key cannot be empty";
          }
          return null;
        },
      });

      if (!apiKey?.trim()) {
        vscode.window.showWarningMessage(
          "API key is required for documentation generation",
        );
        return undefined;
      }

      await context.secrets.store("audoc.apiKey", apiKey.trim());
      vscode.window.showInformationMessage("API key stored securely");
    }

    return apiKey;
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to retrieve API key: ${error}`);
    return undefined;
  }
}

export async function setApiKey(
  context: vscode.ExtensionContext,
): Promise<void> {
  try {
    const apiKey = await vscode.window.showInputBox({
      prompt: "Enter your API key for documentation generation",
      placeHolder: "API key will be stored securely",
      password: true,
      ignoreFocusOut: true,
      validateInput: (value: string) => {
        if (!value || value.trim().length === 0) {
          return "API key cannot be empty";
        }
        return null;
      },
    });

    if (!apiKey?.trim()) {
      vscode.window.showWarningMessage("API key was not updated");
      return;
    }

    await context.secrets.store("audoc.apiKey", apiKey.trim());
    vscode.window.showInformationMessage("API key stored securely");
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to set API key: ${error}`);
  }
}

export async function clearApiKey(
  context: vscode.ExtensionContext,
): Promise<void> {
  try {
    await context.secrets.delete("audoc.apiKey");
    vscode.window.showInformationMessage("API key cleared successfully");
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to clear API key: ${error}`);
  }
}

export async function resetApiKey(
  context: vscode.ExtensionContext,
): Promise<void> {
  try {
    await context.secrets.delete("audoc.apiKey");
    const newApiKey = await getApiKey(context); // This will prompt for new key
    if (newApiKey) {
      vscode.window.showInformationMessage("API key reset successfully");
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to reset API key: ${error}`);
  }
}

export async function selectModel(): Promise<void> {
  const config = vscode.workspace.getConfiguration("audoc");
  const provider = getAIProvider();

  let models: readonly string[];
  let configKey: "geminiModel" | "chatgptModel";
  let providerName: string;

  switch (provider) {
    case AIProvider.GoogleGemini:
      models = GEMINI_MODELS;
      configKey = "geminiModel";
      providerName = "Google Gemini";
      break;
    case AIProvider.ChatGPT:
      models = CHATGPT_MODELS;
      configKey = "chatgptModel";
      providerName = "ChatGPT";
      break;
    default:
      vscode.window.showErrorMessage("Please select an AI provider first");
      return;
  }

  const selectedModel = await vscode.window.showQuickPick([...models], {
    placeHolder: `Select a ${providerName} model`,
    ignoreFocusOut: true,
  });

  if (selectedModel) {
    await config.update(
      configKey,
      selectedModel,
      vscode.ConfigurationTarget.Global,
    );
    vscode.window.showInformationMessage(`Model set to: ${selectedModel}`);
  }
}
