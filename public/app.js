const form = document.getElementById("chat-form");
const input = document.getElementById("message-input");
const messages = document.getElementById("messages");
const sendButton = document.getElementById("send-button");
const statusText = document.getElementById("status");
const clearButton = document.getElementById("clear-chat");
const STORAGE_KEY = "ai-core-chat-v1";
let history = loadHistory();

function loadHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved.slice(-40) : [];
  } catch { return []; }
}

function saveHistory() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-40))); }
  catch { statusText.textContent = "Browser storage unavailable"; }
}

function addMessage(role, content) {
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
}

function renderHistory() {
  messages.replaceChildren();
  if (!history.length) {
    addMessage("assistant", "Hi. I'm Ai. I'm running locally in this project. Ask me a question or type 'help'.");
    return;
  }
  history.forEach(item => addMessage(item.role, item.content));
}

async function checkServer() {
  try {
    const response = await fetch("/api/health");
    if (!response.ok) throw new Error();
    statusText.textContent = "Online · Local engine";
  } catch { statusText.textContent = "Server connection unavailable"; }
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  const message = input.value.trim();
  if (!message || sendButton.disabled) return;
  history.push({ role: "user", content: message });
  addMessage("user", message);
  input.value = "";
  input.style.height = "auto";
  saveHistory();
  sendButton.disabled = true;
  statusText.textContent = "Ai is thinking…";
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history: history.slice(-12) })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Request failed");
    history.push({ role: "assistant", content: data.reply });
    addMessage("assistant", data.reply);
    saveHistory();
    statusText.textContent = "Online · Local engine";
  } catch (error) {
    const reply = `Connection error: ${error.message}. Check that the server is running.`;
    addMessage("assistant", reply);
    statusText.textContent = "Connection error";
  } finally {
    sendButton.disabled = false;
    input.focus();
  }
});

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
renderHistory();
checkServer();
