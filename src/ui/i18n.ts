import * as vscode from "vscode";
import { DEFAULT_UI_LOCALE, type UILocale } from "../constants/uiLocale";
import en from "./locales/en.json";
import zhTw from "./locales/zh-tw.json";
import zhCn from "./locales/zh-cn.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";

type Bundle = Record<string, string>;

function flatten(obj: Record<string, unknown>, prefix = ""): Bundle {
  const out: Bundle = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(out, flatten(v as Record<string, unknown>, key));
    } else if (typeof v === "string") {
      out[key] = v;
    }
  }
  return out;
}

const bundles: Record<UILocale, Bundle> = {
  en: flatten(en as Record<string, unknown>),
  "zh-tw": flatten(zhTw as Record<string, unknown>),
  "zh-cn": flatten(zhCn as Record<string, unknown>),
  es: flatten(es as Record<string, unknown>),
  fr: flatten(fr as Record<string, unknown>),
};

export function getUILocale(): UILocale {
  const v = vscode.workspace
    .getConfiguration("audoc")
    .get<string>("uiLanguage");
  if (v === "zh-tw" || v === "en" || v === "zh-cn" || v === "es" || v === "fr") {
    return v;
  }
  return DEFAULT_UI_LOCALE;
}

export function t(key: string, ...args: (string | number | boolean)[]): string {
  const locale = getUILocale();
  const primary = bundles[locale];
  const fallback = bundles.en;
  let template = primary[key] ?? fallback[key] ?? key;
  args.forEach((arg, i) => {
    template = template.replace(new RegExp(`\\{${i}\\}`, "g"), String(arg));
  });
  return template;
}
