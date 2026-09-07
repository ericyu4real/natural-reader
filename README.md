# Natural Reader

Local Manifest V3 Chrome extension that explains selected English in natural Simplified Chinese using OpenRouter.

## Run locally

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode**.
3. Click **Load unpacked** and choose this folder.
4. Open `config.local.js` and paste your OpenRouter API key into the constant.
5. Select English text on a webpage.
6. Right-click and choose **Explain in natural Chinese**, or press `Alt+Shift+T` (`MacCtrl+Shift+T` on macOS).

After editing files, click **Reload** on the extension page and reload the webpage.

## Notes

- The extension calls OpenRouter directly using its OpenAI-compatible chat-completions endpoint.
- The API key and model are hardcoded for this private local prototype. The current model is `google/gemini-3.8-flash`.
- Keep this extension private; anyone who can inspect it may be able to access the key.
- The prompt sends the selected text plus nearby page context so idioms and ambiguous words are interpreted in context.
- The source language is detected automatically; the output is always Simplified Chinese.
- Chrome internal pages such as `chrome://extensions` cannot run content scripts.
