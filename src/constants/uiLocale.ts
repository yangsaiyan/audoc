export type UILocale = "en" | "zh-tw" | "zh-cn" | "es" | "fr";

export const DEFAULT_UI_LOCALE: UILocale = "en";

export const UI_LANGUAGE_OPTIONS: { value: UILocale; label: string }[] = [
  { value: "en", label: "English" },
  { value: "zh-tw", label: "繁體中文" },
  { value: "zh-cn", label: "简体中文" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
];
