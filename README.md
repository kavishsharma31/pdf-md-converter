# PDF → Markdown Converter

Converts text-based PDFs into clean, Claude-friendly Markdown.

Scanned or image-only PDFs are not supported in this base version because they do not contain a readable text layer.

## Local Dev

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Production Check

```bash
npm run lint
npx tsc --noEmit
npm run build
npm run start
```

## Vercel Deployment

1. Push the repo to GitHub.
2. Import the repo in Vercel.
3. Use the Next.js framework preset.
4. No environment variables are needed.
5. Deploy.

No `vercel.json` is required for the standard deployment.

## Production File Size

The base version supports PDFs under 4MB because uploads go through a Vercel Function.

For larger PDFs later, upload files directly to storage such as Vercel Blob or S3, then process from storage instead of sending the PDF through the function request body.
