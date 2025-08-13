export const UPDATE_API = 'https://api.github.com/repos/lovable-dev/codex-github-automerger/releases/latest';

export interface UpdateCheckResult {
  hasUpdate: boolean;
  latestVersion?: string;
  error?: string;
}

/**
 * Checks if a newer userscript release is available.
 */
export async function checkUserscriptUpdates(): Promise<UpdateCheckResult> {
  try {
    const response = await fetch(UPDATE_API);
    if (!response.ok) {
      return { hasUpdate: false, error: `Failed to fetch latest release: ${response.status}` };
    }
    const data = await response.json();
    const latestVersion = (data.tag_name || data.version || '').replace(/^v/, '');
    const currentVersion: string | undefined = (globalThis as any).GM_info?.script?.version;

    if (latestVersion && currentVersion && isVersionGreater(latestVersion, currentVersion)) {
      return { hasUpdate: true, latestVersion };
    }
  } catch (e) {
    return { hasUpdate: false, error: e instanceof Error ? e.message : String(e) };
  }

  return { hasUpdate: false };
}

function isVersionGreater(latest: string, current: string): boolean {
  const latestParts = latest.split('.').map(Number);
  const currentParts = current.split('.').map(Number);
  const len = Math.max(latestParts.length, currentParts.length);
  for (let i = 0; i < len; i++) {
    const l = latestParts[i] ?? 0;
    const c = currentParts[i] ?? 0;
    if (l > c) return true;
    if (l < c) return false;
  }
  return false;
}
