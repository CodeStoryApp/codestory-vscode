import { spawn } from "child_process";
import * as vscode from "vscode";
import {
  DocumentSemanticTokensProvider,
  legend,
  tokenRePattern,
} from "./highlight";

type CommandArgs = { file: string; token: string };
type Platform = "darwin" | "win32" | "linux";
const regex = new RegExp(tokenRePattern);

const defaultPaths: { [k in Platform]: string } = {
  darwin:
    "/Applications/CodeStory.app/Contents/MacOS/CodeStory/Contents/MacOS/CodeStory", // #aN76q#
  win32: "C:/Program Files/CodeStory/CodeStory.exe",
  linux: "/opts/CodeStory.AppImage",
};

// This method is called when the extension is activated.
// This extension is activated the very first time the command is executed.
export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "codestory" is now active!');

  // If not set (first launch), save default installation path in configuration #sEhqP#
  const configuredPath = vscode.workspace
    .getConfiguration()
    .get("codestory.installPath");

  if (!configuredPath) {
    const result = vscode.workspace
      .getConfiguration()
      .update(
        "codestory.installPath",
        defaultPaths[process.platform as Platform],
        true
      );
  }

  // Define and register the "Open in CodeStory command" #csla4#
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "extension.codestory",
      (args: CommandArgs) => {
        const cmd = vscode.workspace
          .getConfiguration()
          .get("codestory.installPath") as string;

        // CodeStory being an electron app, launching it with VSCode default env vars doesn't work!
        // https://stackoverflow.com/questions/51428982/execute-an-electron-app-within-vscode-extension
        const spawn_env = JSON.parse(JSON.stringify(process.env));
        delete spawn_env.ATOM_SHELL_INTERNAL_RUN_AS_NODE;
        delete spawn_env.ELECTRON_RUN_AS_NODE;
        // https://stackoverflow.com/questions/12871740/how-to-detach-a-spawned-child-process-in-a-node-js-script#answer-12871847
        const p = spawn(cmd, ["-f", args.file, "-t", args.token], {
          detached: true,
          env: spawn_env,
          stdio: ['ignore', 'ignore']
        });
        p.on("error", function (error) {
          vscode.window.showErrorMessage("CodeStory error: " + error);
        });
        // Make sure to unref but leave time for possible errors to be received.
        setTimeout(() => p.unref(), 5000)
      }
    )
  );

  // Define and register the hover provider that will be triggered when hovering a CodeStory token. #m6KfW#
  context.subscriptions.push(
    vscode.languages.registerHoverProvider(
      { pattern: "**" }, // any kind of file, no matter the language.
      {
        provideHover(document, position, cancellationToken) {
          // Really need to provide a regex here as languages interpret "words" differently
          // When using just document.getWordRangeAtPosition(position) some languages return
          // the "word" #12345#, some the #12345, and others the word 12345.
          const range = document.getWordRangeAtPosition(position, regex);
          let word = document.getText(range);

          // regex.test(word) would work, but more expensive.
          // If the matching word greater than 7 chars, it's probably a larger chunk of hovered text that contains
          // a CodeStory token.
          // If the matching word is 7 chars longs, then it is necessarily a CodeStory token.
          if (word.length === 7) {
            // Build the arguments we will pass to the command command line.
            const args: CommandArgs = {
              file: document.fileName,
              token: word.slice(1, 6), // #12345# → 12345
            };

            // Encode the command which we're going to insert as a link. #gyR7a#
            const commentCommandUri = vscode.Uri.parse(
              `command:extension.codestory?${encodeURIComponent(
                JSON.stringify(args)
              )}`
            );
            const contents = new vscode.MarkdownString(
              `[Open in CodeStory](${commentCommandUri})`
            );

            // To enable command URIs in Markdown content, the `isTrusted` flag must be set.
            contents.isTrusted = true;

            return new vscode.Hover(contents);
          }
        },
      }
    )
  );

  // In order to highlight the CodeStory tokens, we'll be using Semantic Highlight. #zPdrn#
  // https://code.visualstudio.com/api/language-extensions/semantic-highlight-guide
  context.subscriptions.push(
    vscode.languages.registerDocumentSemanticTokensProvider(
      { scheme: "file" }, // not language-specific, so using the file scheme.
      new DocumentSemanticTokensProvider(),
      legend
    )
  );
}

// This method is called when the extension is deactivated.
// No need to do anything as we have used disposables passed to context.subscriptions.push()
export function deactivate() {}
