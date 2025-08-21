export interface UpdateCheckResult {
  hasUpdate: boolean;
  version?: string;
  data?: unknown;
}

export interface UpdateCheckOptions {
  timeout?: number;
  signal?: AbortSignal;
}

/**
 * Fetches the update manifest from the provided URL. Uses ETag caching to avoid
 * re-downloading unchanged manifests. If a request takes longer than the
 * specified timeout and no AbortSignal is provided, the request will be aborted.
 */
export async function checkForUpdate(
  url: string,
  { timeout = 5000, signal }: UpdateCheckOptions = {}
): Promise<UpdateCheckResult> {
  let controller: AbortController | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;

  // Create our own controller if none was provided so we can enforce a timeout
  if (!signal) {
    controller = new AbortController();
    timer = setTimeout(() => controller?.abort(), timeout);
  }

  const headers: Record<string, string> = {};
  const cachedEtag = localStorage.getItem('update-checker-etag');
  if (cachedEtag) {
    headers['If-None-Match'] = cachedEtag;
  }

  try {
    const response = await fetch(url, {
      headers,
      signal: signal ?? controller!.signal,
    });

    // 304 means nothing has changed, no need to parse JSON
    if (response.status === 304) {
      return { hasUpdate: false };
    }

    if (!response.ok) {
      throw new Error(`Update check failed: ${response.status}`);
    }

    const data = await response.json();
    const version = (data as any).version as string | undefined;
    const etag = response.headers.get('ETag');
    if (etag) {
      localStorage.setItem('update-checker-etag', etag);
    }
    if (version) {
      localStorage.setItem('update-checker-version', version);
    }

    return { hasUpdate: true, version, data };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
