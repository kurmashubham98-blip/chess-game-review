# ♟️ Chess Game Review Extension

A 100% free, private, and local Chrome Extension that replicates the premium "Game Review" feature of popular chess sites.

This extension runs entirely in your browser using WebAssembly. No data is sent to external servers, and it requires no subscriptions or paid APIs to function.

## ✨ Features
- **Local Stockfish 18 Analysis**: Professional-grade evaluation powered by Stockfish WASM running in a background Web Worker.
- **Move Classification**: Categorizes every move using an Expected Points Model (Brilliant, Great, Best, Excellent, Good, Inaccuracy, Mistake, Blunder, Miss).
- **Interactive Eval Graph**: A click-to-navigate chart showing your win probability over time.
- **Custom UI**: A beautiful, dark-themed dashboard built from scratch.
- **Advanced AI Coach (Optional)**: Bring your own free Google Gemini API key to get human-like, Socratic explanations of your mistakes. 

## 🚀 How to Install (For Chrome / Brave / Edge)

Since this is a free open-source project, it is not listed on the Chrome Web Store. Installing it manually takes just 30 seconds:

1. Click the green **Code** button at the top of this page and select **Download ZIP**.
2. Extract the ZIP file to a folder on your computer.
3. Open your browser and navigate to `chrome://extensions/`.
4. Turn on **Developer mode** (the toggle switch in the top right corner).
5. Click the **Load unpacked** button in the top left.
6. Select the folder you just extracted.
7. The extension is now installed! Click the puzzle icon 🧩 in your browser toolbar to pin it.

## 🛠️ How to Use
1. Click the extension icon to open the Game Review tab.
2. Copy a PGN (Portable Game Notation) of your game from any chess website.
3. Paste the PGN into the input box and click **⚡ Analyze Game**.
4. Use your arrow keys (`←` and `→`) to navigate through the moves.

## 🤖 Advanced AI Coach Setup (Optional)
By default, the coach will use a built-in heuristic engine to give you feedback (e.g., pointing out missed mates and blunders). If you want more detailed, natural-language coaching:

1. Get a free API key from [Google AI Studio](https://aistudio.google.com/).
2. Open the extension and click the **Settings ⚙** icon.
3. Paste your API key into the Advanced AI Coach field and click Save.
4. The extension will now use Gemini 1.5 Flash to provide personalized feedback on your moves!

## 🔐 Privacy
This extension is completely local. The Stockfish engine runs directly in your browser. Unless you explicitly provide an API key for the optional AI Coach feature, **absolutely zero data** leaves your computer. 

---
*Created by [kurmashubham98-blip](https://github.com/kurmashubham98-blip)*
