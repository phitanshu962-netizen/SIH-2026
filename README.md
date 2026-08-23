# NiyamAI — Bureau of Indian Standards Intelligence Platform

NiyamAI is a premium, AI-powered compliance and standards intelligence portal designed to streamline licensing, gap analysis, and statutory compliance for the **Bureau of Indian Standards (BIS)**. It serves manufacturers, MSMEs, importers, and consumers by automating standard matching, clause analysis, and regulatory tracking.

---

## 🌟 Visual Identity & Aesthetic
- **Visual Palette:** Clean Light Warm Background (`#FFFCF8`), Institutional Saffron/Orange (`#F28C52`), and Charcoal carbon text (`#242424`) conforming with Indian Government design guidelines.
- **Strict Guidelines:** Zero blue/neon elements anywhere to preserve institutional dignity and high-contrast accessibility.
- **Typography:** Grounded fonts (`Inter`, `Noto Sans Devanagari`, and `IBM Plex Sans`) to support high-fidelity multilingual content rendering.

---

## 🛠️ Key Modules (15 Compliance Suites)

1. **BIS Gap Analyzer (`/gap-analyzer`):** Upload product specification files to automatically score conformity against Indian Standards (IS), identifying severe gaps.
2. **Version Comparator (`/comparator`):** Compare standards side-by-side (e.g. IS 302-2-3:2017 vs 2024 edition) with highlighting of clause differences and estimated manufacturing cost impact.
3. **Product Standard Matcher (`/matcher`):** High-precision search matching raw product details to specific IS numbers and active Quality Control Orders (QCO).
4. **Clause Citations Explorer (`/citations`):** Deep-dive into specific standard clauses, exact legal excerpts, and official gazette URLs.
5. **Interactive Compliance Checklist (`/checklist`):** Auto-generates standard-specific checklists with interactive readiness scoring and action logs.
6. **Scheme & Statutory Navigator (`/services`):** Outlines eligibility and guidelines for Schemes (Scheme-I/ISI Mark, CRS, FMCS, Hallmarking) along with SLA rules.
7. **Statutory Logic Tree (`/explainability`):** Flowchart demonstrating why a standard applies, tracing legal authorities and hazard chains.
8. **QCO Alerts & Gazette Tracker (`/alerts`):** Central dashboard tracking upcoming mandatory compliance enforcement dates and official Gazette releases.
9. **Ask My PDF (`/ask-pdf`):** Custom RAG system allowing upload of private PDFs (like internal test reports) to chat and query them against verified regulations.
10. **7-Language Search (`/multilingual`):** Search and read standards in English, Hindi, Marathi, Gujarati, Tamil, Telugu, and Bengali.
11. **Interactive Voice Assistant (`/voice` or Dashboard Panel):** Voice-activated chatbot utilizing text-to-speech output and hands-free input.
12. **Timeline Roadmap (`/timeline`):** Step-by-step milestone planning indicating certification stages, tasks, and estimated days.
13. **Testing Requirement Mapper (`/testing-mapper`):** Maps testing parameters to the required laboratory equipment, sample sizes, and calibration logs.
14. **NABL & BIS Lab Finder (`/lab-finder`):** Map-based directory locating certified government and private testing centers in each state.
15. **Evidence Verifier (`/evidence-verifier`):** Validates AI assertions against cryptographic hashes and official Gazette text files for auditing.

---

## 💻 Tech Stack
- **Frontend/Backend:** Next.js 14 (App Router), React 18, TypeScript, TailwindCSS/PostCSS.
- **Database/Storage:** Firebase Firestore & Realtime DB (for logging, feedbacks, and custom standards ingestion).
- **Core AI RAG Engines:**
  1. **Primary:** Ollama Local LLMs (checks local port `http://localhost:11434` for active `llama3`/`mistral`/`gemma`).
  2. **Secondary:** Google Gemini API (`gemini-1.5-flash` via Native REST fetch requests).
  3. **Local Fallback:** Built-in **Grounded Neural RAG Engine** in `src/lib/ragEngine.ts` utilizing an indexed offline database of 20+ core standards. 100% uptime guaranteed without network or model keys.

---

## ⚡ Prerequisites

To run this project on a local system, ensure you have the following installed:
1. **Node.js:** v18.0.0 or higher (Tested on `v24.14.0`)
2. **npm:** v9.0.0 or higher (Tested on `v11.9.0`)
3. *(Optional)* **Ollama:** Installed locally if you wish to run completely offline local LLMs.
4. *(Optional)* **Gemini API Key:** If using Google Cloud artificial intelligence tools.

---

## 🚀 How to Run the Project

Follow these step-by-step instructions:

### 1. Extract and Navigate
Download/clone the repository and open your terminal (PowerShell, Command Prompt, or Bash) inside the project folder:
```bash
cd "SIH-2026"
```

### 2. Install Dependencies
Run the package manager to download the necessary frontend and development libraries:
```bash
npm install
```

### 3. Add Environment Variables (Optional)
Create a `.env` or `.env.local` file in the root directory to enable Gemini AI support. In standard mode without keys, the RAG engine functions completely fine using its local grounded database fallback.
```env
# Create .env.local and add your key:
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
```

### 4. Run the Development Server
Launch the local Next.js dev server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your web browser to access the local portal.

### 5. Build for Production (Verification & Deployment)
To build a production bundle and run the server in production mode:
```bash
# Build the optimized production bundle
npm run build

# Start the built production server
npm run start
```
The application will serve from Port `3000` with high caching speeds.
