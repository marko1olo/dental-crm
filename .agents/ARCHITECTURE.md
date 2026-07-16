# 🏗️ DENTE Dental CRM — System Architecture

This document describes the structure, data flows, and architectural conventions of the DENTE Dental CRM project.

---

## 📁 Monorepo Layout

The project is structured as an npm workspaces monorepo:
*   `apps/api/` — Backend server (Fastify, TypeScript, tsx execution).
*   `apps/web/` — Web Frontend client (Vite, React 18, Tailwind CSS, TypeScript).
*   `packages/shared/` — Common types, schemas, and helper functions shared by both frontend and backend.
*   `scripts/` — Smoke test scenarios, database tooling, and validation scripts.

---

## ⚡ Backend Server (`apps/api`)

The backend is built with **Fastify** and uses **Drizzle ORM** for PostgreSQL interaction.

### 🔌 Proxy & SSH Tunnel Gating (`apps/api/src/server.ts`)
To handle secure connections to external AI APIs (like speech-to-text models), the server sets up connection routing:
*   During boot, `setupProxyAndTunnels()` checks for local SSH keys. If found, it establishes an SSH SOCKS5 tunnel on port `1080` using `ensureSshTunnel()`.
*   If the tunnel starts, the server sets `process.env.HTTPS_PROXY = "socks5://127.0.0.1:1080"`.
*   If the proxy is marked offline by `checkProxyPortDirectly()`, the environment variables are automatically removed to force direct fallback connections.

### 🌐 WebSocket Broker (`apps/api/src/services/websocketBroker.ts`)
The server runs an in-memory client dispatcher for real-time events.
*   Endpoint: `/api/ws/schedule?orgId=<orgId>&patientId=<patientId>`
*   Active client connections are mapped to their specific `organizationId` and `patientId` scopes.
*   **Active Broadcast Messages:**
    *   `TELEPHONY_INCOMING_CALL` — Pushed to all users of an organization.
    *   `LAB_ORDER_UPDATED` — Pushed when a dental laboratory updates order statuses.
    *   `SCHEDULE_APPOINTMENT_CHANGE` — Dispatched when appointment cards are created/moved.

---

## 🎙️ Speech Gating & AI Gateway (`apps/api/src/speech`)

DENTE integrates automated voice dictation for dental visits. 

### 1. Key Pool Rotation (`keyPool.ts`)
To balance Groq/OpenAI/Yandex STT calls, the gateway manages a list of API keys:
*   Keys are checked dynamically at runtime.
*   If a request fails (e.g. Rate Limit / 429), `recordProviderKeyFailure()` registers it and rotates the pool to next valid key.
*   If requests succeed, `recordProviderKeySuccess()` boosts key priority weight.

### 2. Hallucination Guardrails (`gateway.ts`)
Whisper-class models frequently generate phantom words during silent pauses or low hums. The gateway intercepts STT output and compares it against `HALLUCINATION_BLACKLIST`:
*   *Blacklisted Phrases:* "Продолжение следует", "Спасибо за просмотр", "To be continued", "DimaTorzok", etc.
*   *Repetition Loops:* Catches repeating syllables or word chains using regex `^(.{1,60})\1{4,}$`.
*   If a hallucination is detected, it is discarded rather than parsed into the patient records.

---

## 🖥️ Web Frontend (`apps/web`)

The frontend is a Single Page Application (SPA) built with React 18 and Vite.

### 🧠 App State Management
*   **Zustand** is used for isolated UI states:
    *   `appStore.ts` — Handles current active view (`currentView`), omnibar, dashboard caching.
    *   `patientStore.ts` — Manages selected patient ID, odontogram teeth conditions.
    *   `visitStore.ts` — Tracks active visit logs and revisions.
*   **God Context (`useAppLogic.tsx`)**: Most legacy states (schedule filters, clinical logs) are gathered in the `useAppLogic` hook and shared via React Context (`AppLogicContext`).

### ⚡ View Preloading (`apps/web/src/workspacePreload.ts`)
To prevent route-change lags in the custom UI shell, all core views (Schedule, Patients, Documents, Finance, Communications, Settings) are imported at app initialization.
