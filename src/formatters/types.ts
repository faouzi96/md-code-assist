/** Options passed to a formatter alongside the code. */
export interface FormatOptions {
  /** Canonical language ID (e.g. "typescript", "python"). */
  language: string;
  /** Absolute path to the formatter executable (for CLI-based formatters). */
  executablePath?: string;
}

/** Result returned by every formatter. */
export interface FormatResult {
  success: boolean;
  /** The formatted code. Present only when success is true. */
  formatted?: string;
  /** Human-readable error description. Present only when success is false. */
  error?: string;
}

/** Common interface every formatter must implement. */
export interface IFormatter {
  /** Canonical language IDs this formatter handles. */
  readonly supportedLanguages: readonly string[];
  /** Returns true if the formatter is available in the current environment. */
  isAvailable(): Promise<boolean>;
  /** Format the given code snippet. */
  format(code: string, options: FormatOptions): Promise<FormatResult>;
}
