import { getSettings } from './settings';

/** Returns the configured executable path for Black. */
export function getBlackPath(): string {
  return getSettings().formatters.blackPath;
}

/** Returns the configured executable path for shfmt. */
export function getShfmtPath(): string {
  return getSettings().formatters.shfmtPath;
}
