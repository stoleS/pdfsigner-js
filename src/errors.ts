export interface ProxyRequiredError {
  reason: 'PROXY_REQUIRED'
  message: string
}

export interface CertificateExpiredError {
  reason: 'CERTIFICATE_EXPIRED'
  message: string
  validTo: Date
}

export interface CertificateNotYetValidError {
  reason: 'CERTIFICATE_NOT_YET_VALID'
  message: string
  validFrom: Date
}

export interface PassphraseRequiredError {
  reason: 'PASSPHRASE_REQUIRED'
  message: string
}

export interface CertificateParseError {
  reason: 'CERTIFICATE_PARSE_ERROR'
  message: string
}

export interface SigningError {
  reason: 'SIGNING_ERROR'
  message: string
  cause?: unknown
}

export interface ProxyError {
  reason: 'PROXY_ERROR'
  message: string
  proxyUrl: string
  statusCode?: number
}

export interface InvalidOptionsError {
  reason: 'INVALID_OPTIONS'
  message: string
}

export type SignPdfError =
  | ProxyRequiredError
  | CertificateExpiredError
  | CertificateNotYetValidError
  | PassphraseRequiredError
  | CertificateParseError
  | SigningError
  | ProxyError
  | InvalidOptionsError

export type CertificateError =
  | CertificateParseError
  | PassphraseRequiredError
