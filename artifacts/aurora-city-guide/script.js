// Keep list items in this page's memory; they are not saved to the browser.
const likesForm = document.querySelector("#likes-form");
const likeInput = document.querySelector("#like-input");
const likesList = document.querySelector("#likes-list");
const emptyMessage = document.querySelector("#empty-message");

// Add one trimmed item and create a matching remove button.
function addLike(value) {
  const itemText = value.trim();
  if (!itemText) return;

  const item = document.createElement("li");
  const text = document.createElement("span");
  text.textContent = itemText;

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "remove-like";
  removeButton.setAttribute("aria-label", `Remove ${itemText}`);
  removeButton.textContent = "×";
  removeButton.addEventListener("click", () => {
    item.remove();
    showEmptyMessageIfNeeded();
  });

  item.append(text, removeButton);
  likesList.append(item);
  emptyMessage.hidden = true;
  likeInput.value = "";
  likeInput.focus();
}

// Bring back the gentle empty state after the last item is removed.
function showEmptyMessageIfNeeded() {
  emptyMessage.hidden = likesList.querySelectorAll("li:not(#empty-message)").length > 0;
}

// A form submit works for both the Add button and Enter key.
likesForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addLike(likeInput.value);
});

// Make the bird image keyboard-operable as well as clickable.
const bird = document.querySelector(".bird");
function shakeBird() {
  bird.classList.remove("shake");
  // Reflow allows a second activation to replay the same CSS animation.
  void bird.offsetWidth;
  bird.classList.add("shake");
}

bird.addEventListener("click", shakeBird);
bird.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    shakeBird();
  }
});
bird.addEventListener("animationend", () => bird.classList.remove("shake"));

// Chat history lives only in this page session; the server receives a small recent slice.
const chatForm = document.querySelector("#chat-form");
const chatInput = document.querySelector("#chat-message");
const chatTranscript = document.querySelector("#chat-transcript");
const chatStatus = document.querySelector("#chat-status");
const sendButton = document.querySelector("#send-message");
const clearChatButton = document.querySelector("#clear-chat");
const systemPromptContent = document.querySelector("#system-prompt-content");
const conversation = [];
let isSending = false;

const maxTokensInput = document.querySelector("#max-output-tokens");

// Keep the output limit visible as it moves, and send it as a number.
function syncSettingLabels() {
  document.querySelector("#max-output-tokens-value").textContent = maxTokensInput.value;
}

maxTokensInput.addEventListener("input", syncSettingLabels);

function getSettings() {
  return {
    maxOutputTokens: Number(maxTokensInput.value),
  };
}

// Build every message with textContent so user and model text stays plain text.
function addChatMessage(role, content, answerDetails) {
  const item = document.createElement("li");
  item.className = `message-item ${role === "user" ? "user-message" : "model-message"}`;

  const label = document.createElement("span");
  label.className = "message-overline";
  label.textContent = role === "user" ? "YOU ASKED" : "THE GUIDE";

  const copy = document.createElement("p");
  copy.className = "message-copy";
  copy.textContent = content;
  item.append(label, copy);

  if (role === "assistant" && answerDetails) {
    const metadata = document.createElement("div");
    metadata.className = "answer-meta";
    metadata.setAttribute("aria-label", "Answer details");

    const modelLine = document.createElement("span");
    modelLine.textContent = `Model: ${answerDetails.model || "Not reported"}`;
    const settings = answerDetails.settings && typeof answerDetails.settings === "object"
      ? answerDetails.settings
      : {};
    const settingsLine = document.createElement("span");
    settingsLine.textContent = `Max output tokens: ${settings.maxOutputTokens ?? "—"}`;
    const usage = answerDetails.usage && typeof answerDetails.usage === "object"
      ? answerDetails.usage
      : {};
    const inputTokens = usage.promptTokenCount ?? usage.inputTokens;
    const outputTokens = usage.candidatesTokenCount ?? usage.outputTokens;
    const totalTokens = usage.totalTokenCount ?? usage.totalTokens;
    const usageParts = [];
    if (inputTokens !== undefined && inputTokens !== null) usageParts.push(`input ${inputTokens}`);
    if (outputTokens !== undefined && outputTokens !== null) usageParts.push(`output ${outputTokens}`);
    if (totalTokens !== undefined && totalTokens !== null) usageParts.push(`total ${totalTokens}`);
    const usageLine = document.createElement("span");
    usageLine.textContent = `Token usage: ${usageParts.length ? usageParts.join(" · ") : "Not reported"}`;
    metadata.append(modelLine, settingsLine, usageLine);

    if (usage.truncated === true) {
      const cutoff = document.createElement("div");
      cutoff.className = "cutoff-note";
      cutoff.textContent = "This answer reached its output limit and may be cut off. Ask a follow-up for the rest.";
      metadata.append(cutoff);
    }
    item.append(metadata);
  }

  chatTranscript.append(item);
  chatTranscript.scrollTop = chatTranscript.scrollHeight;
}

