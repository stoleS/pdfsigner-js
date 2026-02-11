# pdfsigner-js

A TypeScript library for signing PDFs fully in the browser. Wraps [zgapdfsigner](https://github.com/zboris12/zgapdfsigner) with a typed API, Result pattern error handling, and CORS proxy support for browser-based signing.

## Features

- **SES** (Simple Electronic Signature) — local signing, no network needed
- **AES** (Advanced Electronic Signature) — TSA timestamp + LTV with OCSP/CRL
- PKCS#12 (.p12/.pfx) and PEM certificate support
- Visible signatures with image, text, or both

For full features extended from zgapdfsigner check it's [repo](https://github.com/zboris12/zgapdfsigner/tree/main).

## Install

```bash
npm install pdfsigner-js
```

## Usage

### SES — Simple signing

```typescript
import { signPdf, SignatureLevel } from 'pdfsigner-js';

const [error, result] = await signPdf({
  pdf: pdfBytes,
  level: SignatureLevel.SES,
  certificate: { type: 'p12', data: pfxBuffer, password: 'secret123' },
});

if (error) {
  console.error(error.reason, error.message);
  return;
}

// result.pdf contains the signed PDF bytes
```

### AES — Advanced signing with timestamp + LTV

Requires a proxy backend to bypass CORS restrictions for TSA, OCSP, and CRL requests.

```typescript
const [error, result] = await PdfSigningService.sign({
  pdf: pdfBytes,
  level: SignatureLevel.AES,
  certificate: { type: 'p12', data: pfxBuffer, password: 'secret123' },
  proxy: { baseUrl: 'https://my-backend-api.com/signing-proxy' },
});
```

### Visible signature

```typescript
const [error, result] = await PdfSigningService.sign({
  pdf: pdfBytes,
  level: SignatureLevel.AES,
  certificate: { type: 'p12', data: pfxBuffer, password: 'secret123' },
  proxy: { baseUrl: 'https://my-backend-api.com/signing-proxy' },
  visibleSignature: {
    position: { page: 0, x: 350, y: 700, width: 200, height: 60 },
    image: { data: pngBuffer, type: 'png' },
    text: { content: 'Signed by me', fontSize: 10, color: '#003366' },
  },
  metadata: { reason: 'Approved', location: 'Earth' },
});
```

## Proxy

Since external services call would fail CORS requirements, AES signing requires a proxy backend that forwards requests to external services (TSA, OCSP, CRL). The proxy needs a single endpoint:

```
POST/GET {baseUrl}/fetch?url={encodedTargetUrl}
```

Minimal Go example:

```go
func handleFetch(w http.ResponseWriter, r *http.Request) {
    targetURL := r.URL.Query().Get("url")

    body, _ := io.ReadAll(r.Body)
    defer r.Body.Close()

    req, _ := http.NewRequestWithContext(r.Context(), r.Method, targetURL, bytes.NewReader(body))
    req.Header.Set("Content-Type", r.Header.Get("Content-Type"))

    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        http.Error(w, "upstream failed", http.StatusBadGateway)
        return
    }
    defer resp.Body.Close()

    w.Header().Set("Content-Type", resp.Header.Get("Content-Type"))
    w.WriteHeader(resp.StatusCode)
    io.Copy(w, resp.Body)
}
```

## API

### `PdfSigningService.sign(options): Promise<Result<SigningResult, SignPdfError>>`

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `pdf` | `ArrayBuffer \| Uint8Array` | ✅ | PDF bytes |
| `level` | `SignatureLevel` | ✅ | `SES` or `AES` |
| `certificate` | `CertificateProvider` | ✅ | P12 or PEM certificate |
| `proxy` | `ProxyConfig` | AES only | `{ baseUrl: string, headers?: Record<string, string> }` |
| `tsa` | `TsaConfig` | — | Custom TSA URL (defaults to ssl.com) |
| `visibleSignature` | `VisibleSignatureOptions` | — | Image/text + position |
| `metadata` | `SigningMetadata` | — | Reason, location, contact, name |
| `permission` | `1 \| 2 \| 3` | — | DocMDP restriction level |
| `ltvMethod` | `1 \| 2` | — | `1` = OCSP+CRL (default), `2` = CRL only |

### `PdfSigningService.getCertificateInfo(provider): Result<CertificateInfo, CertificateError>`

Inspect a certificate without signing.

## License

MIT