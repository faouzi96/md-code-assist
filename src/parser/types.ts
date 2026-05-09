/** A fenced code block extracted from a Markdown document. */
export interface CodeBlock {
  /** Canonical language identifier (e.g. "typescript", "python", "shell"). Empty string if unspecified. */
  readonly language: string;
  /** Raw fence label as written in the Markdown (e.g. "bash", "zsh", "sh"). Empty string if unspecified. */
  readonly rawLanguage: string;
  /** Raw content between the fences, without leading/trailing newlines added by the parser. */
  readonly content: string;
  /** 0-based line number of the opening fence (``` line) in the Markdown document. */
  readonly startLine: number;
  /** 0-based line number of the closing fence (``` line) in the Markdown document. */
  readonly endLine: number;
  /** Character offset of the first character of the opening fence in the Markdown document. */
  readonly startOffset: number;
  /** Character offset of the last character of the closing fence (inclusive) in the Markdown document. */
  readonly endOffset: number;
  /** 0-based line number of the first content line (line after the opening fence). */
  readonly contentStartLine: number;
  /** 0-based line number of the last content line (line before the closing fence). */
  readonly contentEndLine: number;
}
