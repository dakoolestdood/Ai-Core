# Ai Core

Ai is an independent, API-free assistant starter project built with Node.js and browser JavaScript.

## Run on Replit

1. Import this GitHub repository into Replit.
2. Make sure the project uses Node.js 18 or newer.
3. Run `npm start`.
4. Open the web preview.

The server listens on the port provided by Replit (or port 3000 locally).

## Current features

- Chat interface that works on mobile and desktop.
- Local rule-based response engine.
- Basic arithmetic parser (without eval).
- Recent conversation history saved in the browser's local storage.
- No external AI API keys and no third-party runtime packages.

## Important limitation

This first version is **not a trained large language model**. It is a small local response engine with basic pattern matching and arithmetic. It cannot match ChatGPT's general reasoning or knowledge yet. Building a genuinely capable model independently requires a substantial training dataset, model architecture, compute resources, and a training/inference pipeline.

## Project structure

- `server.js` — HTTP server and chat endpoint.
- `ai.js` — local response engine and arithmetic parser.
- `public/index.html` — chat page.
- `public/style.css` — interface styling.
- `public/app.js` — browser chat logic and local history.

## Privacy

Conversation history is stored in the current browser's local storage. The server does not write chat messages to a database. Clearing the chat removes the saved browser history.
