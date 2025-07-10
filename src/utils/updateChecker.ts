export interface UpdateResult {
  hasUpdate: boolean;
  latestVersion?: string;
}

const UPDATE_API = 'https://api.github.com/repos/openai/codex-automerger-userscript/releases/latest';

export async function checkUserscriptUpdates(): Promise<UpdateResult> {
  try {
    const res = await fetch(UPDATE_API, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) {
      throw new Error('Network error');
    }
    const data = await res.json();
    const latest = data.tag_name || data.name;
    const current = (window as any).__USERSCRIPT_VERSION__;
    return { hasUpdate: current ? latest !== current : false, latestVersion: latest };
  } catch (err) {
    console.error('Failed to check userscript updates', err);
    return { hasUpdate: false };
  }
}
