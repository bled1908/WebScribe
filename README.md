<div align="center">

# 🧠 WebScribe

**Convert any webpage into clean, structured Markdown or PDF notes — one click, offline-ready.**

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white&style=flat-square)](https://developer.chrome.com/docs/extensions/)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-818cf8?style=flat-square)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![License: MIT](https://img.shields.io/badge/License-MIT-a78bfa?style=flat-square)](LICENSE)

</div>

---

## ✨ What It Does

WebScribe reads the **actual rendered DOM** of any webpage — even when right-click or copy is blocked — and turns it into clean, structured notes.

| Problem | WebScribe Fix |
|---|---|
| Sites block copy/paste | Reads DOM directly (always visible to browser) |
| "Save as PDF" produces ugly dumps | Renders a styled, note-style PDF |
| Content scattered across tabs | One-click export per page |
| Notion/Obsidian need clean Markdown | Outputs Obsidian-ready MD with frontmatter + TOC |

---

## 🚀 Install (Developer Mode)

1. Clone or download this repository
2. Generate icons: open `generate-icons.html` in Chrome → click **Download All Icons** → save to `assets/`
3. Go to `chrome://extensions/` → enable **Developer Mode** (top right)
4. Click **Load unpacked** → select the `WebScribe` folder
5. The extension icon appears in your Chrome toolbar

---

## ⚙️ How to Use

1. Navigate to any article, doc, tutorial, or blog
2. Click the **WebScribe** icon in the toolbar
3. Choose your export format: **Markdown** or **PDF**
4. Toggle options (TOC, Images, AI Summary)
5. Click **Extract & Export** — done!

---

## 🏗️ Architecture

```
WebScribe/
├── manifest.json               ← Chrome MV3 manifest
│
├── popup/
│   ├── popup.html              ← Extension popup UI
│   ├── popup.css               ← Dark glassmorphism styles
│   └── popup.js                ← UI controller + orchestration
│
├── content/
│   └── content.js              ← DOM extraction content script
│
├── lib/
│   ├── Readability.js          ← Mozilla Readability (bundled, MIT)
│   ├── markdown-generator.js   ← Structured content → Markdown
│   ├── pdf-generator.js        ← Structured content → styled PDF
│   └── ai-assistant.js         ← Local heuristic AI (no API key)
│
├── background/
│   └── background.js           ← MV3 service worker (message routing)
│
└── assets/
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

### Data Flow

```
Browser Page (rendered DOM)
    ↓
Content Script (content.js)
    ✓ Readability.js extraction
    ✓ Heuristic fallback
    ✓ Noise removal (ads, nav, footer…)
    ↓
Structured Content Model
    [{ type, text, level, items, code, src … }]
    ↓
         ┌──────────────────┬──────────────────┐
         ▼                  ▼                  ▼
  Markdown Generator   PDF Generator    AI Assistant
   (Obsidian-ready)   (styled HTML →   (local heuristics)
                       print dialog)
         ↓                  ↓
      .md file         Print/Save PDF
```

---

## 📦 Exported Markdown Example

```markdown
---
title: "Introduction to Machine Learning"
source: "https://en.wikipedia.org/wiki/Machine_learning"
date: 2026-02-23
tags: [webscribe]
---

## Contents

- [Overview](#overview)
- [Approaches](#approaches)
- [Applications](#applications)

## Overview

Machine learning (ML) is a field of study in artificial intelligence…

## ✨ AI-Generated Notes

### Summary
Machine learning is a branch of AI that enables systems to learn from data…

### Key Points
- Supervised learning requires labeled training data
- Neural networks are inspired by biological brain structure
```

---

## 🎛️ Features

### Core (Phase 1 — Implemented)
- ✅ Smart content extraction via Mozilla Readability
- ✅ Copy-restriction bypass (DOM is always readable)
- ✅ Markdown export: headings, paragraphs, lists, code blocks, tables, images
- ✅ YAML frontmatter (Obsidian-compatible)
- ✅ Auto-generated Table of Contents
- ✅ Styled PDF with print dialog (selectable text, no rasterization)
- ✅ AI-powered summary, key points & definitions (local, no API key)
- ✅ Dark glassmorphism UI with one-click UX
- ✅ Zero login, zero tracking, fully offline

### Planned (Phase 2)
- [ ] Custom note templates (study / research / tutorial)
- [ ] Obsidian vault direct-save integration
- [ ] Highlight & annotate before export
- [ ] LLM API integration (OpenAI / Gemini) for deep summaries
- [ ] Batch tab export

---

## 🛡️ Privacy

- No data leaves your browser (unless AI API is enabled in a future version)
- No account, no servers, no analytics
- Content scripts run only on user-triggered extraction

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| Extension Platform | Chrome Manifest V3 |
| Content Extraction | Mozilla Readability.js (MIT) |
| Language | Vanilla JavaScript (no build step) |
| Styling | CSS custom properties + glassmorphism |
| PDF Export | Browser native print engine |

---

## 📄 License

MIT © WebScribe Contributors

---

<div align="center">
Built for students, developers, and researchers who want to turn passive reading into structured knowledge.
</div>
