# pdfsigner-js

## Example usage
```typescript
const [error, result] = await signPdf({
    pdf: pdfData,
    level: 'aes',
    certificate: { type: 'p12', data: certBuffer, password: 'test123' },
    proxy: { baseUrl: 'http://localhost:8787' },
})
```