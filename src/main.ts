export { signPdf, getCertificateInfo } from './PdfSigningService.js'

export { SignatureLevel } from './types.js'

export type {
  P12CertificateProvider,
  PemCertificateProvider,
  CertificateProvider,
  ProxyConfig,
  TsaConfig,
  SignaturePosition,
  SignatureImage,
  SignatureText,
  VisibleSignatureOptions,
  SigningMetadata,
  SignPdfOptions,
  CertificateInfo,
  SigningResult,
} from './types.js'

export type {
  ProxyRequiredError,
  CertificateExpiredError,
  CertificateNotYetValidError,
  PassphraseRequiredError,
  CertificateParseError,
  SigningError,
  InvalidOptionsError,
  SignPdfError,
  CertificateError,
} from './errors.js'

export { resolveCertificate, inspectCertificate } from './certificates/CertificateInspector'

export type { ResolvedCertificate } from './certificates/CertificateInspector'

export { patchZgaUrlFetch } from './adapters/ProxyFetchAdapter'
