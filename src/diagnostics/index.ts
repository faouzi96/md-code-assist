export { DiagnosticProvider } from './diagnosticProvider';
export { VirtualDocumentManager } from './virtualDocumentManager';
export { mapDiagnostic } from './diagnosticMapper';
export {
  isShellCheckExtensionAvailable,
  diagnoseShellBlockWithExtension,
  ensureShellCheckExtension,
} from './shellCheckExtensionDiagnostics';
export type { MappedDiagnostic, VirtualDocument } from './types';
