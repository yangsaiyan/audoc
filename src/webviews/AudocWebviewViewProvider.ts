import * as vscode from "vscode";
import { ConfigKey } from "../model/type.ts/configKey";
import { AIProvider } from "../model/type.ts/aiProvider";
import { Language } from "../model/type.ts/languages";
import { UI_LANGUAGE_OPTIONS } from "../constants/uiLocale";
import { LANGUAGES } from "../constants/language";
import { AI_PROVIDERS } from "../constants/provider";
import {
  ANTHROPIC_MODELS,
  CHATGPT_MODELS,
  DEEPSEEK_MODELS,
  GEMINI_MODELS,
} from "../constants/model";
import {
  AnthropicModel,
  ChatGPTModel,
  DeepSeekModel,
  GeminiModel,
} from "../model/type.ts/models";
import { t } from "../ui/i18n";
import { fetchData } from "../api/http";

export class AudocWebviewViewProvider implements vscode.WebviewViewProvider {
  static readonly viewType = "audocView";

  private _view?: vscode.WebviewView;

  constructor(private readonly context: vscode.ExtensionContext) {
    context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration("audoc.uiLanguage") && this._view) {
          this._view.webview.html = this.getHtml();
        }
      }),
    );
  }

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this._view = webviewView;
    webviewView.onDidDispose(() => {
      this._view = undefined;
    });

    const { webview } = webviewView;

    webview.options = {
      enableScripts: true,
    };

    webview.onDidReceiveMessage(async (message) => {
      switch (message.type) {
        case "webviewReady": {
          this.sendInitialConfig(webview);
          break;
        }
        case "setApiKey": {
          const value = String(message.value ?? "").trim();
          if (!value) {
            vscode.window.showWarningMessage(t("warning.apiKeyCannotBeEmpty"));
            return;
          }
          await this.context.secrets.store("audoc.apiKey", value);
          vscode.window.showInformationMessage(
            t("success.apiKeyStoredSecurely"),
          );
          break;
        }
        case "clearApiKey": {
          await this.context.secrets.delete("audoc.apiKey");
          vscode.window.showInformationMessage(
            t("success.apiKeyClearedSuccessfully"),
          );
          break;
        }
        case "setUiLanguage": {
          const config = vscode.workspace.getConfiguration("audoc");
          await config.update(
            "uiLanguage",
            message.value,
            vscode.ConfigurationTarget.Global,
          );
          break;
        }
        case "setLanguage": {
          const config = vscode.workspace.getConfiguration("audoc");
          await config.update(
            "documentationLanguage",
            message.value,
            vscode.ConfigurationTarget.Global,
          );
          break;
        }
        case "setProvider": {
          const config = vscode.workspace.getConfiguration("audoc");
          await config.update(
            "aiProvider",
            message.value,
            vscode.ConfigurationTarget.Global,
          );
          this.sendModelsForProvider(webview, message.value);
          break;
        }
        case "setModel": {
          const config = vscode.workspace.getConfiguration("audoc");
          const provider = config.get<string>("aiProvider");
          let configKey: ConfigKey.modelConfigKeyType;
          switch (provider) {
            case AIProvider.GoogleGemini:
              configKey = ConfigKey.modelConfigKey.GeminiModel;
              break;
            case AIProvider.ChatGPT:
              configKey = ConfigKey.modelConfigKey.ChatgptModel;
              break;
            case AIProvider.DeepSeek:
              configKey = ConfigKey.modelConfigKey.DeepseekModel;
              break;
            case AIProvider.Anthropic:
              configKey = ConfigKey.modelConfigKey.AnthropicModel;
              break;
            case AIProvider.Ollama:
              configKey = ConfigKey.modelConfigKey.OllamaModel;
              break;
            default:
              configKey = ConfigKey.modelConfigKey.GeminiModel;
              break;
          }
          await config.update(
            configKey,
            message.value,
            vscode.ConfigurationTarget.Global,
          );
          break;
        }
        default:
          break;
      }
    });

    webview.html = this.getHtml();
  }

  private async sendInitialConfig(webview: vscode.Webview): Promise<void> {
    const config = vscode.workspace.getConfiguration("audoc");
    const currentUILanguage = config.get<string>("uiLanguage") || "en";
    const currentLanguage =
      config.get<Language>("documentationLanguage") || Language.English;
    const currentProvider =
      config.get<AIProvider>("aiProvider") || AIProvider.GoogleGemini;
    webview.postMessage({
      type: "initialize",
      data: {
        uiLanguageOptions: UI_LANGUAGE_OPTIONS,
        languages: LANGUAGES,
        providers: AI_PROVIDERS,
        currentUILanguage,
        currentLanguage,
        currentProvider,
      },
    });

    this.sendModelsForProvider(webview, currentProvider);
  }

  private async sendModelsForProvider(
    webview: vscode.Webview,
    provider: string,
  ): Promise<void> {
    const config = vscode.workspace.getConfiguration("audoc");
    let models: string[] = [];
    let currentModel = "";

    switch (provider) {
      case AIProvider.GoogleGemini:
        models = GEMINI_MODELS;
        currentModel =
          config.get<GeminiModel>(ConfigKey.modelConfigKey.GeminiModel) ||
          GeminiModel.Gemini3_FlashPreview;
        break;
      case AIProvider.ChatGPT:
        models = CHATGPT_MODELS;
        currentModel =
          config.get<ChatGPTModel>(ConfigKey.modelConfigKey.ChatgptModel) ||
          ChatGPTModel.GPT5_Nano_2025_08_07;
        break;
      case AIProvider.DeepSeek:
        models = DEEPSEEK_MODELS;
        currentModel =
          config.get<DeepSeekModel>(ConfigKey.modelConfigKey.DeepseekModel) ||
          DeepSeekModel.DeepSeekChat;
        break;
      case AIProvider.Anthropic:
        models = ANTHROPIC_MODELS;
        currentModel =
          config.get<AnthropicModel>(ConfigKey.modelConfigKey.AnthropicModel) ||
          AnthropicModel.ClaudeOpus4_6;
        break;
      case AIProvider.Ollama:
        const fetchedModels = await fetchData(
          "http://localhost:11434/api/tags",
        );
        models = fetchedModels?.models.map(
          (model: any) => model.name,
        ) as string[];
        currentModel =
          config.get<string>(ConfigKey.modelConfigKey.OllamaModel) ||
          (models.length > 0 ? models[0] : "");
        break;
      default:
        models = [];
        currentModel = "";
        break;
    }

    webview.postMessage({
      type: "updateModels",
      data: {
        models,
        currentModel,
      },
    });
  }

  private getHtml(): string {
    const title = t("html.title");
    const heading = t("html.heading");
    const labelUILanguage = t("html.labelUILanguage");
    const labelLanguage = t("html.labelLanguage");
    const labelProvider = t("html.labelProvider");
    const labelModel = t("html.labelModel");
    const labelApiKey = t("html.labelApiKey");
    const placeholderApiKey = t("html.placeholderApiKey");
    const placeholderUILanguage = t("html.placeholderUILanguage");
    const placeholderLanguage = t("html.placeholderLanguage");
    const placeholderProvider = t("html.placeholderProvider");
    const placeholderModel = t("html.placeholderModel");
    const labelSave = t("html.labelSave");
    const labelClear = t("html.labelClear");

    return /* html */ `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';"
    />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <style>
      body {
        font-family: var(--vscode-font-family);
        color: var(--vscode-foreground);
        background-color: var(--vscode-sideBar-background);
        padding: 8px;
      }
      h3 {
        margin-top: 0;
        font-size: 13px;
        margin-bottom: 12px;
      }
      .field-label {
        font-size: 12px;
        margin-bottom: 4px;
        margin-top: 8px;
      }
      input[type="password"] {
        width: 100%;
        box-sizing: border-box;
        padding: 4px 6px;
        margin-bottom: 8px;
        border-radius: 2px;
        border: 1px solid var(--vscode-input-border, var(--vscode-editorWidget-border));
        background-color: var(--vscode-input-background);
        color: var(--vscode-input-foreground);
        font-size: 12px;
      }
      select {
        width: 100%;
        box-sizing: border-box;
        padding: 4px 6px;
        margin-bottom: 8px;
        border-radius: 2px;
        border: 1px solid var(--vscode-input-border, var(--vscode-editorWidget-border));
        background-color: var(--vscode-input-background);
        color: var(--vscode-input-foreground);
        font-size: 12px;
      }
      .buttons {
        display: flex;
        gap: 4px;
        margin-top: 4px;
      }
      button {
        padding: 3px 8px;
        font-size: 12px;
        cursor: pointer;
        border-radius: 2px;
        border: 1px solid var(--vscode-button-border, transparent);
        background-color: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
      }
      button.secondary {
        background-color: var(--vscode-button-secondaryBackground);
        color: var(--vscode-button-secondaryForeground);
      }
      .section {
        margin-bottom: 12px;
      }
    </style>
  </head>
  <body>
    <h3>${heading}</h3>

    <div class="section">
      <div class="field-label">${labelUILanguage}</div>
      <select id="uiLanguageSelect">
        <option value="">${placeholderUILanguage}</option>
      </select>
    </div>
    
    <div class="section">
      <div class="field-label">${labelLanguage}</div>
      <select id="languageSelect">
        <option value="">${placeholderLanguage}</option>
      </select>
    </div>

    <div class="section">
      <div class="field-label">${labelProvider}</div>
      <select id="providerSelect">
        <option value="">${placeholderProvider}</option>
      </select>
    </div>

    <div class="section">
      <div class="field-label">${labelModel}</div>
      <select id="modelSelect">
        <option value="">${placeholderModel}</option>
      </select>
    </div>

    <div class="section">
      <div class="field-label">${labelApiKey}</div>
      <input id="apiKeyInput" type="password" placeholder="${placeholderApiKey}" autocomplete="off" />
      <div class="buttons">
        <button id="saveButton">${labelSave}</button>
        <button id="clearButton" class="secondary">${labelClear}</button>
      </div>
    </div>

    <script>
      const vscode = acquireVsCodeApi();
      const PLACEHOLDER_UI_LANGUAGE = ${JSON.stringify(placeholderUILanguage)};
      const PLACEHOLDER_LANGUAGE = ${JSON.stringify(placeholderLanguage)};
      const PLACEHOLDER_PROVIDER = ${JSON.stringify(placeholderProvider)};
      const PLACEHOLDER_MODEL = ${JSON.stringify(placeholderModel)};

      const uiLanguageSelect = document.getElementById('uiLanguageSelect');
      const languageSelect = document.getElementById('languageSelect');
      const providerSelect = document.getElementById('providerSelect');
      const modelSelect = document.getElementById('modelSelect');
      const apiKeyInput = document.getElementById('apiKeyInput');
      const saveButton = document.getElementById('saveButton');
      const clearButton = document.getElementById('clearButton');
      const resetButton = document.getElementById('resetButton');

      // Handle messages from extension
      window.addEventListener('message', event => {
        const message = event.data;
        
        switch (message.type) {
          case 'initialize':
            populateUILanguages(message.data.uiLanguageOptions, message.data.currentUILanguage);
            populateLanguages(message.data.languages, message.data.currentLanguage);
            populateProviders(message.data.providers, message.data.currentProvider);
            break;
          case 'updateModels':
            populateModels(message.data.models, message.data.currentModel);
            break;
        }
      });

      vscode.postMessage({ type: 'webviewReady' });

      function populateUILanguages(options, current) {
        uiLanguageSelect.innerHTML = '<option value="">' + PLACEHOLDER_UI_LANGUAGE + '</option>';
        (options || []).forEach(function (opt) {
          const option = document.createElement('option');
          option.value = opt.value;
          option.textContent = opt.label;
          option.selected = opt.value === current;
          uiLanguageSelect.appendChild(option);
        });
      }

      function populateLanguages(languages, currentLanguage) {
        languageSelect.innerHTML = '<option value="">' + PLACEHOLDER_LANGUAGE + '</option>';
        languages.forEach(lang => {
          const option = document.createElement('option');
          option.value = lang;
          option.textContent = lang;
          option.selected = lang === currentLanguage;
          languageSelect.appendChild(option);
        });
      }

      function populateProviders(providers, currentProvider) {
        providerSelect.innerHTML = '<option value="">' + PLACEHOLDER_PROVIDER + '</option>';
        providers.forEach(provider => {
          const option = document.createElement('option');
          option.value = provider;
          option.textContent = provider;
          option.selected = provider === currentProvider;
          providerSelect.appendChild(option);
        });
      }

      function populateModels(models, currentModel) {
        modelSelect.innerHTML = '<option value="">' + PLACEHOLDER_MODEL + '</option>';
        models.forEach(model => {
          const option = document.createElement('option');
          option.value = model;
          option.textContent = model;
          option.selected = model === currentModel;
          modelSelect.appendChild(option);
        });
      }

      // Event listeners
      uiLanguageSelect.addEventListener('change', () => {
        if (uiLanguageSelect.value) {
          vscode.postMessage({
            type: 'setUiLanguage',
            value: uiLanguageSelect.value
          });
        }
      });

      languageSelect.addEventListener('change', () => {
        if (languageSelect.value) {
          vscode.postMessage({
            type: 'setLanguage',
            value: languageSelect.value
          });
        }
      });

      providerSelect.addEventListener('change', () => {
        if (providerSelect.value) {
          vscode.postMessage({
            type: 'setProvider',
            value: providerSelect.value
          });
        }
      });

      modelSelect.addEventListener('change', () => {
        if (modelSelect.value) {
          vscode.postMessage({
            type: 'setModel',
            value: modelSelect.value
          });
        }
      });

      saveButton.addEventListener('click', () => {
        vscode.postMessage({
          type: 'setApiKey',
          value: apiKeyInput.value
        });
      });

      clearButton.addEventListener('click', () => {
        apiKeyInput.value = '';
        vscode.postMessage({ type: 'clearApiKey' });
      });

      resetButton.addEventListener('click', () => {
        apiKeyInput.value = '';
        vscode.postMessage({ type: 'resetApiKey' });
      });
    </script>
  </body>
</html>`;
  }
}
