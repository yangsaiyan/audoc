import * as vscode from "vscode";
import { AIProvider } from "./type.ts/aiProvider";
import { generateDocumentationWithGemini } from "./gemini/index";
import {
  CHATGPT_MODELS,
  DEEPSEEK_MODELS,
  GEMINI_MODELS,
  ANTHROPIC_MODELS,
} from "../constants/model";
import { DeepSeekModel } from "./type.ts/models";
import { generateDocumentationWithChatGPT } from "./openai";
import { generateDocumentationWithDeepSeek } from "./deepseek";
import { t } from "../ui/i18n";
import { ConfigKey } from "./type.ts/configKey";
import { generateDocumentationWithAnthropic } from "./anthropic";

export async function generateDocumentation(
  text: string,
  context: vscode.ExtensionContext,
  languageId: string,
) {
  const provider = getAIProvider();
  const apiKey = await getApiKey(context);
  const language = getDocumentationLanguage();
  const model = getModel();

  if (!apiKey) {
    vscode.window.showWarningMessage(t("error.apiKeyNotSet"));
    return;
  }

  if (!text || text.trim().length === 0) {
    vscode.window.showWarningMessage(t("error.noTextSelected"));
    return;
  }

  switch (provider) {
    case AIProvider.GoogleGemini:
      return await generateDocumentationWithGemini(
        text,
        apiKey,
        language,
        model,
        languageId,
      );
    case AIProvider.ChatGPT:
      return await generateDocumentationWithChatGPT(
        text,
        apiKey,
        language,
        model,
        languageId,
      );
    case AIProvider.DeepSeek:
      return await generateDocumentationWithDeepSeek(
        text,
        apiKey,
        language,
        model,
        languageId,
      );
    case AIProvider.Anthropic:
      return await generateDocumentationWithAnthropic(
        text,
        apiKey,
        language,
        model,
        languageId,
      );
    default:
      vscode.window.showErrorMessage(t("error.selectedAIProviderNotSupported"));
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
    case AIProvider.DeepSeek: {
      const model = config.get<string>("deepseekModel");
      if (
        model &&
        DEEPSEEK_MODELS.includes(model as (typeof DEEPSEEK_MODELS)[number])
      ) {
        return model;
      }
      return DeepSeekModel.DeepSeekChat;
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
        prompt: t("prompt.apiKey"),
        placeHolder: t("placeholder.apiKeySecure"),
        password: true,
        ignoreFocusOut: true,
        validateInput: (value: string) => {
          if (!value || value.trim().length === 0) {
            return t("validation.apiKeyEmpty");
          }
          return null;
        },
      });

      if (!apiKey?.trim()) {
        vscode.window.showWarningMessage(t("warning.apiKeyRequired"));
        return undefined;
      }

      await context.secrets.store("audoc.apiKey", apiKey.trim());
      vscode.window.showInformationMessage(t("success.apiKeyStoredSecurely"));
    }

    return apiKey;
  } catch (error) {
    vscode.window.showErrorMessage(
      t("error.failedRetrieveApiKey", String(error)),
    );
    return undefined;
  }
}

export async function setApiKey(
  context: vscode.ExtensionContext,
): Promise<void> {
  try {
    const apiKey = await vscode.window.showInputBox({
      prompt: t("prompt.apiKey"),
      placeHolder: t("placeholder.apiKeySecure"),
      password: true,
      ignoreFocusOut: true,
      validateInput: (value: string) => {
        if (!value || value.trim().length === 0) {
          return t("validation.apiKeyEmpty");
        }
        return null;
      },
    });

    if (!apiKey?.trim()) {
      vscode.window.showWarningMessage(t("warning.apiKeyNotUpdated"));
      return;
    }

    await context.secrets.store("audoc.apiKey", apiKey.trim());
    vscode.window.showInformationMessage(t("success.apiKeyStoredSecurely"));
  } catch (error) {
    vscode.window.showErrorMessage(t("error.failedSetApiKey", String(error)));
  }
}

export async function clearApiKey(
  context: vscode.ExtensionContext,
): Promise<void> {
  try {
    await context.secrets.delete("audoc.apiKey");
    vscode.window.showInformationMessage(
      t("success.apiKeyClearedSuccessfully"),
    );
  } catch (error) {
    vscode.window.showErrorMessage(t("error.failedClearApiKey", String(error)));
  }
}

export async function resetApiKey(
  context: vscode.ExtensionContext,
): Promise<void> {
  try {
    await context.secrets.delete("audoc.apiKey");
    const newApiKey = await getApiKey(context);
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
  let configKey: ConfigKey.modelConfigKeyType;
  let providerName: string;

  switch (provider) {
    case AIProvider.GoogleGemini:
      models = GEMINI_MODELS;
      configKey = ConfigKey.modelConfigKey.GeminiModel;
      providerName = "Google Gemini";
      break;
    case AIProvider.ChatGPT:
      models = CHATGPT_MODELS;
      configKey = ConfigKey.modelConfigKey.ChatgptModel;
      providerName = "ChatGPT";
      break;
    case AIProvider.DeepSeek:
      models = DEEPSEEK_MODELS;
      configKey = ConfigKey.modelConfigKey.DeepseekModel;
      providerName = "DeepSeek";
      break;
    case AIProvider.Anthropic:
      models = ANTHROPIC_MODELS;
      configKey = ConfigKey.modelConfigKey.AnthropicModel;
      providerName = "Anthropic";
      break;
    default:
      vscode.window.showErrorMessage(t("error.selectProviderFirst"));
      return;
  }

  const selectedModel = await vscode.window.showQuickPick([...models], {
    placeHolder: t("selectModel.placeholder", providerName),
    ignoreFocusOut: true,
  });

  if (selectedModel) {
    await config.update(
      configKey,
      selectedModel,
      vscode.ConfigurationTarget.Global,
    );
    vscode.window.showInformationMessage(
      t("success.modelSetTo", selectedModel),
    );
  }
}
