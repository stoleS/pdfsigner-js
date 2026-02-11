import type { ProxyConfig } from '../types.js'

/**
 * The runtime shape of the Zga namespace that has urlFetch.
 */
interface ZgaNamespace {
  urlFetch: (url: string, params?: Record<string, unknown>) => Promise<Uint8Array>
  [key: string]: unknown
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '')
}

/**
 * Build a proxied URL for any outbound request.
 *
 * @param proxy - proxy config
 * @param originalUrl - original url
 * @returns string
 */
export function buildProxiedUrl(proxy: ProxyConfig, originalUrl: string): string {
  const base = normalizeBaseUrl(proxy.baseUrl)

  return `${base}/fetch?url=${encodeURIComponent(originalUrl)}`
}

/**
 * Patches `urlFetch` on the resolved zgapdfsigner namespace so that all
 * outbound HTTP requests (TSA, OCSP, CRL, cert chain) are routed through
 * the user's proxy.
 *
 * Scoped to the Zga namespace only — no global side effects.
 *
 * Another solution would be to patch the browser fetch for these actions
 * and revert back to the original fetch after the zgapdfsigner is done with requests.
 *
 * @param zga - The resolved zgapdfsigner namespace (mod.default or mod itself)
 * @param proxy - The user's proxy configuration
 * @returns A restore function that MUST be called after signing completes
 */
// eslint-disable-next-line max-lines-per-function
export function patchZgaUrlFetch(
  zga: ZgaNamespace,
  proxy: ProxyConfig,
): () => void {
  const originalUrlFetch = zga.urlFetch
  const base = normalizeBaseUrl(proxy.baseUrl)
  const customHeaders = proxy.headers ?? {}

  // eslint-disable-next-line complexity
  zga.urlFetch = (url: string, params?: Record<string, unknown>) => {
    // Don't proxy requests already going to the proxy
    if (url.startsWith(base)) {
      return originalUrlFetch.call(zga, url, params)
    }

    // Don't proxy non-http URLs
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return originalUrlFetch.call(zga, url, params)
    }

    const proxiedUrl = `${base}/fetch?url=${encodeURIComponent(url)}`

    const patchedParams = params
      ? {
        ...params,
        headers: {
          ...((params.headers as Record<string, string>) ?? {}),
          ...customHeaders,
        },
      }
      : Object.keys(customHeaders).length > 0
        ? { headers: customHeaders }
        : undefined

    return originalUrlFetch.call(zga, proxiedUrl, patchedParams)
  }

  return () => {
    zga.urlFetch = originalUrlFetch
  }
}
