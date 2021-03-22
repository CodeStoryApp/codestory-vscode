import * as vscode from "vscode";

export interface IParsedToken {
  line: number;
  startCharacter: number;
  length: number;
  tokenType: string;
  tokenModifiers: string[];
}

export const tokenTypes = new Map<string, number>();
export const tokenModifiers = new Map<string, number>();
export const tokenRePattern = "#[a-zA-Z0-9]{5}#";

const CODESTORY_TYPE = "codestory";
const codestoryTokenRegExp = new RegExp(tokenRePattern);


// The legend is some kind of required index for the semantic #hKl5z#
// tokens that are used.
export const legend = (function () {
  const tokenTypesLegend = [CODESTORY_TYPE];
  // Not really useful at the moment, may be in the future.
  tokenTypesLegend.forEach((tokenType, index) =>
    tokenTypes.set(tokenType, index)
  );

  // Not really useful either. Modifiers are not used at the moment.
  const tokenModifiersLegend = ["default"];
  tokenModifiersLegend.forEach((tokenModifier, index) =>
    tokenModifiers.set(tokenModifier, index)
  );

  return new vscode.SemanticTokensLegend(
    tokenTypesLegend,
    tokenModifiersLegend
  );
})();

// a DocumentSemanticTokensProvider #zsV75#
// like https://github.com/microsoft/vscode-extension-samples/blob/main/semantic-tokens-sample/src/extension.ts
export class DocumentSemanticTokensProvider
  implements vscode.DocumentSemanticTokensProvider {
  async provideDocumentSemanticTokens(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): Promise<vscode.SemanticTokens> {
    const allTokens = this._parseText(document.getText());
    const builder = new vscode.SemanticTokensBuilder();
    allTokens.forEach((token) => {
      builder.push(
        token.line,
        token.startCharacter,
        token.length,
        this._encodeTokenType(token.tokenType),
        this._encodeTokenModifiers(token.tokenModifiers)
      );
    });
    return builder.build();
  }

  private _encodeTokenType(tokenType: string): number {
    if (tokenTypes.has(tokenType)) {
      return tokenTypes.get(tokenType)!;
    } else if (tokenType === "notInLegend") {
      return tokenTypes.size + 2;
    }
    return 0;
  }

  private _encodeTokenModifiers(strTokenModifiers: string[]): number {
    let result = 0;
    for (let i = 0; i < strTokenModifiers.length; i++) {
      const tokenModifier = strTokenModifiers[i];
      if (tokenModifiers.has(tokenModifier)) {
        result = result | (1 << tokenModifiers.get(tokenModifier)!);
      } else if (tokenModifier === "notInLegend") {
        result = result | (1 << (tokenModifiers.size + 2));
      }
    }
    return result;
  }

  private _parseText(text: string): IParsedToken[] {
    const r: IParsedToken[] = [];

    // Use the codestoryTokenRegExp on each line of the document #wrNQb#
    const lines = text.split(/\r\n|\r|\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const result = codestoryTokenRegExp.exec(line);
      if (result) {
        r.push({
          line: i,
          startCharacter: result.index,
          length: 7,
          tokenType: CODESTORY_TYPE,
          tokenModifiers: [],
        });
      }
    }
    return r;
  }
}
