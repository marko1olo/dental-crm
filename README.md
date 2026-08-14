<div align="center">

# 🦷 DENTE — Clinical Dental Practice Management & Diagnostics CRM

[![Live Showcase](https://img.shields.io/badge/Live_Showcase-GitHub_Pages-38bdf8?style=for-the-badge&logo=github)](https://marko1olo.github.io/dental-crm/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8_Strict-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18_Native-336791?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)

**Enterprise Multi-Tenant Dental Practice Management System with DICOM/MPR Imaging, Interactive Odontogram, Smart Scheduling & Kopeck-Exact Financial Ledger.**

</div>

---

## 🌟 Core Features

- **Interactive 32/20 Tooth Interactive Odontogram:** Vector SVG odontogram supporting FDI Two-Digit and Universal Numbering systems with surface-level pathology tracking (caries, pulpitis, crowns, implants, mobility).
- **Real-Time DICOM / MPR Volumetric View:** Multi-Planar Reconstruction (Axial, Coronal, Sagittal) with Hounsfield Unit (HU) windowing and measurement tools.
- **Kopeck-Exact Financial Accounting:** Zero floating-point rounding errors. Integer-cent arithmetic across invoices, payments, deposits, insurance coverage, and doctor payroll.
- **Strict Multi-Tenant Isolation:** Guaranteed tenant separation via `organization_id` column constraints and PostgreSQL row-level indexing.
- **Telemedicine & Appointment Engine:** Conflict-free doctor scheduling matrix with automated SMS/Telegram reminders and chair occupancy heatmaps.

---

## 📐 Architecture Overview

```mermaid
graph TD
    A[React 19 + Vite Frontend] -->|Zod Validated JSON / REST| B[Fastify Backend Core]
    B -->|Connection Pool| C[(PostgreSQL 18 Database)]
    B -->|WebSocket Bus| D[Real-Time Notifications & Triage]
    B -->|Dicom Parser Pipeline| E[MPR Imaging & Volumetric Raytracer]
    
    subgraph Frontend Subsystems
        F1[Interactive Odontogram SVG]
        F2[Multi-Chair Appointment Grid]
        F3[DICOM Slice Viewer]
        F4[Patient Health Record EHR]
    end
    
    subgraph Backend Services
        B1[Billing & Kopeck-Exact Ledger]
        B2[Authentication & RBAC Security]
        B3[Clinical Diagnostic Pipeline]
        B4[Telegram / WhatsApp Triage Bot]
    end
```

---

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/marko1olo/dental-crm.git
cd dental-crm

# Install dependencies
npm install

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

---

### 👥 Engineering Syndicate
Developed and maintained by **Жирняк** & **Адольф Петушков**.
