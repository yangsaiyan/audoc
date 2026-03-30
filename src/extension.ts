import * as vscode from "vscode";
import {
  clearApiKey,
  generateDocumentation,
  resetApiKey,
  selectModel,
  setApiKey,
} from "./model";
import {
  GEMINI_MODELS,
  CHATGPT_MODELS,
  DEEPSEEK_MODELS,
} from "./constants/model";
import { LANGUAGES } from "./constants/language";
import { AI_PROVIDERS } from "./constants/provider";
import { Language } from "./model/type.ts/languages";
import { AIProvider } from "./model/type.ts/aiProvider";
import {
  ChatGPTModel,
  DeepSeekModel,
  GeminiModel,
} from "./model/type.ts/models";
import { UI_LANGUAGE_OPTIONS } from "./constants/uiLocale";
import { t } from "./ui/i18n";

export function activate(context: vscode.ExtensionContext) {
  const generateDocDisposable = getGenerateDocDisposable(context);
  const selectModelDisposable = getSelectModelDisposable();
  const setApiKeyDisposable = getSetApiKeyDisposable(context);
  const clearApiKeyDisposable = getClearApiKeyDisposable(context);
  const resetApiKeyDisposable = getResetApiKeyDisposable(context);
  const audocViewDisposable = getAudocWebviewDisposable(context);

  registerDisposables(context, [
    generateDocDisposable,
    selectModelDisposable,
    setApiKeyDisposable,
    clearApiKeyDisposable,
    resetApiKeyDisposable,
    audocViewDisposable,
  ]);
}

function getGenerateDocDisposable(context: vscode.ExtensionContext) {
  return vscode.commands.registerCommand(
    "audoc.generateDocumentation",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const selection = editor.selection;
      const text = editor.document.getText(selection);

      if (!text) {
        vscode.window.showWarningMessage(t("error.noTextSelected"));
        return;
      }

      vscode.window.showInformationMessage(t("info.generatingDocumentation"));

      try {
        const documentation = await generateDocumentation(text, context);
        if (!documentation) {
          vscode.window.showErrorMessage(t("error.noDocumentationGenerated"));
          return;
        }
        editor.edit((editBuilder) => {
          editBuilder.insert(selection.start, documentation || "");
        });
      } catch (error) {
        vscode.window.showErrorMessage(
          t("error.errorGeneratingDocumentation"),
        );
        return;
      }
    },
  );
}

function getSelectModelDisposable() {
  return vscode.commands.registerCommand("audoc.selectModel", selectModel);
}

function getSetApiKeyDisposable(context: vscode.ExtensionContext) {
  return vscode.commands.registerCommand("audoc.setApiKey", () =>
    setApiKey(context),
  );
}

function getClearApiKeyDisposable(context: vscode.ExtensionContext) {
  return vscode.commands.registerCommand("audoc.clearApiKey", () =>
    clearApiKey(context),
  );
}

function getResetApiKeyDisposable(context: vscode.ExtensionContext) {
  return vscode.commands.registerCommand("audoc.resetApiKey", () =>
    resetApiKey(context),
  );
}

function getAudocWebviewDisposable(context: vscode.ExtensionContext) {
  const provider = new AudocWebviewViewProvider(context);
  return vscode.window.registerWebviewViewProvider("audocView", provider);
}

class AudocWebviewViewProvider implements vscode.WebviewViewProvider {
  static readonly viewType = "audocView";

  private _view?: vscode.WebviewView;

  constructor(private readonly context: vscode.ExtensionContext) {
    context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration("audoc.uiLanguage") && this._view) {
          this._view.webview.html = this.getHtml();
          void this.sendInitialConfig(this._view.webview);
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

    webview.html = this.getHtml();

    this.sendInitialConfig(webview);

    webview.onDidReceiveMessage(async (message) => {
      switch (message.type) {
        case "setApiKey": {
          const value = String(message.value ?? "").trim();
          if (!value) {
            vscode.window.showWarningMessage(t("warning.apiKeyCannotBeEmpty"));
            return;
          }
          await this.context.secrets.store("audoc.apiKey", value);
          vscode.window.showInformationMessage(t("success.apiKeyStoredSecurely"));
          break;
        }
        case "clearApiKey": {
          await this.context.secrets.delete("audoc.apiKey");
          vscode.window.showInformationMessage(
            t("success.apiKeyClearedSuccessfully"),
          );
          break;
        }
        case "resetApiKey": {
          await this.context.secrets.delete("audoc.apiKey");
          vscode.window.showInformationMessage(
            t("success.apiKeyResetSuccessfully"),
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
          const label =
            UI_LANGUAGE_OPTIONS.find((o) => o.value === message.value)
              ?.label ?? String(message.value);
          vscode.window.showInformationMessage(
            t("success.uiLanguageSetTo", label),
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
          vscode.window.showInformationMessage(
            t("success.languageSetTo", String(message.value)),
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
          // Send updated models for the selected provider
          this.sendModelsForProvider(webview, message.value);
          vscode.window.showInformationMessage(
            t("success.providerSetTo", String(message.value)),
          );
          break;
        }
        case "setModel": {
          const config = vscode.workspace.getConfiguration("audoc");
          const provider = config.get<string>("aiProvider");
          let configKey: "geminiModel" | "chatgptModel" | "deepseekModel";
          if (provider === AIProvider.GoogleGemini) {
            configKey = "geminiModel";
          } else if (provider === AIProvider.ChatGPT) {
            configKey = "chatgptModel";
          } else if (provider === AIProvider.DeepSeek) {
            configKey = "deepseekModel";
          } else {
            configKey = "geminiModel";
          }
          await config.update(
            configKey,
            message.value,
            vscode.ConfigurationTarget.Global,
          );
          vscode.window.showInformationMessage(
            t("success.modelSetTo", String(message.value)),
          );
          break;
        }
        default:
          break;
      }
    });
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
        currentUILanguage,
        languages: LANGUAGES,
        providers: AI_PROVIDERS,
        currentLanguage,
        currentProvider,
      },
    });

    this.sendModelsForProvider(webview, currentProvider);
  }

  private sendModelsForProvider(
    webview: vscode.Webview,
    provider: string,
  ): void {
    const config = vscode.workspace.getConfiguration("audoc");
    let models: string[] = [];
    let currentModel = "";

    switch (provider) {
      case AIProvider.GoogleGemini:
        models = GEMINI_MODELS;
        currentModel =
          config.get<GeminiModel>("geminiModel") ||
          GeminiModel.Gemini3_FlashPreview;
        break;
      case AIProvider.ChatGPT:
        models = CHATGPT_MODELS;
        currentModel =
          config.get<ChatGPTModel>("chatgptModel") ||
          ChatGPTModel.GPT5_Nano_2025_08_07;
        break;
      case AIProvider.DeepSeek:
        models = DEEPSEEK_MODELS;
        currentModel =
          config.get<DeepSeekModel>("deepseekModel") ||
          DeepSeekModel.DeepSeekChat;
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
    const labelReset = t("html.labelReset");

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
        <button id="resetButton" class="secondary">${labelReset}</button>
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

function registerDisposables(
  context: vscode.ExtensionContext,
  disposables: vscode.Disposable[],
) {
  context.subscriptions.push(...disposables);
}

export function deactivate() {}
