export { DiagnosticProvider } from './diagnosticProvider';
export { VirtualDocumentManager } from './virtualDocumentManager';
export { mapDiagnostic } from './diagnosticMapper';
export {
  isShellCheckExtensionAvailable,
  diagnoseShellBlockWithExtension,
  ensureShellCheckExtension,
} from './shellCheckExtensionDiagnostics';
export {
  isEslintExtensionAvailable,
  diagnoseJsTsBlockWithExtension,
  ensureEslintExtension,
} from './eslintExtensionDiagnostics';
export {
  isDockerExtensionAvailable,
  diagnoseDockerBlockWithExtension,
} from './dockerExtensionDiagnostics';
export type { MappedDiagnostic, VirtualDocument } from './types';
