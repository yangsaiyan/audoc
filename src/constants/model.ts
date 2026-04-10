import {
  GeminiModel,
  ChatGPTModel,
  DeepSeekModel,
  AnthropicModel,
} from "../model/type.ts/models";
import { AIProvider } from "../model/type.ts/aiProvider";

export const GEMINI_MODELS: GeminiModel[] = Object.values(GeminiModel);

export const CHATGPT_MODELS: ChatGPTModel[] = Object.values(ChatGPTModel);

export const DEEPSEEK_MODELS: DeepSeekModel[] = Object.values(DeepSeekModel);

export const ANTHROPIC_MODELS: AnthropicModel[] = Object.values(AnthropicModel);

export const PROVIDER_MODELS_MAP: Record<AIProvider, string[]> = {
  [AIProvider.GoogleGemini]: GEMINI_MODELS,
  [AIProvider.ChatGPT]: CHATGPT_MODELS,
  [AIProvider.DeepSeek]: DEEPSEEK_MODELS,
  [AIProvider.Anthropic]: ANTHROPIC_MODELS,
  [AIProvider.Ollama]: [],
};
