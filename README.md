# ai-doc-explainable-demo

React + TypeScript + Vite app prepared for Cloudflare Pages with Pages Functions.

## Overview

- Frontend: React + TypeScript + Vite
- Hosting: Cloudflare Pages
- Serverless endpoints: `functions/` (Pages Functions)
- Example endpoint: `GET /api/health`

## Local development

1. Install dependencies:

```bash
cd ai-doc-explainable-demo
npm install
```

2. Run the Vite app locally:

```bash
npm run dev
```

3. (Optional, recommended) Run a local Cloudflare Pages environment so `functions/` is active:

```bash
npm run build
npx wrangler pages dev dist
```

If you use function secrets locally, copy `.dev.vars.example` to `.dev.vars` and set values.

## Deploy (Git-integrated Cloudflare Pages)

Use Git integration (not direct upload):

1. Initialize and push this project to GitHub:

```bash
cd ai-doc-explainable-demo
git init
git add .
git commit -m "Initial Cloudflare Pages React+TS+Vite project"
git branch -M main
git remote add origin <YOUR_GITHUB_REPO_URL>
git push -u origin main
```

2. In Cloudflare Dashboard:
- Go to **Workers & Pages** -> **Create** -> **Pages** -> **Connect to Git**.
- Select the `ai-doc-explainable-demo` repository.
- Build settings:
  - Framework preset: `Vite`
  - Build command: `npm run build`
  - Build output directory: `dist`

3. Save and deploy. Future pushes to `main` trigger automatic deployments.

## Environment variables

### Local (`.dev.vars`)

```bash
cp .dev.vars.example .dev.vars
```

Set:

```bash
OPENAI_API_KEY=your_real_key_here
```

### Cloudflare Pages (Preview + Production)

1. Open your Pages project in Cloudflare Dashboard.
2. Go to **Settings** -> **Environment variables**.
3. Add `OPENAI_API_KEY` under:
   - **Preview**
   - **Production**
4. Save and redeploy so `/api/chat` can read the key.

## C3 command (recommended scaffold command)

Run this on a machine with npm registry access:

```bash
npm create cloudflare@latest ai-doc-explainable-demo -- --framework=react --platform=pages --typescript
```

This repository is already laid out to match that goal and include `functions/` for Pages Functions.
