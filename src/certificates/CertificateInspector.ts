import type { CertificateProvider, CertificateInfo } from '../types'
import { ok, err } from '../result'
import { parseP12, extractCertificateInfo } from './P12Parser.js'
import { parsePem } from './PemParser.js'

export interface ResolvedCertificate {
  /** P12 buffer ready for zgapdfsigner */
  p12Buffer: ArrayBuffer
  /** Password for the P12 */
  password: string
  /** Extracted certificate information */
  info: CertificateInfo
}

/**
 * zgapdfsigner requires a single format of the certificate data, so we need to normalize it first.
 * Since the p12 and PEM formats are widespread we don't want to force users to convert the certificates themselves.
 * They can input either one of those formats which will then get normalized to a P12 buffer + password for zgapdfsigner to use.
 *
 * @param provider Either a p12 or PEM certificate
 * @returns Result<ResolvedCertificate, CertificateError>
 */
// eslint-disable-next-line complexity, consistent-return
export function resolveCertificate(
  provider: CertificateProvider,
) {
  switch (provider.type) {
    case 'p12': {
      const [parseError, parsed] = parseP12(provider.data, provider.password)
      if (parseError) return err(parseError)

      const info = extractCertificateInfo(parsed.certificate)

      return ok({ p12Buffer: parsed.p12Buffer, password: parsed.password, info })
    }

    case 'pem': {
      const [parseError, parsed] = parsePem(provider.certificate, provider.privateKey, provider.passphrase)
      if (parseError) return err(parseError)

      const info = extractCertificateInfo(parsed.certificate)

      return ok({ p12Buffer: parsed.p12Buffer, password: parsed.password, info })
    }
  }
}

export function inspectCertificate(
  provider: CertificateProvider,
) {
  const [resolveError, resolved] = resolveCertificate(provider)
  if (resolveError) return err(resolveError)

  return ok(resolved.info)
}
