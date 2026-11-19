const form = document.getElementById("chat-form");
const input = document.getElementById("message-input");
const messages = document.getElementById("messages");
const sendButton = document.getElementById("send-button");
const statusText = document.getElementById("status");
const clearButton = document.getElementById("clear-chat");
const loadButton = document.getElementById("load-model");
const STORAGE_KEY = "ai-core-chat-v2";
const MODEL_ID = "Qwen2.5-0.5B-Instruct-q4f16_1-MLC";
const SYSTEM_PROMPT = "You are Ai, a helpful, clear, honest general-purpose assistant. Answer the user's actual question, explain your reasoning briefly when useful, and admit uncertainty. You can help with learning, writing, planning, and programming. Do not claim to have browsed the internet or performed actions you did not perform.";
let history = loadHistory();
let engine = null;
let loading = false;
let generating = false;

function loadHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved.filter(x => x && ["user", "assistant"].includes(x.role) && typeof x.content === "string").slice(-40) : [];
  } catch { return []; }
}

function saveHistory() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-40))); }
  catch { statusText.textContent = "Browser storage unavailable"; }
}

function addMessage(role, content = "") {
  const article = document.createElement("article");
  article.className = `message ${role}`;
  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = role === "assistant" ? "A" : "You";
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  const label = document.createElement("strong");
  label.textContent = role === "assistant" ? "Ai" : "You";
  const paragraph = document.createElement("p");
  paragraph.textContent = content;
  bubble.append(label, paragraph);
  article.append(avatar, bubble);
  messages.append(article);
  messages.scrollTop = messages.scrollHeight;
  return paragraph;
}

function renderHistory() {
  messages.replaceChildren();
  if (!history.length) {
    addMessage("assistant", "Hi. I'm Ai. Load my local model to start chatting. The first model download is large, but it is cached by your browser.");
    return;
  }
  history.forEach(item => addMessage(item.role, item.content));
}

async function checkWebGPU() {
  if (!("gpu" in navigator)) {
    statusText.textContent = "WebGPU unavailable in this browser";
    loadButton.disabled = true;
    loadButton.textContent = "WebGPU unavailable";
    return false;
  }
  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error("No compatible GPU adapter was found.");
    statusText.textContent = "GPU ready · Model not loaded";
    loadButton.disabled = false;
    return true;
  } catch (error) {
    statusText.textContent = error.message || "WebGPU is unavailable";
    loadButton.disabled = true;
    loadButton.textContent = "GPU unavailable";
    return false;
  }
}

async function loadModel() {
  if (loading || engine) return;
  loading = true;
  loadButton.disabled = true;
  loadButton.textContent = "Loading model…";
  statusText.textContent = "Downloading model files. Keep this page open…";
  try {
    const { CreateMLCEngine } = await import("https://esm.sh/@mlc-ai/web-llm@0.2.89");
    engine = await CreateMLCEngine(MODEL_ID, {
      initProgressCallback: progress => {
        const detail = progress.text || "Preparing local model…";
        statusText.textContent = detail;
        loadButton.textContent = "Loading…";
      }
    });
    statusText.textContent = "Ready · Running locally on this device";
    loadButton.textContent = "Model ready";
    loadButton.hidden = true;
    input.disabled = false;
    sendButton.disabled = false;
    input.placeholder = "Message Ai...";
    input.focus();
  } catch (error) {
    engine = null;
    statusText.textContent = `Could not load model: ${error.message || error}`;
    loadButton.disabled = false;
    loadButton.textContent = "Retry model download";
  } finally {
    loading = false;
  }
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  const message = input.value.trim();
  if (!message || generating) return;
  if (!engine) {
    statusText.textContent = "Load the local model before chatting.";
    return;
  }

  history.push({ role: "user", content: message });
  addMessage("user", message);
  input.value = "";
  input.style.height = "auto";
  saveHistory();
  generating = true;
  sendButton.disabled = true;
  loadButton.disabled = true;
  statusText.textContent = "Ai is thinking…";
  const responseNode = addMessage("assistant", "");

  try {
    const chatMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.slice(-16).map(item => ({ role: item.role, content: item.content }))
    ];
    const stream = await engine.chat.completions.create({
      messages: chatMessages,
      temperature: 0.7,
      max_tokens: 600,
      stream: true
    });
    let reply = "";
    for await (const chunk of stream) {
      reply += chunk.choices?.[0]?.delta?.content || "";
      responseNode.textContent = reply;
      messages.scrollTop = messages.scrollHeight;
    }
    if (!reply.trim()) reply = "I couldn't generate a response. Please try again.";
    responseNode.textContent = reply;
    history.push({ role: "assistant", content: reply });
    saveHistory();
    statusText.textContent = "Ready · Local model";
  } catch (error) {
    responseNode.textContent = `Generation error: ${error.message || error}`;
    statusText.textContent = "Generation failed";
  } finally {
    generating = false;
    sendButton.disabled = false;
    loadButton.disabled = false;
    input.focus();
  }
});

loadButton.addEventListener("click", loadModel);
input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height = `${Math.min(input.scrollHeight, 140)}px`;
});
input.addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});
clearButton.addEventListener("click", () => {
  history = [];
  saveHistory();
  renderHistory();
});

input.disabled = true;
sendButton.disabled = true;
renderHistory();
checkWebGPU();
