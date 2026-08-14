# 🛠️ Contributing to marko1olo/dental-crm

> **Engineering Mandate, Architectural Invariants & Contribution Standard**  
> Maintained by the **Жирняк & Адольф Петушков** Engineering Syndicate  
> Technology Foundation: `Fastify / PostgreSQL 18 / React 19 / TypeScript 5.8 / Drizzle ORM / DICOM MPR`

---

## 📑 Table of Contents
1. [🏛️ Architectural Overview & Data Flow](#️-1-architectural-overview--data-flow)
2. [📐 Strict Domain Invariants](#-2-strict-domain-invariants)
3. [💻 Development Toolchain & Local Environment](#-3-development-toolchain--local-environment)
4. [🧪 Testing Strategy & Verification Pipeline](#-4-testing-strategy--verification-pipeline)
5. [💎 Code Standards & Anti-Patterns](#-5-code-standards--anti-patterns)
6. [🚀 Pull Request Protocol & Review Workflow](#-6-pull-request-protocol--review-workflow)
7. [👥 Syndicate Governance & Attribution](#-7-syndicate-governance--attribution)

---

## 🏛️ 1. Architectural Overview & Data Flow

DENTE Dental Practice CRM & Tomography Core is engineered for maximum performance, deterministic state transitions, and zero computational slop. All contributions must respect existing subsystem boundaries and data flows:

```mermaid
graph TD
    A[Client UI / React 19] -->|Zod Validated Payload| B[Fastify Gateway]
    B -->|Tenant Context Middleware| C[Drizzle ORM Engine]
    C -->|PostgreSQL 18 TCP Pool| D[(Database / Multi-Tenant Shards)]
    B -->|ArrayBuffer Stream| E[DICOM MPR CT Slice Processor]
    E -->|WebGL Texture Transfer| A
```

### 1.1 Core Subsystems
* **Primary Compute / Domain Engine**: Handles low-latency calculations, domain solvers, and state mutations.
* **Validation & Boundary Layer**: Enforces strict typing, schema assertions, and input sanitization before payloads enter the internal core.
* **Presentation & Stream Sinks**: Zero-allocation rendering, audio synthesis, or serialization buffers feeding client viewports.

---

## 📐 2. Strict Domain Invariants

Every pull request is automatically audited against these immutable project invariants. If any invariant is violated, the PR will be rejected:

### 1. Tenant Isolation Matrix
* **Formal Requirement**: Every DB query MUST enforce WHERE organization_id = :org_id with zero bypasses.
* **Verification Protocol**: Automated unit test assertion + mathematical boundary check.
* **Failure Mode**: Immediate build rejection; PR cannot be approved without meeting this invariant.
### 2. Kopeck-Exact Financials
* **Formal Requirement**: Zero float math on money. All calculations use integer kopecks/cents stored as BIGINT.
* **Verification Protocol**: Automated unit test assertion + mathematical boundary check.
* **Failure Mode**: Immediate build rejection; PR cannot be approved without meeting this invariant.
### 3. DICOM Hounsfield Unit Calibration
* **Formal Requirement**: CT windowing must strictly compute HU = PixelValue * RescaleSlope + RescaleIntercept.
* **Verification Protocol**: Automated unit test assertion + mathematical boundary check.
* **Failure Mode**: Immediate build rejection; PR cannot be approved without meeting this invariant.
### 4. FDI Tooth Notation Validation
* **Formal Requirement**: Dental chart mutations must validate ISO 3950 / FDI two-digit numbering bounds (11-48, 51-85).
* **Verification Protocol**: Automated unit test assertion + mathematical boundary check.
* **Failure Mode**: Immediate build rejection; PR cannot be approved without meeting this invariant.
### 5. Immutable Audit Ledger
* **Formal Requirement**: Clinical mutations generate cryptographic append-only event records in medical_audit_log.
* **Verification Protocol**: Automated unit test assertion + mathematical boundary check.
* **Failure Mode**: Immediate build rejection; PR cannot be approved without meeting this invariant.

---

## 💻 3. Development Toolchain & Local Environment

### 3.1 Environment Prerequisites
* Primary Runtime: `Fastify / PostgreSQL 18 / React 19 / TypeScript 5.8 / Drizzle ORM / DICOM MPR`
* Git with configured GPG signing keys
* Static Analysis & Linters matching project versions

### 3.2 Setup Procedure
```bash
# 1. Clone the repository
git clone https://github.com/marko1olo/dental-crm.git
cd dental-crm

# 2. Check out target working branch
git checkout main

# 3. Install dependencies & initialize toolchains
npm install || cargo check || dotnet restore || make preflight

# 4. Execute the complete test suite
npm test || pytest || dotnet test || make test
```

---

## 🧪 4. Testing Strategy & Verification Pipeline

Every non-trivial PR must contain empirical verification evidence. We do NOT accept "tested manually and looks fine":

1. **Unit & Invariant Tests**: Must explicitly verify the mathematical or logical properties of the modified subsystem.
2. **Boundary & Edge-Case Sweeps**: Test with zero-length inputs, extreme boundary coordinates, or adversarial configurations.
3. **Zero-Allocation Benchmarking**: For render or audio frame loops, run the memory profiler to verify zero heap allocations per tick.

---

## 💎 5. Code Standards & Anti-Patterns

### 5.1 Exemplary vs. Forbidden Patterns

```typescript
// ✅ CORRECT: Kopeck-Exact Integer Arithmetic
export function calculateInvoiceTotal(services: ReadonlyArray<{ costKopecks: bigint; discountBps: number }>): bigint {
    return services.reduce((acc, item) => {
        const discountAmount = (item.costKopecks * BigInt(item.discountBps)) / 10000n;
        return acc + (item.costKopecks - discountAmount);
    }, 0n);
}

// ❌ FORBIDDEN: Floating-point precision loss
export function calculateBadTotal(services: any[]): number {
    return services.reduce((acc, item) => acc + item.price * (1 - item.discount / 100), 0); // REGRESSION!
}
```

### 5.2 Anti-Patterns Blacklist
* ❌ **No AI Slop Comments**: Avoid decorative fluff like `// This function handles calculating the result`. Comment *why*, never *what*.
* ❌ **No Type Bypasses**: Never use `any`, `unknown` casts without runtime assertions, or unchecked pointer arithmetic.
* ❌ **No Unbounded Memory Growth**: Always provide explicit upper bounds on caches, array allocations, and event queues.

---

## 🚀 6. Pull Request Protocol & Review Workflow

```mermaid
graph TD
    A[Fork Repository] --> B[Create Descriptive Branch /feat or /fix]
    B --> C[Implement Code & Satisfy Invariants]
    C --> D[Run Full Test Suite & Linters]
    D --> E[Submit PR with Benchmark Proof]
    E --> F[Syndicate Adversarial Code Review]
    F -->|Approved| G[Rebase & Fast-Forward Merge]
    F -->|Corrections Needed| C
```

1. **Branch Naming**: `feat/<subsystem>-<feature>`, `fix/<subsystem>-<bug>`, `perf/<subsystem>-<optimization>`.
2. **Commit Standard**: Conventional Commits format with lowercase scope (`feat(core): implement SIMD acceleration`).
3. **PR Description**: Include root-cause analysis, benchmark numbers (before/after), and test commands executed.

---

## 👥 7. Syndicate Governance & Attribution

This project is authored and curated under the oversight of the **Жирняк & Адольф Петушков** Engineering Syndicate. All contributions merged into this repository will be credited to their authors while maintaining syndicate licensing integrity.
