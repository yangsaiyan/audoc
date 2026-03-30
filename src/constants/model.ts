import {
  GeminiModel,
  ChatGPTModel,
  DeepSeekModel,
} from "../model/type.ts/models";

export const GEMINI_MODELS: GeminiModel[] = Object.values(GeminiModel);

export const CHATGPT_MODELS: ChatGPTModel[] = Object.values(ChatGPTModel);

export const DEEPSEEK_MODELS: DeepSeekModel[] = Object.values(DeepSeekModel);
