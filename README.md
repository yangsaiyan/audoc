# Audoc

Audoc is a Visual Studio Code extension that generates documentation from selected code or text using configurable AI providers.

## Features

- **Generate documentation** from the current editor selection via the command palette or the editor context menu.
- **Audoc sidebar** for managing your API key, documentation language, AI provider, and model.
- **Configurable interface language** — Audoc's UI defaults to English and does not follow VS Code's display language. Change it from the sidebar or `audoc.uiLanguage` in settings.

## Supported AI providers

| Provider | Setting key for model |
|---|---|
| Google Gemini | `audoc.geminiModel` |
| ChatGPT | `audoc.chatgptModel` |
| DeepSeek | `audoc.deepseekModel` |
| Anthropic (Claude) | `audoc.anthropicModel` |

## Usage

1. Open the **Audoc** view from the activity bar.
2. Enter and save your **API key** for the provider you want to use (stored in VS Code's secret storage).
3. Select **documentation language**, **AI provider**, and **model**.
4. Select text in an editor and run **Audoc: Generate Documentation** (or right-click → **Generate Documentation**).

## Settings

| Setting | Description |
|---|---|
| `audoc.uiLanguage` | Language for Audoc's UI. Supported: `en`, `zh-tw`, `zh-cn`, `es`, `fr`. Default: `en`. |
| `audoc.documentationLanguage` | Language used in the generated documentation text. |
| `audoc.aiProvider` | AI provider to use: `Google Gemini`, `ChatGPT`, `DeepSeek`, or `Anthropic`. |
| `audoc.geminiModel` | Model when the provider is Google Gemini. |
| `audoc.chatgptModel` | Model when the provider is ChatGPT. |
| `audoc.deepseekModel` | Model when the provider is DeepSeek. |
| `audoc.anthropicModel` | Model when the provider is Anthropic. |

## Requirements

- A valid API key for the AI provider you select.
- Network access to the provider's API endpoint.

## Development

```bash
yarn install
yarn compile
```

Press **F5** in VS Code to launch the Extension Development Host with Audoc loaded.

## Release notes

### 0.0.1

Initial release.
