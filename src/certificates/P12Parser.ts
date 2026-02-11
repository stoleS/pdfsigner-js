import forge from 'node-forge'
import { ok, err } from '../result'
import type { CertificateInfo } from '../types'

export interface ParsedP12 {
  p12Buffer: ArrayBuffer
  password: string
  certificate: forge.pki.Certificate
  privateKey: forge.pki.PrivateKey
  caCertificates: forge.pki.Certificate[]
}

function prepareCertificateBufferForForge(data: ArrayBuffer | Uint8Array): Record<string, ArrayBuffer | string> {
  const buffer
      = data instanceof Uint8Array
        ? data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)
        : data

  const bytes = new Uint8Array(buffer)

  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }

  return { buffer: buffer as ArrayBuffer, binary }
}

// eslint-disable-next-line complexity, max-lines-per-function
function retrieveCertificateBags(p12: forge.pkcs12.Pkcs12Pfx) {
  // PKCS#12 stores objects in bags which contain all certificates
  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })

  if (!certBags) {
    return err({
      reason: 'CERTIFICATE_PARSE_ERROR',
      message: 'No certificate bags found in PKCS#12 file.',
    })
  }

  const certBag = certBags[forge.pki.oids.certBag]

  if (!certBag || certBag.length === 0 || !certBag[0].cert) {
    return err({
      reason: 'CERTIFICATE_PARSE_ERROR',
      message: 'No certificate found in PKCS#12 file.',
    })
  }

  const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })
  // fallback for old certificates
  const keyBag = keyBags?.[forge.pki.oids.pkcs8ShroudedKeyBag]

  if (!keyBags) {
    return err({
      reason: 'CERTIFICATE_PARSE_ERROR',
      message: 'No private key found in PKCS#12 file.',
    })
  }

  return ok({ certBag, keyBag })
}

/**
 * Parse P12 certificate and extract important information needed for signing.
 * Uses node-forge to decode the certificate and get the bags from it.
 * After that we can get the information needed from those bags.
 *
 * @param data     - Certificate binary data
 * @param password - Certificate password
 * @returns Result<ParsedP12, CertificateParseError>
 */
// eslint-disable-next-line complexity, max-lines-per-function
export function parseP12(
  data: ArrayBuffer | Uint8Array,
  password: string,
) {
  try {
    // node-forge needs binary string instead of Uint8Array
    const { binary, buffer } = prepareCertificateBufferForForge(data)

    // after we get the binary string we can use node-forge to decode
    const p12Asn1 = forge.asn1.fromDer(binary as string)
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, password)

    // then we retrieve the bags
    const [bagsError, bags] = retrieveCertificateBags(p12)

    if (bagsError) {
      return err(bagsError)
    }

    const { certBag, keyBag } = bags

    let privateKey: forge.pki.PrivateKey | undefined

    // [0] leaf certificate - points back to CA
    // [1+] certificate chain
    if (keyBag && keyBag.length > 0 && keyBag[0].key) {
      privateKey = keyBag[0].key
    } else {
      // fallback
      const keyBags2 = p12.getBags({ bagType: forge.pki.oids.keyBag })
      const keyBag2 = keyBags2[forge.pki.oids.keyBag]
      // eslint-disable-next-line max-depth
      if (keyBag2 && keyBag2.length > 0 && keyBag2[0].key) {
        privateKey = keyBag2[0].key
      }
    }

    if (!privateKey) {
      return err({
        reason: 'CERTIFICATE_PARSE_ERROR',
        message: 'No private key found in PKCS#12 file.',
      })
    }

    const signingCert = certBag[0].cert

    if (!signingCert) {
      return err({
        reason: 'CERTIFICATE_PARSE_ERROR',
        message: 'No certificate found in PKCS#12 file.',
      })
    }

    const caCertificates = certBag
      .slice(1)
      .map(bag => bag.cert)
      .filter((cert): cert is forge.pki.Certificate => cert !== null)

    return ok({
      p12Buffer: buffer as ArrayBuffer,
      password,
      certificate: signingCert,
      privateKey,
      caCertificates,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    if (message.includes('Invalid password') || message.includes('PKCS#12 MAC')) {
      return err({ reason: 'CERTIFICATE_PARSE_ERROR', message: 'Invalid certificate password.' })
    }

    return err({ reason: 'CERTIFICATE_PARSE_ERROR', message })
  }
}

/**
 * RFC-style DN string when CN (Common Name) is missing
 *
 * @param attributes Certificate fields
 * @returns attributes formatted as C=..., O=... etc.
 */
function formatDN(attributes: forge.pki.CertificateField[]): string {
  return attributes.map(attr => `${attr.shortName}=${attr.value}`).join(', ')
}

/**
 * Extract certificate info for easier readability
 *
 * @param cert Certificate
 * @returns CertificateInfo
 */
export function extractCertificateInfo(cert: forge.pki.Certificate): CertificateInfo {
  const now = new Date()

  const getField = (attrs: forge.pki.CertificateField[], shortName: string): string => {
    const field = attrs.find(a => a.shortName === shortName)

    return field?.value as string ?? ''
  }

  const subject = getField(cert.subject.attributes, 'CN') || formatDN(cert.subject.attributes)
  const issuer = getField(cert.issuer.attributes, 'CN') || formatDN(cert.issuer.attributes)
  const isSelfSigned = cert.subject.hash === cert.issuer.hash

  return {
    subject,
    issuer,
    validFrom: cert.validity.notBefore,
    validTo: cert.validity.notAfter,
    serialNumber: cert.serialNumber,
    isExpired: now > cert.validity.notAfter,
    isSelfSigned,
  }
}

