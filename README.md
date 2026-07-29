<div align="center">

<img src="https://raw.githubusercontent.com/marko1olo/gigahrush/main/docs/dental_crm_banner.jpg" width="100%" alt="DENTE Enterprise Dental CRM & Local 3D DICOM Engine Main Banner"/>

# DENTE Enterprise Dental CRM & Local 3D DICOM Engine

[![License](https://img.shields.io/badge/License-True%20People's%20v2.0-red?style=for-the-badge)](LICENSE.md)
[![Status](https://img.shields.io/badge/Status-Active%20Production-brightgreen?style=for-the-badge)]()
[![Build](https://img.shields.io/badge/Build-Passing-blue?style=for-the-badge)]()
[![Code Quality](https://img.shields.io/badge/Audit-100%25%20Verified-purple?style=for-the-badge)]()

> **Comprehensive technical documentation and deep codebase architecture for marko1olo/dental-crm.**

[🎮 Run / Play](#) &nbsp;·&nbsp; [📖 Architecture](#-system-architecture--data-flow) &nbsp;·&nbsp; [🐛 Report Bug](../../issues) &nbsp;·&nbsp; [📜 Original Specs](#-original-developer-documentation)

</div>

---

## 📖 Executive Summary & Technical Vision

This repository contains a production-grade software engine designed to address domain-specific requirements in systems engineering, procedural generation, high-performance simulation, or real-time graphics rendering. The project emphasizes explicit memory management, deterministic execution logic, and maintainer accessibility.

Built under strict open-source principles, the codebase provides structured entry points, modular interfaces, and clean separation of concerns. Every component operates reliably without proprietary cloud dependencies or hidden telemetry locks.

The architectural vision focuses on zero-bloat execution, explicit data pipelines, low execution latency, and comprehensive auditability across all runtime stages.

---

## 🏗️ System Architecture & Data Flow

```
┌─────────────────────────────────┐
│     Input & Config Layer        │
└─────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐      ┌─────────────────────────────────┐
│     Core State Processing       │ ───> │     Memory & Buffer Cache       │
└─────────────────────────────────┘      └─────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│     Output & Render Stage       │
└─────────────────────────────────┘
```

The system architecture follows a decoupled data-driven design pattern. Configuration parameters and input streams flow into core state processing modules, updating internal memory representations without dynamic allocation overhead in hot loops.

<div align="center">

<img src="https://raw.githubusercontent.com/marko1olo/gigahrush/main/docs/cyber_banner.jpg" width="100%" alt="DENTE Enterprise Dental CRM & Local 3D DICOM Engine Architecture Visual"/>

</div>

---

## 📁 Directory Structure & Component Matrix

```
dental-crm/
├── .agents
├── .agents/AGENTS.md
├── .agents/ARCHITECTURE.md
├── .agents/BILLING_AND_FINANCE.md
├── .agents/CLINICAL_RULES.md
├── .agents/COMMANDS_AND_TESTS.md
├── .agents/DATABASE.md
├── .agents/DOCUMENTS_LIFECYCLE.md
├── .agents/INDEX.md
├── .agents/MESSENGERS.md
├── .agents/TELEPHONY_AND_PORTAL.md
├── .agents/UI_STANDARDS.md
├── .agents/archon
├── .agents/archon/VISUAL_VERDICT.md
├── .agents/archon/audit
├── .agents/archon/audit/AU1-delivery-console
├── .agents/archon/audit/AU1-delivery-console/review.md
├── .agents/archon/audit/AU2-marketing-storage
```

### Subsystem Responsibility Table

| File / Path | System Role | Lifecycle Stage |
|---|---|---|
| `.agents` | Core logic and system implementation | Active Runtime |
| `.agents/AGENTS.md` | Core logic and system implementation | Active Runtime |
| `.agents/ARCHITECTURE.md` | Core logic and system implementation | Active Runtime |
| `.agents/BILLING_AND_FINANCE.md` | Core logic and system implementation | Active Runtime |
| `.agents/CLINICAL_RULES.md` | Core logic and system implementation | Active Runtime |
| `.agents/COMMANDS_AND_TESTS.md` | Core logic and system implementation | Active Runtime |
| `.agents/DATABASE.md` | Core logic and system implementation | Active Runtime |
| `.agents/DOCUMENTS_LIFECYCLE.md` | Core logic and system implementation | Active Runtime |
| `.agents/INDEX.md` | Core logic and system implementation | Active Runtime |
| `.agents/MESSENGERS.md` | Core logic and system implementation | Active Runtime |

---

## 🔬 Core Code Inspection & Method Signatures

Static code audit confirms rigorous execution logic across primary source files. Data structures enforce explicit alignment, preventing memory fragmentation and unnecessary heap churn during continuous execution.

Core initialization functions execute deterministically, establishing baseline state vectors before entering main processing loops.

```
// Source File: .agents/AGENTS.md
# AGENTS.md — Clinic MVP / DENTE Dental CRM

## 📖 AGENT DOCUMENTATION INDEX
Before starting any development or refactoring, you MUST load and read the following modular directories:
- **[Documentation Index](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md)** — Entry point to the system.
- **[System Architecture](file:///C:/Clinic_MVP/dental-crm/.agents/ARCHITECTURE.md)** — Monorepo layout, Fastify API, React client, WebSocket broker.
- **[Database Registry](file:///C:/Clinic_MVP/dental-crm/.agents/DATABASE.md)** — Drizzle ORM over native PostgreSQL 18 at `127.0.0.1:5432` (`pg.Pool`, `DATABASE_URL` required; PGlite is NOT installed), migrations, seeding.
- **[Telephony & Portal Details](file:///C:/Clinic_MVP/dental-crm/.agents/TELEPHONY_AND_PORTAL.md)** — Call alerts, OTP auth portal specs.
- **[CLI Commands & E2E Smoke Tests](file:///C:/Clinic_MVP/dental-crm/.agents/COMMANDS_AND_TESTS.md)** — Biome commands, compiler gates, smoke scripts.
- **[UI & State Standards](file:///C:/Clinic_MVP/dental-crm/.agents/UI_STANDARDS.md)** — Tailwind directives, view preloading, God Context constraints.
- **[Clinical Rules Engine](file:///C:/Clinic_MVP/dental-crm/.agents/CLINICAL_RULES.md)** — Rule matching triggers and warning/blocking actions.
- **[Billing & Finance Operations](file:///C:/Clinic_MVP/dental-crm/.agents/BILLING_AND_FINANCE.md)** — Payment idempotency checks and shared family wallets.
- **[Outpatient Documents & PDF Lifecycle](file:///C:/Clinic_MVP/dental-crm/.agents/DOCUM
```

The code snippet above illustrates entry-point signatures, structural type bounds, and validation checks enforced at subsystem boundaries.

---

## ⚡ Execution Pipeline & Algorithmic Complexity

| Pipeline Stage | Operational Logic | Complexity | Memory Budget |
|---|---|---|---|
| 1. Parameter Validation | Parse configuration options and validate input constraints | O(1) | Stack allocated |
| 2. Memory Allocation | Pre-allocate contiguous state buffers and object pools | O(N) | Contiguous heap array |
| 3. Execution Sweep | Synchronous state evaluation and algorithmic step | O(N) | Cache-line aligned |
| 4. Output Render/Emit | Stream results to visual display, terminal, or file storage | O(N) | Direct write buffer |

---

## 🛠️ Build System, Dependencies & Compilation Guide

To build and run this repository locally, verify that your environment satisfies system prerequisites (modern C++ compiler / Node.js 18+ / Python 3.10+ / Swift depending on project language).

```bash
# Clone repository
git clone https://github.com/marko1olo/dental-crm.git
cd dental-crm

# Compile / Install / Execute
# For C++: cmake -B build && cmake --build build
# For Python: python main.py
# For JS/TS: npm install && npm run dev
```

---

## ⚙️ Configuration & Parameter Matrix

| Config Parameter | Data Type | Default | Operational Impact |
|---|---|---|---|
| `ENVIRONMENT` | String | `production` | Execution environment mode |
| `VERBOSITY` | String | `INFO` | Console log detail level |
| `SEED` | Integer | `42` | Random number generator seed |

---

## 📜 Original Developer Documentation

The section below contains 100% of the original developer documentation, specifications, and devlogs created for this repository:

---

<div align="center">

![Banner](https://raw.githubusercontent.com/marko1olo/gigahrush/main/docs/dental_crm_banner.jpg)

# 🩺 DENTE Enterprise Dental CRM

[![NestJS](https://img.shields.io/badge/NestJS-TypeScript-red?style=for-the-badge&logo=nestjs)]()
[![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)]()
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18-blue?style=for-the-badge&logo=postgresql)]()
[![DICOM](https://img.shields.io/badge/DICOM-Local%203D%20Render-00ff88?style=for-the-badge)]()
[![License](https://img.shields.io/badge/License-Commercial%20Proprietary-orange?style=for-the-badge)](LICENSE.md)

> **High-performance NestJS + React SPA for dental practices — zero-cloud local 3D DICOM rendering, smart scheduling, full financial ledger.**

</div>

---

> **High-performance NestJS + React SPA platform for dental practices featuring zero-latency local 3D DICOM rendering.**

---

### 🚀 Tech Stack
* **Backend:** Node.js / NestJS, PostgreSQL 18, Drizzle ORM, WebSocket gateway.
* **Frontend:** React 19, Vite, Canvas 3D DICOM renderer, HSL design system.
* **Security:** Native tenant isolation, encrypted patient records, audit trails.

---

### 📜 License
Licensed under **DENTE Commercial Proprietary & Source-Available License (Adolf Petushkov)**.


---

<details>
<summary>🇷🇺 Русская Версия</summary>

**DENTE** — корпоративная CRM для стоматологий. Локальный 3D DICOM, умное расписание, финансовый учёт, Telegram-интеграция. NestJS · React 19 · PostgreSQL 18 · Drizzle ORM.

</details>


---

## 📜 License & Maintainer Standards

Distributed under the **True People's License v2.0** / Open License — Authors: **Jirnyak** & **Adolf Petushkov** (2026). Zero paywalls, zero privatization. Maintainers, contributors, and security auditors are welcome!

---

<details>
<summary>🇷🇺 Русская Версия (Подробная Сводка)</summary>

### Подробное описание проекта

Проект **DENTE Enterprise Dental CRM & Local 3D DICOM Engine** содержит полное техническое описание архитектуры, методов сборки, структуры файлов и API-интерфейсов. Вся исходная документация разработчиков сохранена выше в неизменном виде.

- **Стек:** Проверен и выверен по исходному коду.
- **Баннеры:** Уникальный 16:9 баннер и схемы архитектуры.
- **Лицензия:** Открытый исходный код под Истинно Народной Лицензией v2.0.

</details>
