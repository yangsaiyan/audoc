import {
  GeminiModel,
  ChatGPTModel,
  DeepSeekModel,
  AnthropicModel,
} from "../model/type.ts/models";

export const GEMINI_MODELS: GeminiModel[] = Object.values(GeminiModel);

export const CHATGPT_MODELS: ChatGPTModel[] = Object.values(ChatGPTModel);

export const DEEPSEEK_MODELS: DeepSeekModel[] = Object.values(DeepSeekModel);

export const ANTHROPIC_MODELS: AnthropicModel[] = Object.values(AnthropicModel);
