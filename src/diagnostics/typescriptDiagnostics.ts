import * as vscode from 'vscode';
import type { CodeBlock } from '../parser/types';
import { Logger } from '../utils/logger';

// TypeScript is bundled into extension.js by esbuild (not marked as external).
// Using require() so esbuild statically resolves and inlines it.
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const ts = require('typescript') as typeof import('typescript');

/**
 * Minimal ambient declarations for the most common JS/TS globals.
 *
 * Used as a synthetic lib file so the semantic checker doesn't report
 * TS2304 for standard globals (fetch, Promise, console, etc.) while still
 * reporting it for truly undeclared local names like typos.
 *
 * All declarations use `any` intentionally — we want to suppress false
 * "not found" errors for globals, not to type-check their usage.
 * TypeScript is bundled by esbuild so its on-disk lib files are unavailable
 * at runtime; this constant is the safe, disk-free alternative.
 */
const INLINE_AMBIENT_LIB = `
// ECMAScript built-ins (as types where TS needs them structurally)
declare var undefined: undefined;
declare var NaN: number;
declare var Infinity: number;
declare function parseInt(s: string, radix?: number): number;
declare function parseFloat(s: string): number;
declare function isNaN(n: number): boolean;
declare function isFinite(n: number): boolean;
declare function encodeURI(s: string): string;
declare function decodeURI(s: string): string;
declare function encodeURIComponent(s: string): string;
declare function decodeURIComponent(s: string): string;
// Promise must be declared as both type and value — TypeScript needs the type
// form for async functions (TS2318: Cannot find global type 'Promise').
interface PromiseLike<T> { then(onfulfilled?: (value: T) => any, onrejected?: (reason: any) => any): PromiseLike<T>; }
interface Promise<T> { then(onfulfilled?: (value: T) => any, onrejected?: (reason: any) => any): Promise<any>; catch(onrejected?: (reason: any) => any): Promise<any>; }
declare type Awaited<T> = T extends PromiseLike<infer U> ? U : T;
declare var Promise: { new<T>(executor: (resolve: (value: T) => void, reject: (reason?: any) => void) => void): Promise<T>; resolve<T>(value: T): Promise<T>; reject(reason?: any): Promise<never>; all(values: any): Promise<any>; allSettled(values: any): Promise<any>; race(values: any): Promise<any>; any(values: any): Promise<any>; };
// Iterable types for for-of / spread
interface Iterable<T> { [Symbol.iterator](): Iterator<T>; }
interface Iterator<T> { next(): { value: T; done?: boolean }; }
interface IterableIterator<T> extends Iterator<T> { [Symbol.iterator](): IterableIterator<T>; }
// Core value declarations
declare var Object: any;
declare var Function: any;
declare var Boolean: any;
declare var Symbol: any;
declare var Number: any;
declare var BigInt: any;
declare var Math: any;
declare var Date: any;
declare var String: any;
declare var RegExp: any;
declare var Array: any;
declare var Map: any;
declare var Set: any;
declare var WeakMap: any;
declare var WeakSet: any;
declare var WeakRef: any;
declare var FinalizationRegistry: any;
declare var Proxy: any;
declare var Reflect: any;
declare var JSON: any;
declare var Error: any;
declare var TypeError: any;
declare var RangeError: any;
declare var ReferenceError: any;
declare var SyntaxError: any;
declare var URIError: any;
declare var EvalError: any;
declare var AggregateError: any;
declare var ArrayBuffer: any;
declare var SharedArrayBuffer: any;
declare var DataView: any;
declare var Int8Array: any;
declare var Uint8Array: any;
declare var Uint8ClampedArray: any;
declare var Int16Array: any;
declare var Uint16Array: any;
declare var Int32Array: any;
declare var Uint32Array: any;
declare var Float32Array: any;
declare var Float64Array: any;
declare var BigInt64Array: any;
declare var BigUint64Array: any;
declare var Atomics: any;
// Browser globals
declare var console: any;
declare var fetch: any;
declare var setTimeout: any;
declare var clearTimeout: any;
declare var setInterval: any;
declare var clearInterval: any;
declare var queueMicrotask: any;
declare var requestAnimationFrame: any;
declare var cancelAnimationFrame: any;
declare var performance: any;
declare var crypto: any;
declare var document: any;
declare var window: any;
declare var globalThis: any;
declare var self: any;
declare var navigator: any;
declare var location: any;
declare var history: any;
declare var localStorage: any;
declare var sessionStorage: any;
declare var indexedDB: any;
declare var caches: any;
declare var alert: any;
declare var confirm: any;
declare var prompt: any;
declare var XMLHttpRequest: any;
declare var WebSocket: any;
declare var Worker: any;
declare var FormData: any;
declare var URL: any;
declare var URLSearchParams: any;
declare var Blob: any;
declare var File: any;
declare var FileReader: any;
declare var Headers: any;
declare var Request: any;
declare var Response: any;
declare var AbortController: any;
declare var AbortSignal: any;
declare var ReadableStream: any;
declare var WritableStream: any;
declare var TransformStream: any;
declare var TextEncoder: any;
declare var TextDecoder: any;
declare var MutationObserver: any;
declare var IntersectionObserver: any;
declare var ResizeObserver: any;
declare var Event: any;
declare var CustomEvent: any;
declare var EventTarget: any;
declare var Element: any;
declare var HTMLElement: any;
declare var Node: any;
declare var NodeList: any;
// Node.js globals
declare var process: any;
declare var Buffer: any;
declare var require: any;
declare var module: any;
declare var exports: any;
declare var __dirname: any;
declare var __filename: any;
declare var global: any;
declare function setImmediate(callback: (...args: any[]) => void, ...args: any[]): any;
declare function clearImmediate(id: any): void;
`;

