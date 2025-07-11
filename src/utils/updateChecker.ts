export interface UpdateResult {
  hasUpdate: boolean;
  latestVersion?: string;
}

const UPDATE_API = 'https://api.github.com/repos/openai/codex-automerger-userscript/releases/latest';

export async function checkUserscriptUpdates(): Promise<UpdateResult> {
  // In the client-only environment we skip update checks to avoid direct
  // requests to the GitHub API
  return { hasUpdate: false };
}
