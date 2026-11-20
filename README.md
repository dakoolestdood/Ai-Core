# Ai Core

Ai is a browser-based chat application with a local language model and a separate Core knowledge workspace.

## Run in GitHub Codespaces

1. Open the repository in Codespaces.
2. Run `git pull origin main` if the Codespace already exists.
3. Run `npm start`.
4. Open forwarded port 3000.

## Chat

- Chat-style interface with multiple locally saved conversations.
- The browser runs the current Qwen2.5 0.5B model through WebLLM and WebGPU.
- No hosted AI inference API is used.

## Core knowledge

- Save facts and notes manually.
- Submit one or multiple public webpage URLs for text extraction.
- Retrieved page text and manual notes are saved in this browser's local storage.
- The latest Core knowledge is added to the model's prompt as reference context during chats.
- Red means Core is empty, yellow means a page inspection is in progress, and green means knowledge is saved.

Core knowledge is retrieval/context, not model training. Adding a note or webpage does not update the model's neural-network weights.

## Website reader limitations

The server can extract text from publicly accessible HTTP/HTTPS HTML and plain-text pages. It does not execute page JavaScript, sign into websites, access private accounts, or inspect arbitrary installed mobile apps. Some sites block automated requests or require JavaScript; those pages may not be readable. The reader rejects local/private network addresses and limits page size and request time.

## Scratch model foundation

The `model/` directory contains Ai's initial decoder-only Transformer, byte tokenizer, training script, and local inference script. These files define an experimental model initialized from random weights. It has not yet been trained into a useful assistant. Training requires a licensed text corpus and a suitable compute environment. The existing browser chat still uses Qwen until the scratch model is trained, exported, and integrated.

## Privacy

Chat histories and Core knowledge are stored in the browser's local storage. When a URL is submitted in Core, the server requests that public page and returns extracted text to the browser. Do not add private or sensitive information to Core.