function showChatError(message) {
  chatStatus.className = "chat-status error";
  chatStatus.textContent = message;
}

function setChatBusy(busy) {
  isSending = busy;
  chatInput.disabled = busy;
  sendButton.disabled = busy;
  sendButton.setAttribute("aria-busy", String(busy));
  clearChatButton.disabled = busy || conversation.length === 0;
  if (busy) {
    chatStatus.className = "chat-status loading";
    chatStatus.textContent = "The guide is thinking…";
  } else if (chatStatus.classList.contains("loading")) {
    chatStatus.className = "chat-status";
    chatStatus.textContent = "";
  }
}

// Limit both the number and size of previous turns in each request.
function getRecentHistory() {
  return conversation.slice(-10).map((entry) => ({
    role: entry.role,
    content: entry.content.slice(-1000),
  }));
}

function friendlyError(errorMessage, responseStatus) {
  const message = String(errorMessage || "");
  if (/CLAUDE_API_KEY|api.?key|not configured|configuration/i.test(message)) {
    return "Add a Claude_API_Key secret in Replit Secrets and restart the API server to enable the guide. Keep the key private.";
  }
  if (responseStatus === 404) {
    return "The chat service is not available right now. Please try again later.";
  }
  return "The guide could not answer just now. Check your connection and try again.";
}

// Load the read-only prompt viewer independently from chat availability.
fetch("/api/chat/system-prompt")
  .then(async (response) => {
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Prompt unavailable");
    return data;
  })
  .then((data) => {
    systemPromptContent.textContent = typeof data.systemPrompt === "string" && data.systemPrompt
      ? data.systemPrompt
      : "No system prompt was provided.";
  })
  .catch(() => {
    systemPromptContent.textContent = "The system prompt is unavailable right now. You can still try asking the guide.";
  });

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (isSending) return;

  const message = chatInput.value.trim();
  if (!message) {
    chatInput.focus();
    return;
  }

  const history = getRecentHistory();
  addChatMessage("user", message);
  chatInput.value = "";
  chatStatus.textContent = "";
  setChatBusy(true);

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history, settings: getSettings() }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.error) {
      throw Object.assign(new Error(data.error || "Chat request failed"), { status: response.status });
    }
    if (typeof data.reply !== "string" || !data.reply.trim()) {
      throw Object.assign(new Error("The response was empty"), { status: response.status });
    }

    conversation.push({ role: "user", content: message }, { role: "assistant", content: data.reply });
    addChatMessage("assistant", data.reply, {
      model: data.model,
      settings: data.settings || getSettings(),
      usage: data.usage,
    });
    clearChatButton.disabled = false;
    chatStatus.textContent = "";
  } catch (error) {
    showChatError(friendlyError(error.message, error.status));
  } finally {
    setChatBusy(false);
    if (conversation.length > 0) clearChatButton.disabled = false;
    chatInput.focus();
  }
});

clearChatButton.addEventListener("click", () => {
  if (isSending) return;
  conversation.length = 0;
  chatTranscript.replaceChildren();
  const welcome = document.createElement("li");
  welcome.className = "chat-welcome";
  const label = document.createElement("span");
  label.className = "message-overline";
  label.textContent = "FIELD NOTE 01";
  const copy = document.createElement("p");
  copy.textContent = "What are you curious about? I can help you find a starting point in Aurora.";
  welcome.append(label, copy);
  chatTranscript.append(welcome);
  chatStatus.textContent = "";
  chatStatus.className = "chat-status";
  clearChatButton.disabled = true;
  chatInput.focus();
});
