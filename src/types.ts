/**
 * Electronic signature level.
 *
 * - `SES` — Simple Electronic Signature. Contains no timestamp and no LTV.
 * Allows local signing with provided certificate. Small legal value.
 *
 * - `AES` — Advanced Electronic Signature. Includes TSA timestamp and LTV
 * (Long-Term Validation) with OCSP/CRL revocation data embedded.
 * Medium to high legal value.
 */
export enum SignatureLevel {
  SES = 'ses',
  AES = 'aes',
}

export interface P12CertificateProvider {
  type: 'p12'
  /** Raw bytes of the .p12 / .pfx file */
  data: ArrayBuffer | Uint8Array
  /** Password to decrypt the PKCS#12 container */
  password: string
}

export interface PemCertificateProvider {
  type: 'pem'
  /** PEM-encoded certificate (-----BEGIN CERTIFICATE-----) */
  certificate: string
  /** PEM-encoded private key (-----BEGIN PRIVATE KEY----- or -----BEGIN RSA PRIVATE KEY-----) */
  privateKey: string
  /** Passphrase if the private key is encrypted */
  passphrase?: string
}

export type CertificateProvider = P12CertificateProvider | PemCertificateProvider

/**
 * Configuration for the user's proxy backend.
 * Proxy is required for TSA and LTV features in the browser.
 * Those services are fetched by zgapdfsigner but are 3rd party api's
 * which would fail CORS requirements if called from the browser.
 *
 * The proxy must implement:
 * - `POST/GET {baseUrl}/fetch?url={encodedUrl}` — generic proxy for TSA, OCSP, CRL, and certificate chain fetching
 */
export interface ProxyConfig {
  baseUrl: string
  headers?: Record<string, string>
}

export interface TsaConfig {
  /**
   * TSA URL that zgapdfsigner uses.
   *
   * Preset indices:
   * - `"1"` — http://ts.ssl.com
   * - `"2"` — http://timestamp.digicert.com
   * - `"3"` — http://timestamp.sectigo.com
   * - `"4"` — http://timestamp.entrust.net/TSS/RFC3161sha2TS
   * - `"5"` — http://timestamp.apple.com/ts01
   * - `"6"` — http://www.langedge.jp/tsa
   * - `"7"` — https://freetsa.org/tsr
   *
   * Or a full URL string.
   * Defaults to `"1"` (ssl.com) when AES is used.
   */
  url?: string
  headers?: Record<string, string>
}

/**
 * Position and dimensions for a visible signature on the PDF.
 * All values are in PDF points (72 points = 1 inch).
 */
export interface SignaturePosition {
  page?: number | string
  x: number
  y: number
  width?: number
  height?: number
}

export interface SignatureImage {
  data: ArrayBuffer | Uint8Array
  type: 'png' | 'jpg'
}

/**
 * Text to draw as part of the visible signature.
 */
export interface SignatureText {
  content: string
  fontSize: number
  /** Custom font data (.ttf file bytes). Required for non-latin characters. */
  fontData?: ArrayBuffer | Uint8Array
  /** Use font subsetting to reduce file size */
  fontSubset?: boolean
  /** Hex color string, e.g. `"#003366"` or `"003366"` */
  color?: string
  align?: 'left' | 'center' | 'right'
  lineHeight?: number
}

/**
 * Options for rendering a visible signature on the PDF.
 * If visible signature is selected at least one of `image` or `text` must be provided.
 */
export interface VisibleSignatureOptions {
  position: SignaturePosition
  image?: SignatureImage
  text?: SignatureText
}

/**
 * Optional metadata embedded in the signature.
 */
export interface SigningMetadata {
  reason?: string
  location?: string
  contact?: string
  /** Signer's name (overrides certificate subject) */
  name?: string
}

/**
 * Options for `PdfSigningService.sign()`.
 */
export interface SignPdfOptions {
  pdf: ArrayBuffer | Uint8Array
  level: SignatureLevel
  certificate: CertificateProvider
  proxy?: ProxyConfig
  tsa?: TsaConfig
  visibleSignature?: VisibleSignatureOptions
  metadata?: SigningMetadata
  /**
   * DocMDP modification permission:
   * - `1` — No changes permitted
   * - `2` — Form filling, page templates, and signing allowed
   * - `3` — Same as 2, plus annotations
   */
  permission?: 1 | 2 | 3
  /**
   * LTV method. Only used with AES level.
   * - `1` — Auto: try OCSP first, fallback to CRL
   * - `2` — CRL only
   *
   * @default 1
   */
  ltvMethod?: 1 | 2
  /** Enable debug output from zgapdfsigner */
  debug?: boolean
}

export interface CertificateInfo {
  subject: string
  issuer: string
  validFrom: Date
  validTo: Date
  /** Certificate serial number (hex) */
  serialNumber: string
  isExpired: boolean
  isSelfSigned: boolean
}

export interface SigningResult {
  pdf: Uint8Array
  certificate: CertificateInfo
  ltvEnabled?: boolean
}
