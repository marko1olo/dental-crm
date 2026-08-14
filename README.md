# 🦷 DENTE — Clinical Dental Practice Management & 3D DICOM Engine

[![Live Demo](https://img.shields.io/badge/Live_Showcase-GitHub_Pages-0ea5e9?style=for-the-badge&logo=github)](https://marko1olo.github.io/dental-crm/)
[![PWA Ready](https://img.shields.io/badge/PWA-Installable-22c55e?style=for-the-badge&logo=pwa)](https://marko1olo.github.io/dental-crm/manifest.json)
[![AI Index](https://img.shields.io/badge/LLM_Search-llms.txt-38bdf8?style=for-the-badge)](https://marko1olo.github.io/dental-crm/llms.txt)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5.0-000000?style=for-the-badge&logo=fastify)](https://fastify.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18-4169E1?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)

An enterprise-grade dental clinic workspace and electronic health record (EHR) platform featuring an interactive 32-teeth FDI odontogram, lateral cephalometric analysis, 3D volumetric DICOM raymarching, SBP QR dynamic billing, and deterministic multi-tenant PostgreSQL 18 isolation.

---

## 🏛️ Architecture & Clinical Data Flow

```mermaid
graph TD
    Client[React 19 SPA + PWA] -->|Strict Zod HTTP / WS| API[Fastify 5 REST API]
    API -->|Tenant Isolation org_id| DB[(PostgreSQL 18 + Drizzle ORM)]
    API -->|Volumetric Slices| DICOM[3D DICOM WebGL Engine]
    API -->|Clinical Records| Odonto[FDI 32-Teeth Odontogram Engine]
    API -->|Dynamic QR| SBP[SBP QR & Sberbank Acquiring]
```

---

## 🔬 Core Capabilities

1. **Interactive 32-Teeth FDI Odontogram:** Full FDI numbering (18-48), per-surface clinical condition tracking (caries, restoration, crown, endo, implant, missing), and instant treatment plan cost generation.
2. **Periodontal Pocket Depth Probing:** 6-point probing depth tracking with Bleeding on Probing (BOP) and furcation grading.
3. **Lateral Cephalometric Angle Calculator:** Sagittal malocclusion classification (SNA, SNB, ANB Class I/II/III).
4. **3D DICOM Volumetric Viewer:** GPU-accelerated client-side raymarching of CBCT scans with Hounsfield Unit windowing.
5. **Deterministic Financial Ledger:** SBP QR payments, fiscal receipting, and kopeck-exact doctor commission payouts.

---

## 🛠️ Quickstart

```bash
# Clone and install dependencies
git clone https://github.com/marko1olo/dental-crm.git
cd dental-crm
pnpm install

# Start development stack
pnpm dev
```

---

### 👨‍💻 Lead Architect
**Адольф Петушков (Adolf Petushkov)** — High-Concurrency Systems & Clinical AI Architecture.  
GitHub: [@marko1olo](https://github.com/marko1olo)
