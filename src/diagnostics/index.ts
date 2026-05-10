export { DiagnosticProvider } from './diagnosticProvider';
export { VirtualDocumentManager } from './virtualDocumentManager';
export { mapDiagnostic } from './diagnosticMapper';
export {
  isShellCheckExtensionAvailable,
  diagnoseShellBlockWithExtension,
  ensureShellCheckExtension,
} from './shellCheckExtensionDiagnostics';
export { diagnoseJsBlock } from './eslintExtensionDiagnostics';
export { diagnoseTypescriptBlock } from './typescriptDiagnostics';
export type { MappedDiagnostic, VirtualDocument } from './types';
