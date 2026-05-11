import * as vscode from 'vscode';

/**
 * Manages the single status bar item for Markdown Code Assistant.
 *
 * States (in priority order):
 *   - Hidden: no Markdown editor is active
 *   - Transient "Formatted N blocks" (3 s) after a format operation
 *   - Idle with issue count when diagnostics have fired
 *   - Idle "✓ Markdown Code Assist" when no issues *
 * Blocks tagged with `@md-assistant-ignore` are excluded from the pipeline
 * entirely and never appear in counts. */
export class StatusBarController {
  private readonly item: vscode.StatusBarItem;
  private currentDiagnosticCount = 0;
  private resetTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.item.command = 'mdCodeAssist.showDiagnostics';
    this.item.tooltip = 'Markdown Code Assistant — click to refresh diagnostics';
    this.renderIdle();
  }

  /** Show the item. Call when a Markdown editor becomes active. */
  show(): void {
    this.item.show();
  }

  /** Hide the item. Call when no Markdown editor is active. */
  hide(): void {
    this.item.hide();
  }

  /**
   * Call after a format operation completes.
   * Shows a transient "Formatted N blocks" message for 3 s then reverts to idle.
   */
  setFormatDone(formattedCount: number): void {
    this.clearReset();
    this.item.text =
      formattedCount > 0
        ? `$(check) Formatted ${formattedCount} block${formattedCount === 1 ? '' : 's'}`
        : `$(check) Already formatted`;
    this.item.backgroundColor = undefined;
    this.resetTimer = setTimeout(() => {
      this.resetTimer = undefined;
      this.renderIdle();
    }, 3000);
  }

  /**
   * Call after a diagnostic refresh completes.
   * Updates the persistent issue count shown in the idle state.
   */
  setDiagnosticCount(count: number): void {
    this.currentDiagnosticCount = count;
    // Don't interrupt a transient post-format message; it will revert after 3 s.
    if (this.resetTimer === undefined) {
      this.renderIdle();
    }
  }

  dispose(): void {
    this.clearReset();
    this.item.dispose();
  }

  private renderIdle(): void {
    if (this.currentDiagnosticCount > 0) {
      this.item.text = `$(warning) ${this.currentDiagnosticCount} issue${this.currentDiagnosticCount === 1 ? '' : 's'}`;
      this.item.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    } else {
      this.item.text = `$(check) Markdown Code Assist`;
      this.item.backgroundColor = undefined;
    }
  }

  private clearReset(): void {
    if (this.resetTimer !== undefined) {
      clearTimeout(this.resetTimer);
      this.resetTimer = undefined;
    }
  }
}
