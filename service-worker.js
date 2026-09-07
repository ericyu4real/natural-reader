importScripts("config.local.js");

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "google/gemini-3.8-flash";

function registerContextMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "natural-reader-translate",
      title: "Explain in natural Chinese",
      contexts: ["selection"]
    });
  });
}

chrome.runtime.onInstalled.addListener(registerContextMenu);
chrome.runtime.onStartup.addListener(registerContextMenu);
registerContextMenu();

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "natural-reader-translate" && tab?.id) await translateTabSelection(tab.id);
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "translate-selection") return;
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (tab?.id) await translateTabSelection(tab.id);
});

async function translateTabSelection(tabId) {
  try {
    const selection = await sendContentMessage(tabId, { type: "GET_SELECTION" }, true);
    if (!selection?.text?.trim()) throw new Error("请先选择一个英文单词、短语或句子。");
    await sendContentMessage(tabId, { type: "SHOW_LOADING" });
    const result = await translateWithOpenRouter(selection);
    await sendContentMessage(tabId, { type: "SHOW_RESULT", result });
  } catch (error) {
    console.error("Natural Reader failed", error);
    try { await sendContentMessage(tabId, { type: "SHOW_ERROR", message: error.message || "翻译失败。" }, true); } catch (_) {}
  }
}

async function sendContentMessage(tabId, message, injectIfMissing = false) {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch (error) {
    if (!injectIfMissing || !String(error?.message).includes("Receiving end does not exist")) throw error;
    await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
    await chrome.scripting.insertCSS({ target: { tabId }, files: ["content.css"] });
    return await chrome.tabs.sendMessage(tabId, message);
  }
}

async function translateWithOpenRouter(selection) {
  if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY === "PASTE_YOUR_OPENROUTER_KEY_HERE") {
    throw new Error("请在 config.local.js 中填写 OpenRouter API Key。");
  }

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": "https://local.natural-reader",
      "X-OpenRouter-Title": "Natural Reader"
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.1,
      max_tokens: 512,
      reasoning: { effort: "low" },
      messages: [
        {
          role: "system",
          content: "Automatically detect the source language. Translate only the selected content into natural, native-sounding Simplified Chinese. Use the surrounding context to understand its meaning, but do not translate the surrounding context. Return only the translation."
        },
        {
          role: "user",
          content: `SELECTED TEXT (answer only this):\n${selection.text}\n\nSURROUNDING CONTEXT (use only to infer meaning):\n${selection.context}`
        }
      ]
    })
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || `OpenRouter request failed (${response.status})`);
  const message = data?.choices?.[0]?.message;
  const content = typeof message?.content === "string"
    ? message.content
    : Array.isArray(message?.content)
      ? message.content.map((part) => typeof part === "string" ? part : part?.text || "").join("")
      : "";
  if (!content.trim()) {
    const reason = data?.choices?.[0]?.finish_reason || data?.choices?.[0]?.native_finish_reason || "unknown";
    throw new Error(`模型返回了空结果（finish reason: ${reason}）。`);
  }
  return { natural_translation: content.trim() };
}
