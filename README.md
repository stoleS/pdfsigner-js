# pdfsigner-js

## Example usage
### Invisible
```typescript
const [error, result] = await signPdf({
    pdf: pdfData,
    level: 'aes',
    certificate: { type: 'p12', data: certBuffer, password: 'test123' },
    proxy: { 
        baseUrl: 'http://localhost:8787' 
    },
})
```
### Visible
```typescript
const [error, result] = await signPdf({
    pdf: pdfData,
    level: 'aes',
    certificate: {
        type: 'p12',
        data: certBuffer,
        password: 'test123',
    },
    proxy: {
        baseUrl: 'http://localhost:8787',
    },
    visibleSignature: {
        position: {
            page: 0,      
            x: 350,       
            y: 700,     
            width: 200,
            height: 60,
        },
        image: {
            data: signatureImage,
            type: 'png',
        },
    },
    metadata: {
        reason: 'Document approved',
        location: 'Wittenbach, Switzerland',
        name: 'Predrag',
    },
});
```