# Ai Core

Ai is an independent chat application that runs an open-weight language model directly in the user's browser. The project does not call OpenAI, Gemini, or another hosted AI inference API.

## Run in GitHub Codespaces

1. Open the repository in Codespaces.
2. Run `npm start`.
3. Open the forwarded port 3000 in your browser.

## First launch

1. Open the app over its HTTPS Codespaces address.
2. Wait for the GPU check.
3. Select **Load model**.
4. The browser downloads the Qwen2.5 0.5B Instruct model (approximately 1 GB of model memory, depending on runtime files) and caches it for later use.
5. Keep the page open while it downloads and initializes.

## How it works

- `server.js` only serves the website files.
- `public/app.js` loads WebLLM in the browser and runs inference locally through WebGPU.
- Model weights are downloaded from the public model repository on first use and cached by the browser.
- Chat history is stored in the current browser's local storage.
- The app streams generated responses into the chat interface.

## Requirements and limitations

- A modern browser with working WebGPU support is required.
- The first model download is large and needs an internet connection.
- The model uses device GPU memory and may be slow or unavailable on some phones and tablets.
- The 0.5B model is a compact starter model; it is much less capable than large hosted assistants and can make mistakes.
- If WebGPU is unavailable, the app will explain that the device cannot load the model. No remote AI API fallback is included.

## Project structure

- `server.js` — static web server only; no chat inference endpoint.
- `ai.js` — legacy rule-based engine, no longer used by the chat interface.
- `public/index.html` — chat page.
- `public/style.css` — interface styling.
- `public/app.js` — local WebLLM loading, inference, streaming, and browser history.

## Privacy

Prompts are passed to the model running in the browser, not to an AI inference API. Model files are downloaded from the model host. Conversation history is stored in the current browser's local storage and is not written to the Node.js server.
