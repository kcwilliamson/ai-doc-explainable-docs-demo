# AI Doc Explainable Docs Demo

An interactive demo showing how AI documentation assistants succeed or fail based on **retrieval quality**, not just the model or the docs themselves.

## Live Demo
https://ai-doc-explainable-docs-demo.pages.dev/

## Overview

This project demonstrates a core truth about AI-powered documentation:

> The model can only answer from what it’s given — and retrieval determines what it sees.

Using a small Git documentation set, this app lets you ask questions in two modes:

- **Structured Knowledge ON** → prioritizes relevant, well-ranked content
- **Structured Knowledge OFF** → degrades retrieval quality

Same docs. Same model. Different results.

## What this shows

- AI doesn’t read your whole docs site
- Retrieval selects a small set of content first
- Answer quality depends on that selection
- Poor retrieval = poor answers (even with good docs)

This reframes the problem:
**AI doc failures are often retrieval failures, not writing failures**

## Features

- Chat-based documentation assistant
- Structured vs unstructured retrieval toggle
- “AI Thinking” panel with:
  - retrieved chunks
  - ranking signals
  - match explanations
- Embedded Git documentation dataset
- Cloudflare Pages + Functions backend
- Rate limiting on API

## Tech Stack

- React + TypeScript + Vite
- Cloudflare Pages + Functions
- OpenAI API

## Why this exists

This isn’t just a chatbot demo.

It’s a small, explainable system that shows how:
- content structure
- retrieval logic
- ranking
- and UX transparency

directly impact AI performance.

It’s meant to support conversations around:
- AI-ready documentation
- RAG quality
- UX for AI systems
- content as system design

## Try asking

- What’s the difference between reset and revert?
- How do I recover from detached HEAD?
- How do I unstage a file?
- What do I do if my push is rejected?

Then toggle Structured