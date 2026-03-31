export namespace ConfigKey {
  export type modelConfigKeyType =
    | modelConfigKey.GeminiModel
    | modelConfigKey.ChatgptModel
    | modelConfigKey.DeepseekModel
    | modelConfigKey.AnthropicModel;

  export enum modelConfigKey {
    GeminiModel = "geminiModel",
    ChatgptModel = "chatgptModel",
    DeepseekModel = "deepseekModel",
    AnthropicModel = "anthropicModel",
  }
}
