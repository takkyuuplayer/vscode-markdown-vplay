import * as vscode from 'vscode';

export class NotFoundCodeSectionError extends Error {}

/**
 * Runs V code in markdown
 */
export class MarkdownVplay {

    private detectSource = (editor: vscode.TextEditor): [string, number] => {
        const cursorLine = editor.selection.active.line;
        let start: vscode.Position | null = null;

        for(let i = cursorLine; i >= 0; i--) {
            const line =editor.document.lineAt(i);
            if(line.text.trimLeft().startsWith('```v')) {
                start = editor.document.lineAt(i+1).range.start;
                break;
            }
        }

        if (!start) {
            throw new NotFoundCodeSectionError();
        }

        let end: vscode.Position | null = null;

        for(let i = cursorLine; i < editor.document.lineCount; i++) {
            const line =editor.document.lineAt(i);
            if(line.text.trimLeft().startsWith('```')) {
                end = editor.document.lineAt(i+1).range.start;
                break;
            }
        }

        if (!end) {
            throw new NotFoundCodeSectionError();
        }

        const code = editor.document.getText(new vscode.Range(start, end));
        return [code, end.line + 1];
    };
    public run = () => {
        if(!vscode.window.activeTextEditor) {
            return;
        }

        try {
            const editor = vscode.window.activeTextEditor;
            const [code, endLine] = this.detectSource(editor);
        } catch (e ) {
            if(e instanceof NotFoundCodeSectionError) {
                vscode.window.showErrorMessage("Not found go code section.");
            }
        }
    };
}