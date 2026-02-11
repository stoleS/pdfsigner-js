import type { SignPdfOptions, CertificateInfo } from '../types'
import { SignatureLevel } from '../types'
import { ok, err } from '../result'

export interface ValidationWarning {
  code: string
  message: string
}

export interface ValidationSuccess {
  warnings: ValidationWarning[]
}

/**
 * Validate signing options and certificate info before signing.
 * Returns error result on hard failures, warnings for soft issues.
 *
 * @param options - signing options
 * @param certInfo - certificate info
 * @returns Result<ValidationWarning, ValidationSuccess>
 */
// eslint-disable-next-line complexity, max-lines-per-function
export function validateSigningOptions(
  options: SignPdfOptions,
  certInfo: CertificateInfo,
) {
  const warnings: ValidationWarning[] = []

  // AES requires proxy
  if (options.level === SignatureLevel.AES && !options.proxy) {
    return err({
      reason: 'PROXY_REQUIRED',
      message:
                'AES  requires a proxy configuration. '
                + 'The proxy is needed to reach TSA, OCSP, and CRL servers from the browser. '
                + 'Provide a `proxy` option with your backend base URL.',
    })
  }

  if (certInfo.isExpired) {
    return err({
      reason: 'CERTIFICATE_EXPIRED',
      message: `Certificate expired on ${certInfo.validTo.toISOString()}.`,
      validTo: certInfo.validTo,
    })
  }

  const now = new Date()
  if (now < certInfo.validFrom) {
    return err({
      reason: 'CERTIFICATE_NOT_YET_VALID',
      message: `Certificate is not valid until ${certInfo.validFrom.toISOString()}.`,
      validFrom: certInfo.validFrom,
    })
  }

  if (options.visibleSignature) {
    if (!options.visibleSignature.image && !options.visibleSignature.text) {
      return err({
        reason: 'INVALID_OPTIONS',
        message: 'Visible signature requires at least one of `image` or `text` to be provided.',
      })
    }
  }

  if (options.level === SignatureLevel.AES && certInfo.isSelfSigned) {
    warnings.push({
      code: 'SELF_SIGNED_AES',
      message:
                'Using a self-signed certificate with AES level. '
                + 'LTV validation may not work as expected since there is no certificate chain to validate.',
    })
  }

  if (options.proxy?.baseUrl.endsWith('/')) {
    warnings.push({
      code: 'PROXY_TRAILING_SLASH',
      message: 'Proxy baseUrl has a trailing slash. It will be trimmed automatically.',
    })
  }

  return ok({ warnings })
}
