# Ai Core

Ai is a browser-based chat application with a local language model and a separate Core knowledge workspace.

## Run in GitHub Codespaces

1. Open the repository in Codespaces.
2. Run `git pull origin main` if the Codespace already exists.
3. Run `npm start`.
4. Open forwarded port 3000.

## Chat

- Chat-style interface with multiple locally saved conversations.
- The browser runs SmolLM2-360M-Instruct locally through Transformers.js.
- No hosted AI inference API is used.

## Core knowledge

- Save facts and notes manually.
- Search the public web from chat using a no-key DuckDuckGo HTML search endpoint.\n- Read the top public result pages when accessible, then provide their text as context to the local model.\n- Submit public webpage URLs for text extraction.
- Retrieved page text and manual notes are saved in this browser's local storage.
- The latest Core knowledge is added to the model's prompt as reference context during chats.
- Red means Core is empty, yellow means a page inspection is in progress, and green means knowledge is saved.

Core knowledge is retrieval/context, not model training. Adding a note or webpage does not update the model's neural-network weights.

## Live web search and reader limitations\n\n- Search results come from DuckDuckGo's public HTML results page; no search API key is required.\n- Search results and page text are context for the local model, not guaranteed facts. The assistant should identify uncertainty and users should verify important information.\n- The Vercel serverless endpoints are in `api/search.js` and `api/inspect.js`.\n\n## Website reader limitations

The server can extract text from publicly accessible HTTP/HTTPS HTML and plain-text pages. It does not execute page JavaScript, sign into websites, access private accounts, or inspect arbitrary installed mobile apps. Some sites block automated requests or require JavaScript; those pages may not be readable. The reader rejects local/private network addresses and limits page size and request time.

## Scratch model foundation

The `model/` directory contains Ai's initial decoder-only Transformer, byte tokenizer, training script, and local inference script. These files define an experimental model initialized from random weights. It has not yet been trained into a useful assistant. Training requires a licensed text corpus and a suitable compute environment. The current browser chat uses a small pretrained model; the experimental scratch model is not yet trained or integrated.

## Privacy

Chat histories and Core knowledge are stored in the browser's local storage. When a URL is submitted in Core, the server requests that public page and returns extracted text to the browser. Do not add private or sensitive information to Core.
