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
npm run pages:dev
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

## Doctor

### Node requirement

- Use Node `18.18.0+` (Node 20 LTS recommended).

### Clean reinstall

```bash
cd /Users/katiewilliamson/Desktop/portfolio-2026-live/ai-doc-explainable-demo
rm -rf node_modules package-lock.json
npm install
```

No `--legacy-peer-deps` or `--force` is required with the pinned versions in this repo.

### Local run (Pages + Functions)

```bash
npm run build
npx wrangler pages dev dist
```

If you get a browser 404 at `/`, verify you started Wrangler from this repo and built successfully.
If port 9229 is busy on your machine, `npm run pages:dev` already moves the inspector to `9230`.

### Quick curl checks

```bash
curl -s http://127.0.0.1:8788/api/health
```

```bash
curl -s -X POST http://127.0.0.1:8788/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question":"How do I undo a staged file?","mode":"structured"}'
```
