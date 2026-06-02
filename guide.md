# Strategos AI — Execution and Setup Guide

This document outlines the commands to execute, when to run them, and where to run them to set up and run both the original Streamlit UI and the new futuristic Next.js application.

> [!NOTE]
> Since you already have the pre-extracted raw text ([raw_pages.json](file:///c:/Work_files/Projects/strategos-ai/data/raw_pages.json)) and pre-computed semantic chunks ([chunks.json](file:///c:/Work_files/Projects/strategos-ai/data/chunks.json)) in the `data/` directory, **you do not need to re-run the slow 30–60 minute extraction and chunking phases.** The ingestion script will automatically detect and skip them, proceeding straight to embedding and loading into Qdrant.

---

## 🛠️ Step 1: Start Background Services

Before running the ingestion pipeline or either of the web applications, start your local vector database and LLM server.

### 1. Vector Database (Qdrant)
* **Command:** 
  ```bash
  docker run -p 6333:6333 qdrant/qdrant
  ```
* **When:** First, before running any python ingestion or starting the web apps.
* **Where:** Run in any standard terminal (Command Prompt, PowerShell, Bash) or start via Docker Desktop.

### 2. Local LLM Server & Embedding Service (Ollama)
* **Command:**
  * Launch the **Ollama Desktop Application** or start the daemon on your system.
* **When:** Before running embedding ingestion or running the apps.
* **Where:** Your host system.

### 3. Pull Required Models
* **Commands:**
  * Pull the embedding model:
    ```bash
    ollama pull nomic-embed-text
    ```
  * Pull the local chunking/LLM model (optional, only if configured for local processing):
    ```bash
    ollama pull gemma3:4b
    ```
* **When:** Once Ollama is running (only needs to be run once).
* **Where:** Any terminal.

---

## 📦 Step 2: Environment and Dependencies

Set up your Python virtual environment and make sure all packages from [requirements.txt](file:///c:/Work_files/Projects/strategos-ai/requirements.txt) are installed.

### 1. Activate Python Virtual Environment
* **Command:**
  ```powershell
  .\.venv\Scripts\activate
  ```
* **When:** Always run this before running Python scripts or Streamlit commands.
* **Where:** In a PowerShell terminal opened in the project root directory: `c:\Work_files\Projects\strategos-ai`.

### 2. Install Project Dependencies
* **Command:**
  ```bash
  pip install -r requirements.txt
  ```
* **When:** Once the virtual environment is active (only needs to be run once, or if dependencies change).
* **Where:** Root directory: `c:\Work_files\Projects\strategos-ai`.

---

## 🔢 Step 3: Run Vector Ingestion

Generate embeddings and store the semantic chunks in Qdrant.

* **Command:**
  ```bash
  python run_ingestion.py
  ```
* **When:** After starting Qdrant & Ollama, pulling the `nomic-embed-text` model, and activating the virtual environment.
* **Where:** Root directory: `c:\Work_files\Projects\strategos-ai` (with `.venv` active).
* **Details:** This script runs [run_ingestion.py](file:///c:/Work_files/Projects/strategos-ai/run_ingestion.py) which leverages [embed.py](file:///c:/Work_files/Projects/strategos-ai/ingestion/embed.py). It reads the pre-computed `data/chunks.json`, creates a Qdrant collection named `strategos_laws`, embeds the chunks, and uploads them to your running Qdrant instance.

---

## 🏛️ Step 4: Choose Your Interface

You can run either the original Streamlit application or the new Next.js futuristic web experience.

### Option A: Futuristic Next.js App (New)
A premium, dark-themed, glassmorphic strategic chamber layout with custom animations and dashboard result cards.

1. Navigate to the `landing` directory:
   ```bash
   cd landing
   ```
2. Start the Next.js development server:
   ```bash
   npm run dev
   ```
3. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

### Option B: Original Streamlit App
A simple, single-page python interface.

1. Keep your terminal in the workspace root directory.
2. Run the Streamlit application:
   ```bash
   streamlit run streamlit_app.py
   ```
3. Open [http://localhost:8501](http://localhost:8501) in your browser.
