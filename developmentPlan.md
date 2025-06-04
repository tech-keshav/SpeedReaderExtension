# 🧠 Extension Intent and Optimization Blueprint: Speed Reader

## 🧭 Purpose
To create a seamless, distraction-free, and intelligent speed reading experience—right inside the browser. Designed for:
- Regular websites
- EPUB files
- Major digital reading platforms (e.g., **Google Play Books**, **Kindle Cloud Reader**)

The core utility is to **highlight text—word-by-word or in meaningful groups—at a pace that trains the brain** to process faster, without mental fatigue or cognitive dissonance.

---

## 🛠️ Existing Features

✅ Highlights **pasted text** and **on-page text** using controlled timing.

✅ Adjustable:
- **Words Per Minute (WPM)**
- **Words Per Group**

✅ Functions well on standard websites and with pasted content.

---

## ❌ Key Gaps + Fix Intentions

### 1. 📚 EPUB + Platform Compatibility

**Current Issue:**  
Fails on platforms like **Google Play Books** and **Kindle Reader**. Renders a blank page due to iframe/canvas rendering or shadow DOM.

**Intent:**  
Support deep, DOM-unfriendly environments like virtualized readers.

**Proposed Fixes:**
- Use `MutationObserver` to track dynamic DOM changes inside iframes or shadow roots.
- Traverse and hook into `shadowRoot` if present.
- For canvas-based platforms (like Play Books), explore lightweight OCR layers (e.g., `Tesseract.js`) to extract rendered text and apply highlights on a separate visual overlay.

---

### 2. ⚙️ Mechanical Feel in Speed Settings

**Current Issue:**  
Manually selecting WPM and word group sizes feels arbitrary and unintuitive.

**Intent:**  
Make reading speed feel intelligent, not like configuring an engine.

**Fix:**
Introduce 3 intuitive **preset modes**:
- 🐢 **Comprehend Mode**: 150 WPM | 4 words/group
- 🚶 **Focus Mode**: 250 WPM | 6 words/group
- 🚀 **Blitz Mode**: 400+ WPM | 10+ words/group

Allow manual override **after** presets are introduced—making the system feel adaptive, not overwhelming.

---

### 3. 🎨 Primitive UI Design

**Current Look:**  
Functional but minimal and non-inviting.

**Intent:**  
Refine into a **modern, elegant reader assistant** that’s enjoyable for everyday use.

**Proposed UI Upgrades:**
- Use modern fonts (e.g., **Inter**, **DM Sans**)
- Add a **progress bar** with pulsing animation
- Show **estimated read time** before start
- Toggle **Dark/Light Mode**
- Add **keyboard shortcuts**:
  - `Space` = Pause/Play  
  - `Esc` = Stop  
  - `↑↓` = Adjust WPM  
  - `←→` = Navigate highlights  

---

### 4. 🧠 Context-Aware Highlight Grouping

**The Big One: Make it read like the mind reads.**

#### 🧩 Current Problem:
- “Words per group” is technically adjustable but **linguistically blind**.
- Breaks ideas mid-thought.
- Distracts from comprehension at any speed.

#### 🎯 Core Intent:
Chunk by **meaning**, not word count. Let each highlight feel like one clear, digestible idea.

#### 🔧 Feature: “Smart Chunks” Mode (Default)
Highlights:
- Phrases that form **mini-sentences** or **complete thoughts**
- Based on sentence structure, punctuation, and phrase boundaries
- Falls back to fixed chunking if no clear split is found

#### 🛠️ Implementation Plan:
- Use lightweight **NLP segmentation**:
  - Libraries: `compromise.js`, `nlp.js`, or regex-based sentence boundary detectors
- If sentence/phrase length ≤ X characters or Y words, group it entirely
- Detect and chunk at:
  - Commas, semicolons
  - Coordinating conjunctions (and, but, so)
  - Clause boundaries
  - Prepositional phrases

#### 📌 Toggle Options:
- 🧱 **Fixed Chunks**
- 🧠 **Smart Chunks** (recommended)

#### 🧪 Example:
**Original sentence:**
> “Although the rain poured, she kept walking toward the flickering lights.”

**🧠 Smart Chunking:**
- “Although the rain poured,”  
- “she kept walking”  
- “toward the flickering lights.”

**📉 Dumb Chunking (5-word fixed):**
- “Although the rain poured, she”  
- “kept walking toward the flickering”  
- “lights.”

Smart Chunking = better cognition & smoother read.

---

### 5. 📈 Optional - Reader Retention & Feedback Loop

**What’s Missing:**  
No feedback system to track improvement or reinforce memory.

**Proposed Additions:**
- After reading:
  > _“You read 425 words in 1.2 minutes. Want to level up?”_
- Option to turn on **flashcard recall**:
  - Popup every X minutes
  - Asks 1–2 simple recall questions to boost retention if used for study

---

## 🔚 Summary

This isn’t just about reading faster.  
It’s about **reading smarter, smoother, and with joy**.  
With NLP-driven logic, modern UI, platform compatibility, and cognitive science behind the scenes, this Speed Reader can become a **next-gen digital reading assistant**—not just another browser add-on.

---

### 📂 Ready for Dev Planning?
Create GitHub Issues or a Trello roadmap from this.  
Break down into:  
- UI/UX Enhancements  
- NLP Highlighting Engine  
- Platform Compatibility Layer  
- Preset Config Modes  
- Optional Recall Layer

Let’s build the tool the brain actually wants.