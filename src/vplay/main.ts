import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as child_process from 'child_process';

export class NotFoundCodeSectionError extends Error {}

/**
 * Runs V code in markdown
 */
export class MarkdownVplay {

    private outputChannel: vscode.OutputChannel;
    public constructor() {
        this.outputChannel = vscode.window.createOutputChannel(
            "markdown-vplay"
        );
    }
    private runVCode = (code: string, cwd: string): string => {
        this.outputChannel.clear();
        const codePath = path.join(os.tmpdir(), "main.v");
        fs.writeFileSync(codePath, code);
        const cmd = `v run ${codePath}`;
        this.outputChannel.appendLine(cmd);
        try {
            const buf = child_process.execSync(cmd, { cwd });
            const stdout = buf.toString();
            this.outputChannel.appendLine(stdout);
            return stdout;
        } catch (e) {
            this.outputChannel.append(e.stderr.toString());
            this.outputChannel.show();
            throw e;
        }
    };
   private getWorkdir = (editor: vscode.TextEditor): string => {
        const conf = vscode.workspace.getConfiguration("markdownVplay");
        const workdir = conf.get('workdir');
        if(workdir) {
            return workdir as string;
        }

        return path.dirname(editor.document.uri.fsPath);
    };
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
                end = editor.document.lineAt(i).range.start;
                break;
            }
        }

        if (!end) {
            throw new NotFoundCodeSectionError();
        }

        const code = editor.document.getText(new vscode.Range(start, end));
        return [code, end.line + 1];
    };

    private appendMDText = (editor: vscode.TextEditor, targetLine: number, text: string) => {
        let eol: string;
        switch (editor.document.eol) {
            case vscode.EndOfLine.CRLF:
                eol = "\r\n";
                break;
            default:
                eol = "\n";
        }
        const outputText = eol + "```" + `${eol}${text}${text.endsWith(eol) ? "" : eol}` + "```" + eol;
        editor.edit((editBuilder) => {
            editBuilder.insert(new vscode.Position(targetLine, 0), outputText);
        });
    };

    public run = () => {
        if(!vscode.window.activeTextEditor) {
            return;
        }

        try {
            const editor = vscode.window.activeTextEditor;
            const [code, endLine] = this.detectSource(editor);
            const cwd = this.getWorkdir(editor);
            const output = this.runVCode(code, cwd);
            this.appendMDText(editor, endLine, output);
        } catch (e ) {
            if(e instanceof NotFoundCodeSectionError) {
                vscode.window.showErrorMessage("Not found go code section.");
            }
        }
    };
}