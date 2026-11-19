function tokenize(input) {
  const tokens = input.match(/\d+(?:\.\d+)?|[()+*/-]/g);
  if (!tokens || tokens.join("") !== input.replace(/\s+/g, "")) {
    throw new Error("Invalid expression");
  }
  return tokens;
}

function calculate(expression) {
  const tokens = tokenize(expression);
  let index = 0;

  function primary() {
    const token = tokens[index++];
    if (token === "(") {
      const value = sum();
      if (tokens[index++] !== ")") throw new Error("Missing closing parenthesis");
      return value;
    }
    if (token === "-") return -primary();
    if (token === "+") return primary();
    const value = Number(token);
    if (!Number.isFinite(value)) throw new Error("Invalid number");
    return value;
  }

  function product() {
    let value = primary();
    while (tokens[index] === "*" || tokens[index] === "/") {
      const operator = tokens[index++];
      const next = primary();
      if (operator === "/" && next === 0) throw new Error("Division by zero");
      value = operator === "*" ? value * next : value / next;
    }
    return value;
  }

  function sum() {
    let value = product();
    while (tokens[index] === "+" || tokens[index] === "-") {
      const operator = tokens[index++];
      const next = product();
      value = operator === "+" ? value + next : value - next;
    }
    return value;
  }

  const result = sum();
  if (index !== tokens.length || !Number.isFinite(result)) throw new Error("Invalid expression");
  return Number(result.toPrecision(12));
}

function generateReply(message, history = []) {
  const text = message.trim();
  const lower = text.toLowerCase();
  const nameMatch = lower.match(/\b(?:my name is|call me)\s+([a-z0-9_-]{1,30})/i);

  if (nameMatch) return `Got it. I'll call you ${nameMatch[1]} in this conversation.`;
  if (/^(hi|hello|hey|yo|good morning|good afternoon|good evening)[!. ]*$/i.test(text)) {
    return "Hello. I'm Ai, a locally running assistant. What would you like to work on?";
  }
  if (/\b(what are you|who are you|introduce yourself)\b/.test(lower)) {
    return "I'm Ai, an independent assistant running on this project. Right now I use a small local rule-based engine, not a trained large language model or an external AI API.";
  }
  if (/\b(help|what can you do|commands)\b/.test(lower)) {
    return "I can chat, remember the recent messages in this browser, answer simple questions, explain basic concepts, and calculate arithmetic. This starter version is limited; it does not yet have a trained language model or live internet access.";
  }
  if (/\b(time|date|day)\b/.test(lower) && /\b(what|current|today|now)\b/.test(lower)) {
    return `The server's current date and time is ${new Date().toLocaleString()}.`;
  }

  const mathText = text
    .replace(/,/g, "")
    .replace(/^(what is|calculate|solve|compute)\s+/i, "")
    .replace(/[?=]$/g, "")
    .trim();
  if (/^[\d\s()+*/.-]+$/.test(mathText) && /\d/.test(mathText) && /[+*/-]/.test(mathText)) {
    try { return `The answer is ${calculate(mathText)}.`; }
    catch (error) { return error.message === "Division by zero" ? "Division by zero is undefined." : "I couldn't parse that calculation."; }
  }

  const previousUserMessages = history.filter(item => item && item.role === "user").length;
  if (/\b(thank you|thanks|thx)\b/.test(lower)) return "You're welcome. What else would you like to figure out?";
  if (/\b(remember|earlier|before|previously)\b/.test(lower) && history.length) {
    const recent = history.filter(item => item && item.role === "user").slice(-3).map(item => item.content);
    if (recent.length) return `I can see these recent messages in the conversation: ${recent.join(" | ")}`;
  }

  return previousUserMessages
    ? "I can follow the recent conversation, but my current local engine doesn't understand open-ended language very well yet. Try asking a simple question, asking for an explanation, or entering a calculation."
    : "I'm still a basic local assistant. Try asking me to calculate something, explain a simple topic, or type 'help' to see what I can do.";
}

module.exports = { generateReply };
