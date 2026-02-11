import type {
  SignPdfOptions,
  SigningResult,
  CertificateProvider,
} from './types'
import { SignatureLevel } from './types'
import { resolveCertificate, inspectCertificate } from './certificates/CertificateInspector'
import { buildSignOption } from './adapters/ZgaSignerAdapter'
import { validateSigningOptions } from './validation/OptionsValidator'
import { patchZgaUrlFetch } from './adapters/ProxyFetchAdapter'
import { ok, err } from './result'

/**
 * The runtime shape of the Zga namespace object.
 * In CJS: require('zgapdfsigner') returns this directly.
 * In ESM: import('zgapdfsigner') returns { default: ZgaNamespace }.
 */
interface ZgaNamespace {
  PdfSigner: new (signopt: any) => { sign(pdf: any): Promise<Uint8Array> }
  urlFetch: (url: string, params?: any) => Promise<Uint8Array>
  [key: string]: unknown
}

let zgaNs: ZgaNamespace | undefined

/**
 * Resolve the Zga namespace object, handling both CJS and ESM import shapes.
 */
async function getZgaNamespace(): Promise<ZgaNamespace> {
  if (!zgaNs) {
    const mod = await import('zgapdfsigner')
    // ESM: mod = { default: { PdfSigner, urlFetch, ... } }
    // CJS interop: mod = { PdfSigner, urlFetch, ... } or mod.default = { ... }
    const ns = (mod as any).default ?? mod
    // eslint-disable-next-line require-atomic-updates
    zgaNs = ns as ZgaNamespace
  }

  return zgaNs
}

/**
 * Sign a PDF document
 *
 * @param options - Signing configuration
 * @returns Promise<Result<SigningResult, SignError>>
 * @example
 * ```typescript
 * // SES — simple signing
 * const result = await PdfSigningService.sign({
 *   pdf: pdfBytes,
 *   level: SignatureLevel.SES,
 *   certificate: { type: 'p12', data: pfxBuffer, password: 'secret123' },
 * });
 *
 * // AES — advanced signing with timestamp + LTV
 * const result = await PdfSigningService.sign({
 *   pdf: pdfBytes,
 *   level: SignatureLevel.AES,
 *   certificate: { type: 'p12', data: pfxBuffer, password: 'secret123' },
 *   proxy: { baseUrl: 'https://my-backend-api.com/signing-proxy' },
 * });
 * ```
 */
// eslint-disable-next-line complexity, max-lines-per-function
export async function signPdf(options: SignPdfOptions) {
  const [certError, resolved] = resolveCertificate(options.certificate)
  if (certError) return [certError, null]

  const [validationError, validation] = validateSigningOptions(options, resolved.info)
  if (validationError) return [validationError, null]

  if (options.debug && validation.warnings.length > 0) {
    for (const w of validation.warnings) {
      console.warn(`[pdf-signer] ${w.code}: ${w.message}`)
    }
  }

  const signOption = buildSignOption(options, resolved)

  const zga = await getZgaNamespace()
  let restoreUrlFetch: (() => void) | undefined

  if (options.proxy && options.level === SignatureLevel.AES) {
    restoreUrlFetch = patchZgaUrlFetch(zga, options.proxy)
  }

  try {
    // 5. Create signer and sign
    const signer = new zga.PdfSigner(signOption)

    const pdfInput = options.pdf instanceof Uint8Array
      ? options.pdf
      : new Uint8Array(options.pdf)

    const signedBytes: Uint8Array = await signer.sign(pdfInput)

    if (!signedBytes || signedBytes.length === 0) {
      return err({
        reason: 'SIGNING_ERROR',
        message: 'Signing produced empty output.',
      })
    }

    const result: SigningResult = {
      pdf: signedBytes,
      certificate: resolved.info,
    }

    if (options.level === SignatureLevel.AES) {
      result.ltvEnabled = true
    }

    return ok(result)
  } catch (error) {
    return err({
      reason: 'SIGNING_ERROR',
      message: `PDF signing failed: ${error instanceof Error ? error.message : String(error)}`,
      cause: error,
    })
  } finally {
    restoreUrlFetch?.()
  }
}

/**
 * Inspect a certificate without signing.
 *
 * @param provider - P12 or PEM
 * @returns Result<CertificateError, CertificateInfo>
 */
export function getCertificateInfo(provider: CertificateProvider) {
  try {
    return ok(inspectCertificate(provider))
  } catch (error) {
    const cause = error instanceof Error ? error : undefined
    const message = error instanceof Error ? error.message : String(error)

    return err({ reason: 'CERTIFICATE_PARSE_FAILED', message, cause })
  }
}
