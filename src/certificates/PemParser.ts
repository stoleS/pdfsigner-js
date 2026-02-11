import forge from 'node-forge'
import { ok, err } from '../result'

export interface ParsedPem {
  p12Buffer: ArrayBuffer
  password: string
  certificate: forge.pki.Certificate
  privateKey: forge.pki.PrivateKey
}

// Internal password used for the generated P12 container
const INTERNAL_P12_PASSWORD = '__temp_password__'

// zgapdfsigner only accepts p12cert + pwd as input
// when the user provides PEM, we have to convert it to a P12 container in memory,
// and P12 containers require a password to encrypt.
function convertToP12Zgapdfsigner(certificate: forge.pki.Certificate, privateKey: forge.pki.rsa.PrivateKey) {
  try {
    const p12Asn1 = forge.pkcs12.toPkcs12Asn1(privateKey, [certificate], INTERNAL_P12_PASSWORD, {
      algorithm: '3des',
    })
    const p12Der = forge.asn1.toDer(p12Asn1).getBytes()

    const p12Buffer = new ArrayBuffer(p12Der.length)
    const view = new Uint8Array(p12Buffer)
    for (let i = 0; i < p12Der.length; i++) {
      view[i] = p12Der.charCodeAt(i)
    }

    return ok({
      p12Buffer,
      password: INTERNAL_P12_PASSWORD,
      certificate,
      privateKey,
    })
  } catch (error) {
    return err({
      reason: 'CERTIFICATE_PARSE_ERROR',
      message: `Failed to convert PEM to P12: ${error instanceof Error ? error.message : String(error)}`,
    })
  }
}

/**
 * Parse PEM-encoded certificate and private key, then convert to P12 for zgapdfsigner.
 *
 * @param certificatePem - certificate binary
 * @param privateKeyPem - private key for the certificate
 * @param passphrase - certificate passphrase
 * @returns Result<ParsedPem, CertificateError>
 */
// eslint-disable-next-line complexity, max-lines-per-function
export function parsePem(
  certificatePem: string,
  privateKeyPem: string,
  passphrase?: string,
) {
  let certificate: forge.pki.Certificate
  let privateKey: forge.pki.PrivateKey

  // Parse certificate
  try {
    certificate = forge.pki.certificateFromPem(certificatePem)
  } catch (error) {
    return err({
      reason: 'CERTIFICATE_PARSE_ERROR',
      message: `Failed to parse PEM certificate: ${error instanceof Error ? error.message : String(error)}`,
    })
  }

  try {
    if (privateKeyPem.includes('ENCRYPTED')) {
      // eslint-disable-next-line max-depth
      if (!passphrase) {
        return err({
          reason: 'PASSPHRASE_REQUIRED',
          message: 'The PEM private key is encrypted. Provide a passphrase in the PEM certificate provider.',
        })
      }
      privateKey = forge.pki.decryptRsaPrivateKey(privateKeyPem, passphrase)

      // eslint-disable-next-line max-depth
      if (!privateKey) {
        return err({
          reason: 'CERTIFICATE_PARSE_ERROR',
          message: 'Failed to decrypt private key. Wrong passphrase?',
        })
      }
    } else {
      privateKey = forge.pki.privateKeyFromPem(privateKeyPem)
    }
  } catch (error) {
    return err({
      reason: 'CERTIFICATE_PARSE_ERROR',
      message: `Failed to parse PEM private key: ${error instanceof Error ? error.message : String(error)}`,
    })
  }

  return convertToP12Zgapdfsigner(certificate, privateKey)
}
