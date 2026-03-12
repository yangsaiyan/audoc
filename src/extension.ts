import * as vscode from "vscode";
import {
  clearApiKey,
  generateDocumentation,
  resetApiKey,
  selectModel,
  setApiKey,
} from "./model";
import { GEMINI_MODELS, CHATGPT_MODELS } from "./constants/model";

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
        vscode.window.showWarningMessage("No text selected");
        return;
      }

      vscode.window.showInformationMessage("Generating documentation...");

      try {
        const documentation = await generateDocumentation(text, context);
        if (!documentation) {
          vscode.window.showErrorMessage("No documentation generated");
          return;
        }
        editor.edit((editBuilder) => {
          editBuilder.insert(selection.start, documentation || "");
        });
      } catch (error) {
        console.error("Error generating documentation:", error);
        vscode.window.showErrorMessage("Error generating documentation");
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

  constructor(private readonly context: vscode.ExtensionContext) {}

  resolveWebviewView(webviewView: vscode.WebviewView): void {
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
            vscode.window.showWarningMessage("API key cannot be empty");
            return;
          }
          await this.context.secrets.store("audoc.apiKey", value);
          vscode.window.showInformationMessage("API key stored securely");
          break;
        }
        case "clearApiKey": {
          await this.context.secrets.delete("audoc.apiKey");
          vscode.window.showInformationMessage("API key cleared successfully");
          break;
        }
        case "resetApiKey": {
          await this.context.secrets.delete("audoc.apiKey");
          vscode.window.showInformationMessage(
            "API key cleared. Enter a new key to save it.",
          );
          break;
        }
        case "setLanguage": {
          const config = vscode.workspace.getConfiguration("audoc");
          await config.update("documentationLanguage", message.value, vscode.ConfigurationTarget.Global);
          vscode.window.showInformationMessage(`Language set to: ${message.value}`);
          break;
        }
        case "setProvider": {
          const config = vscode.workspace.getConfiguration("audoc");
          await config.update("aiProvider", message.value, vscode.ConfigurationTarget.Global);
          // Send updated models for the selected provider
          this.sendModelsForProvider(webview, message.value);
          vscode.window.showInformationMessage(`AI Provider set to: ${message.value}`);
          break;
        }
        case "setModel": {
          const config = vscode.workspace.getConfiguration("audoc");
          const provider = config.get<string>("aiProvider");
          const configKey = provider === "Google Gemini" ? "geminiModel" : "chatgptModel";
          await config.update(configKey, message.value, vscode.ConfigurationTarget.Global);
          vscode.window.showInformationMessage(`Model set to: ${message.value}`);
          break;
        }
        default:
          break;
      }
    });
  }

  private async sendInitialConfig(webview: vscode.Webview): Promise<void> {
    const config = vscode.workspace.getConfiguration("audoc");
    const currentLanguage = config.get<string>("documentationLanguage") || "";
    const currentProvider = config.get<string>("aiProvider") || "Google Gemini";
    
    webview.postMessage({
      type: "initialize",
      data: {
        languages: [
          "English",
          "简体中文",
          "繁體中文",
          "Español",
          "Français",
          "Deutsch",
          "日本語",
          "한국어",
          "Português",
          "Русский",
          "Italiano",
          "Nederlands"
        ],
        providers: ["Google Gemini", "ChatGPT"],
        currentLanguage,
        currentProvider
      }
    });

    this.sendModelsForProvider(webview, currentProvider);
  }

  private sendModelsForProvider(webview: vscode.Webview, provider: string): void {
    const config = vscode.workspace.getConfiguration("audoc");
    let models: string[] = [];
    let currentModel = "";

    if (provider === "Google Gemini") {
      models = GEMINI_MODELS;
      currentModel = config.get<string>("geminiModel") || "gemini-3-flash-preview";
    } else if (provider === "ChatGPT") {
      models = CHATGPT_MODELS;
      currentModel = config.get<string>("chatgptModel") || "gpt-5-nano";
    }

    webview.postMessage({
      type: "updateModels",
      data: {
        models,
        currentModel
      }
    });
  }

  private getHtml(): string {
    return /* html */ `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';"
    />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Audoc</title>
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
    <h3>Audoc Configuration</h3>
    
    <div class="section">
      <div class="field-label">Documentation Language</div>
      <select id="languageSelect">
        <option value="">Select language...</option>
      </select>
    </div>

    <div class="section">
      <div class="field-label">AI Provider</div>
      <select id="providerSelect">
        <option value="">Select provider...</option>
      </select>
    </div>

    <div class="section">
      <div class="field-label">Model</div>
      <select id="modelSelect">
        <option value="">Select model...</option>
      </select>
    </div>

    <div class="section">
      <div class="field-label">API Key (stored securely)</div>
      <input id="apiKeyInput" type="password" placeholder="Enter API key..." autocomplete="off" />
      <div class="buttons">
        <button id="saveButton">Save</button>
        <button id="clearButton" class="secondary">Clear</button>
        <button id="resetButton" class="secondary">Reset</button>
      </div>
    </div>

    <script>
      const vscode = acquireVsCodeApi();

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
            populateLanguages(message.data.languages, message.data.currentLanguage);
            populateProviders(message.data.providers, message.data.currentProvider);
            break;
          case 'updateModels':
            populateModels(message.data.models, message.data.currentModel);
            break;
        }
      });

      function populateLanguages(languages, currentLanguage) {
        languageSelect.innerHTML = '<option value="">Select language...</option>';
        languages.forEach(lang => {
          const option = document.createElement('option');
          option.value = lang;
          option.textContent = lang;
          option.selected = lang === currentLanguage;
          languageSelect.appendChild(option);
        });
      }

      function populateProviders(providers, currentProvider) {
        providerSelect.innerHTML = '<option value="">Select provider...</option>';
        providers.forEach(provider => {
          const option = document.createElement('option');
          option.value = provider;
          option.textContent = provider;
          option.selected = provider === currentProvider;
          providerSelect.appendChild(option);
        });
      }

      function populateModels(models, currentModel) {
        modelSelect.innerHTML = '<option value="">Select model...</option>';
        models.forEach(model => {
          const option = document.createElement('option');
          option.value = model;
          option.textContent = model;
          option.selected = model === currentModel;
          modelSelect.appendChild(option);
        });
      }

      // Event listeners
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
