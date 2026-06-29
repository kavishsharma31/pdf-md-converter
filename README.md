# PDF -> Markdown Converter

Converts text-based PDFs into clean, Claude-friendly Markdown. The app supports
PDFs up to 25MB by uploading them directly to a private Vercel Blob store before
server-side conversion.

Scanned or image-only PDFs are not supported because they do not contain a
readable text layer. Temporary uploaded PDFs are deleted after each conversion.
The app does not use the Claude API or OpenAI API.

## Local Dev

Create `.env.local` with the required private Blob credential:

```env
BLOB_READ_WRITE_TOKEN=...
```

Then install dependencies and start the development server:

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

1. Push the repository to GitHub.
2. Import the repository into Vercel using the Next.js framework preset.
3. Connect a private Vercel Blob store to the project.
4. Confirm `BLOB_READ_WRITE_TOKEN` is configured for Production, Preview, and Development.
5. Deploy.

No `vercel.json` is required for a standard Next.js deployment.