/**
 * Semantic error codes that are false positives when checking isolated Markdown
 * snippets. These fire because the snippet has no imports/ambient context, not
 * because the code itself is wrong.
 *
 * Kept errors (examples): 2552 (typo — did you mean?), 2322 (type mismatch),
 * 7006 (implicit any), 2345 (wrong argument type), 2304 when the name is a
 * locally-declared identifier that simply doesn't exist anywhere in the snippet.
 */
const SUPPRESSED_CODES = new Set([
  2307, // Cannot find module 'X' or its type declarations
  2792, // Cannot find module 'X' (alternate form)
  2580, // Cannot find name 'require' — CommonJS
  2591, // Cannot find name 'module'  — CommonJS
  2683, // 'this' implicitly has type 'any' (no class context)
  1192, // Module has no exported member (cross-block reference)
  2669, // Augmentations for global scope can only be directly nested
  7016, // Could not find declaration file for module
]);

/**
 * Check a TypeScript code snippet using the TypeScript compiler's semantic
 * diagnostics. Standard DOM + ES2022 libs are provided so common globals
 * (fetch, Promise, console, etc.) resolve without errors. Only genuine logic
 * and type mistakes — like referencing an undeclared local name — are reported.
 */
export function diagnoseTypescriptBlock(block: CodeBlock): vscode.Diagnostic[] {
  try {
    const fileName = 'snippet.ts';
    const libFileName = 'lib.mdca.d.ts';

    const sourceFile = ts.createSourceFile(
      fileName,
      block.content,
      ts.ScriptTarget.Latest,
      /* setParentNodes */ true,
      ts.ScriptKind.TS,
    );

    const libFile = ts.createSourceFile(
      libFileName,
      INLINE_AMBIENT_LIB,
      ts.ScriptTarget.Latest,
      false,
      ts.ScriptKind.DTS,
    );

    const compilerOptions: import('typescript').CompilerOptions = {
      noEmit: true,
      skipLibCheck: true,
      target: ts.ScriptTarget.ES2022,
      // Point to our synthetic lib; TypeScript won't try to load any other lib files.
      lib: [libFileName],
      noLib: false,
      types: [], // prevent auto-discovery of @types packages
      strict: false, // avoid strictNullChecks noise on fragments
      noImplicitAny: false,
    };

    const host: import('typescript').CompilerHost = {
      getSourceFile: (name) => {
        if (name === fileName) return sourceFile;
        if (name === libFileName) return libFile;
        return undefined;
      },
      getDefaultLibFileName: () => libFileName,
      writeFile: () => {},
      getCurrentDirectory: () => '/',
      getCanonicalFileName: (f) => f,
      useCaseSensitiveFileNames: () => true,
      getNewLine: () => '\n',
      fileExists: (name) => name === fileName || name === libFileName,
      readFile: (name) => {
        if (name === fileName) return block.content;
        if (name === libFileName) return INLINE_AMBIENT_LIB;
        return undefined;
      },
    };

    const program = ts.createProgram([fileName], compilerOptions, host);
    const semanticDiags = program.getSemanticDiagnostics(sourceFile);

    return [...semanticDiags]
      .filter((d) => !SUPPRESSED_CODES.has(d.code))
      .map((d) => {
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(d.start ?? 0);
        const range = new vscode.Range(line, character, line, character + (d.length ?? 1));
        const msg = ts.flattenDiagnosticMessageText(d.messageText, '\n');
        const severity =
          d.category === ts.DiagnosticCategory.Warning
            ? vscode.DiagnosticSeverity.Warning
            : vscode.DiagnosticSeverity.Error;
        return new vscode.Diagnostic(range, msg, severity);
      });
  } catch (err) {
    Logger.warn(`TypeScript semantic check failed: ${String(err)}`);
    return [];
  }
}
