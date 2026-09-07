let card;
let statusTimer;
let lastSelectionRect;

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GET_SELECTION") {
    sendResponse(getSelectionData());
    return true;
  }
  if (message.type === "SHOW_LOADING") showLoading();
  if (message.type === "SHOW_RESULT") showResult(message.result);
  if (message.type === "SHOW_ERROR") showError(message.message);
});

function getSelectionData() {
  const selection = window.getSelection();
  const text = selection?.toString().trim() || "";
  const node = selection?.anchorNode?.parentElement;
  const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
  const rect = range?.getBoundingClientRect();
  lastSelectionRect = rect && rect.width + rect.height > 0 ? rect : null;
  const surrounding = node?.innerText?.replace(/\s+/g, " ").trim() || "";
  const selectedIndex = surrounding.toLowerCase().indexOf(text.toLowerCase());
  const context = selectedIndex >= 0
    ? surrounding.slice(Math.max(0, selectedIndex - 600), selectedIndex + text.length + 600)
    : surrounding.slice(0, 1200);
  return {
    text: text.slice(0, 500),
    context: context.slice(0, 1200),
    title: document.title
  };
}

function showLoading() {
  clearStatusTimer();
  showCard(`<div class="nr-progress"><span class="nr-spinner"></span><span>Thinking…</span></div>`, false, false, "nr-loading-card");
}

function showResult(result) {
  clearStatusTimer();
  const translation = typeof result === "string" ? result : result?.natural_translation;
  showCard(`<div class="nr-translation">${escapeHtml(translation || "No translation returned.")}</div><button class="nr-close" aria-label="Close">×</button>`, true, false, "nr-result-card");
}

function showError(message) {
  clearStatusTimer();
  showCard(`<div class="nr-error-title">Couldn’t translate</div><div class="nr-error-text">${escapeHtml(message)}</div><button class="nr-close" aria-label="Close">×</button>`, true, true, "nr-result-card");
}

function showCard(content, html = false, error = false, variant = "") {
  card?.remove();
  card = document.createElement("div");
  card.id = "natural-reader-card";
  card.className = `${variant} ${error ? "nr-error-card" : ""}`.trim();
  card.innerHTML = html ? content : content;
  document.documentElement.appendChild(card);
  positionCard();
  card.querySelector(".nr-close")?.addEventListener("click", closeCard);
  card.addEventListener("mousedown", (event) => event.stopPropagation());
}

function positionCard() {
  if (!card) return;
  card.style.left = "auto";
  card.style.top = "auto";
  card.style.right = "18px";
  card.style.bottom = "18px";
}

function closeCard() {
  clearStatusTimer();
  card?.remove();
  card = null;
}

function clearStatusTimer() {
  if (statusTimer) clearInterval(statusTimer);
  statusTimer = null;
}

document.addEventListener("mousedown", (event) => {
  if (card && !card.contains(event.target)) closeCard();
}, true);

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));
}
