<div align="center">

![Banner](https://raw.githubusercontent.com/marko1olo/gigahrush/main/docs/dental_crm_banner.jpg)

# 🩺 DENTE Enterprise Dental CRM

[![NestJS](https://img.shields.io/badge/NestJS-TypeScript-red?style=for-the-badge&logo=nestjs)]()
[![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)]()
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18-blue?style=for-the-badge&logo=postgresql)]()
[![DICOM](https://img.shields.io/badge/DICOM-Local%203D%20Render-00ff88?style=for-the-badge)]()
[![License](https://img.shields.io/badge/License-Commercial%20Proprietary-orange?style=for-the-badge)](LICENSE.md)

> **High-performance NestJS + React SPA dental clinic management system with zero-cloud local DICOM 3D rendering, smart scheduling, and full financial ledger.**

</div>

---

## 📖 About

**DENTE** is an enterprise-grade dental CRM built from scratch for real clinical workflows. No bloated SaaS subscriptions — this runs entirely in your clinic, keeping patient data local and performance tight.

---

## ✨ Feature Set

| Module | Features |
|---|---|
| 👥 **Patients** | Patient registry, medical history, tooth formula (FDI notation), allergies, notes |
| 📅 **Schedule** | Interactive drag-drop appointment calendar, operator shift management, conflict detection |
| 🦷 **Visits** | Per-visit treatment plans, procedure coding, material usage, photos |
| 🖼️ **DICOM Viewer** | Local 3D tooth model renderer — no external cloud PACS required |
| 💰 **Finance** | Service pricing, payment tracking, debt management, daily cashbox |
| 💬 **Messaging** | Telegram & WhatsApp patient communication bridge |
| 📊 **Analytics** | Clinic KPIs, doctor load, revenue breakdown, patient retention |

---

## 🛠️ Tech Stack

```
Backend:  NestJS · TypeScript · PostgreSQL 18 · Drizzle ORM · pg-pool
Frontend: React 19 · Vite · Canvas DICOM renderer · CSS custom properties
Auth:     JWT access/refresh tokens · role-based access (admin/doctor/operator)
Realtime: WebSocket gateway (NestJS) for live schedule updates
```

---

## 🚀 Getting Started

```bash
git clone https://github.com/marko1olo/dental-crm.git
cd dental-crm
pnpm install
cp .env.example .env   # configure DATABASE_URL, JWT_SECRET
pnpm db:migrate
pnpm dev
# API: http://localhost:3000  |  Web: http://localhost:5173
```

---

## 📜 License

**DENTE Commercial Proprietary & Source-Available License** — Adolf Petushkov (c) 2026.

---

<details>
<summary>🇷🇺 Русская Версия</summary>

**DENTE** — корпоративная CRM-система для стоматологических клиник с локальным 3D DICOM-рендерером, умным расписанием, полным финансовым учётом и Telegram-интеграцией для пациентов.

Стек: NestJS · React 19 · PostgreSQL 18 · Drizzle ORM. Данные хранятся локально.

</details>
