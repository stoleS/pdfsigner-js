import type { SignOption, TsaServiceInfo } from 'zgapdfsigner'
import type { SignPdfOptions } from '../types.js'
import { SignatureLevel } from '../types.js'
import type { ResolvedCertificate } from '../certificates/CertificateInspector'

const DEFAULT_TSA_PRESET = '1' // http://ts.ssl.com

const TEXT_ALIGN_MAP = {
  left: 0,
  center: 1,
  right: 2,
} as const

/**
 * Build a zgapdfsigner SignOption from our typed API.
 *
 * @param options - sign options
 * @param resolved - resolved certificate
 * @returns SignOption
 */
// eslint-disable-next-line complexity, max-lines-per-function
export function buildSignOption(
  options: SignPdfOptions,
  resolved: ResolvedCertificate,
): SignOption {
  const signOption: SignOption = {
    p12cert: resolved.p12Buffer,
    pwd: resolved.password,
  }

  if (options.permission) {
    signOption.permission = options.permission
  }

  if (options.metadata) {
    signOption.reason = options.metadata.reason
    signOption.location = options.metadata.location
    signOption.contact = options.metadata.contact
    signOption.signame = options.metadata.name
  }

  if (options.debug) {
    signOption.debug = true
  }

  // TSA + LTV (AES only)
  if (options.level === SignatureLevel.AES) {
    if (options.tsa?.url) {
      // eslint-disable-next-line max-depth
      if (options.tsa.headers) {
        const tsaInfo: TsaServiceInfo = {
          url: options.tsa.url,
          headers: { ...options.tsa.headers },
        }
        signOption.signdate = tsaInfo
      } else {
        signOption.signdate = options.tsa.url
      }
    } else {
      signOption.signdate = DEFAULT_TSA_PRESET
    }

    signOption.ltv = options.ltvMethod ?? 1
  }

  if (options.visibleSignature) {
    const vs = options.visibleSignature

    signOption.drawinf = {
      area: {
        x: vs.position.x,
        y: vs.position.y,
        w: vs.position.width,
        h: vs.position.height,
      },
    }

    if (vs.position.page !== undefined) {
      signOption.drawinf.pageidx = vs.position.page
    }

    if (vs.image) {
      signOption.drawinf.imgInfo = {
        imgData: vs.image.data,
        imgType: vs.image.type,
      }
    }

    if (vs.text) {
      signOption.drawinf.textInfo = {
        text: vs.text.content,
        size: vs.text.fontSize,
        fontData: vs.text.fontData,
        subset: vs.text.fontSubset,
        color: vs.text.color,
        align: vs.text.align ? TEXT_ALIGN_MAP[vs.text.align] : undefined,
        lineHeight: vs.text.lineHeight,
      }
    }
  }

  return signOption
}
