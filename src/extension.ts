import * as vscode from "vscode";
import {
  clearApiKey,
  generateDocumentation,
  selectModel,
  setApiKey,
} from "./model";
import { t } from "./ui/i18n";
import { AudocWebviewViewProvider } from "./webviews/AudocWebviewViewProvider";

export function activate(context: vscode.ExtensionContext) {
  const generateDocDisposable = getGenerateDocDisposable(context);
  const selectModelDisposable = getSelectModelDisposable();
  const setApiKeyDisposable = getSetApiKeyDisposable(context);
  const clearApiKeyDisposable = getClearApiKeyDisposable(context);
  const audocViewDisposable = getAudocWebviewDisposable(context);

  registerDisposables(context, [
    generateDocDisposable,
    selectModelDisposable,
    setApiKeyDisposable,
    clearApiKeyDisposable,
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
        const languageId = editor.document.languageId;
        const documentation = await generateDocumentation(
          text,
          context,
          languageId,
        );
        if (!documentation) {
          vscode.window.showErrorMessage(t("error.noDocumentationGenerated"));
          return;
        }
        editor.edit((editBuilder) => {
          editBuilder.insert(selection.start, documentation || "");
        });
      } catch (error) {
        vscode.window.showErrorMessage(
          `${t("error.errorGeneratingDocumentation")}: ${
            error instanceof Error ? error.message : String(error)
          }`,
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

function getAudocWebviewDisposable(context: vscode.ExtensionContext) {
  const provider = new AudocWebviewViewProvider(context);
  return vscode.window.registerWebviewViewProvider("audocView", provider);
}

function registerDisposables(
  context: vscode.ExtensionContext,
  disposables: vscode.Disposable[],
) {
  context.subscriptions.push(...disposables);
}

export function deactivate() {}
