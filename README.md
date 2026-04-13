# AI Doc Explainable Docs Demo

This repository is a sample of work and a functioning prototype that demonstrates a core AI-content principle: answer quality depends heavily on retrieval quality, not just model quality.

## Problem

Teams often assume that if documentation is "good" and the model is "smart," an AI doc assistant should work well.

In practice, many failures happen earlier in the system:

- the wrong content gets retrieved
- relevant information is ranked poorly
- the interface hides why the answer appeared

That makes AI documentation feel unreliable and hard to improve.

## Solution

This prototype creates a small, explainable documentation assistant that lets people compare better and worse retrieval conditions using the same documentation set.

It includes:

- a chat-based documentation interface
- a structured knowledge toggle
- visible retrieval context and ranking signals
- an "AI Thinking" panel to make the system more inspectable

The purpose is to show that AI-ready documentation is also a retrieval, structure, and UX problem.

## Tools

- React
- TypeScript
- Vite
- Cloudflare Pages
- Cloudflare Functions
- OpenAI API

## Prototype Notes

- sample of work
- functioning prototype
- built to support conversations about RAG quality, AI-ready docs, and explainable AI UX
- intended as an educational demo, not a production documentation platform

## Live Demo

[ai-doc-explainable-docs-demo.pages.dev](https://ai-doc-explainable-docs-demo.pages.dev/)

## Running Locally

```bash
npm install
npm run dev
```
