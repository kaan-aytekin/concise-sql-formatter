// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const formatSQL = require("./sqlFormatter");

/**
 * @typedef {import('./sqlFormatter').FormatterConfigs} FormatterConfigs
 */

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

/**
 * @param {string} extensionName
 * @param {string} settingName
 * @param {any} defaultValue
 */
const getExtensionSettings = (extensionName, settingName, defaultValue) => {
  const extensionSettings = vscode.workspace.getConfiguration(
    extensionName,
    null
  );
  const editor = vscode.window.activeTextEditor;
  const language = editor && editor.document && editor.document.languageId;
  const languageSettings =
    language &&
    vscode.workspace.getConfiguration(null, null).get(`[${language}]`);
  let value =
    languageSettings && languageSettings[`${extensionName}.${settingName}`];
  if (value == null) {
    value = extensionSettings.get(settingName, defaultValue);
  }
  return value == null ? defaultValue : value;
};

/**
 * @param {Object} params
 * @param {boolean} params.insertSpaces
 * @param {number} params.tabSize
 */
const getFormatterConfigs = ({ insertSpaces, tabSize }) => ({
  indent: insertSpaces ? " ".repeat(tabSize) : "\t",
  language: getExtensionSettings("concise-sql-formatter", "dialect", "sql"),
  uppercase: getExtensionSettings("concise-sql-formatter", "uppercase", true),
  linesBetweenQueries: getExtensionSettings(
    "concise-sql-formatter",
    "linesBetweenQueries",
    2
  ),
});

/**
 * @param {string} text
 * @param {FormatterConfigs} formatterConfigs
 */
const format = (text, formatterConfigs) => formatSQL(text, formatterConfigs);

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  // The command has been defined in the package.json file
  // Now provide the implementation of the command with  registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.languages.registerDocumentRangeFormattingEditProvider(
    "sql",
    {
      provideDocumentRangeFormattingEdits: (document, range, options) => [
        vscode.TextEdit.replace(
          range,
          format(document.getText(range), getFormatterConfigs(options))
        ),
      ],
    }
  );
  context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
