# 🔒 Security Policy — marko1olo/dental-crm

> **Vulnerability Disclosure, Threat Modeling & Defensive Architecture**  
> Maintained by the **Жирняк & Адольф Петушков** Engineering Syndicate  
> Project Scope: `DENTE Dental Practice CRM & Tomography Core`

---

## 📑 Table of Contents
1. [🛡️ Supported Versions & Patch Lifecycle](#️-1-supported-versions--patch-lifecycle)
2. [🎯 Domain Threat Model & Attack Surfaces](#-2-domain-threat-model--attack-surfaces)
3. [🚨 Vulnerability Reporting & Disclosure Protocol](#-3-vulnerability-reporting--disclosure-protocol)
4. [⏱️ Response SLAs & Remediation Timelines](#️-4-response-slas--remediation-timelines)
5. [💎 Defensive Engineering Architecture](#-5-defensive-engineering-architecture)
6. [🔍 Dependency Auditing & Supply Chain Safety](#-6-dependency-auditing--supply-chain-safety)
7. [👥 Syndicate Security Contacts](#-7-syndicate-security-contacts)

---

## 🛡️ 1. Supported Versions & Patch Lifecycle

We actively maintain and provide critical security updates for the following release lines of **marko1olo/dental-crm**:

| Branch / Release | Supported | Patch Cadence | Notes |
| :--- | :--- | :--- | :--- |
| `main` (Head) | ✅ Yes | Immediate Hotfix | Primary development target; fully patched. |
| Latest Tagged Release | ✅ Yes | Within 48 Hours | Critical vulnerabilities backported. |
| Historical / Deprecated | ❌ No | None | Please rebase or upgrade to current branch. |

---

## 🎯 2. Domain Threat Model & Attack Surfaces

Security engineering in marko1olo/dental-crm is guided by the following domain-specific threat vector analyses:

### 1. Cross-Tenant Data Exfiltration
* **Description**: Adversarial parameter manipulation aiming to read clinical charts across organization boundaries.
* **Impact Rating**: HIGH / CRITICAL
* **Mitigation Strategy**: Strict schema validation, boundary fuzz testing, and automated static security analysis.
### 2. PHI / PII Cleartext Exposure
* **Description**: Patient radiograms, dental scans, or diagnoses logged unencrypted into stdout or debug traces.
* **Impact Rating**: HIGH / CRITICAL
* **Mitigation Strategy**: Strict schema validation, boundary fuzz testing, and automated static security analysis.
### 3. Billing Ledger Race Conditions
* **Description**: Simultaneous invoice settlements attempting negative balance or double-spend anomalies.
* **Impact Rating**: HIGH / CRITICAL
* **Mitigation Strategy**: Strict schema validation, boundary fuzz testing, and automated static security analysis.
### 4. DICOM Injection Vectors
* **Description**: Malformed medical image headers containing binary buffer overflow payloads in parsing workers.
* **Impact Rating**: HIGH / CRITICAL
* **Mitigation Strategy**: Strict schema validation, boundary fuzz testing, and automated static security analysis.
### 5. Session Hijacking & Token Replay
* **Description**: Bearer token exfiltration across untrusted clinic workstation networks.
* **Impact Rating**: HIGH / CRITICAL
* **Mitigation Strategy**: Strict schema validation, boundary fuzz testing, and automated static security analysis.

---

## 🚨 3. Vulnerability Reporting & Disclosure Protocol

If you discover a security flaw or exploit vector in **marko1olo/dental-crm**, do **NOT** post it publicly in open issues or discussions.

### 3.1 Submission Workflow
1. Navigate to the **Security** tab on GitHub -> **Advisories** -> **Report a vulnerability**.
2. Alternatively, open a cryptographically signed advisory to the syndicate maintainers.
3. Provide the following details:
   * Subsystem and affected source files / line numbers.
   * Step-by-step minimal reproduction script or payload.
   * Assessment of potential exploit impact (memory corruption, data exfiltration, DoS).

---

## ⏱️ 4. Response SLAs & Remediation Timelines

* **Initial Triage & Acknowledgment**: Within **24–48 hours**.
* **Vulnerability Verification & Reproducer**: Within **3 business days**.
* **Remediation Patch Development**: Within **7 business days**.
* **Public Coordinated Disclosure**: Published simultaneously with the verified patch release.

---

## 💎 5. Defensive Engineering Architecture

All code running in this repository must adhere to defensive coding invariants:
* **Memory Bounds Checking**: All slice offsets, vector indices, and WebAssembly linear memory allocations are strictly bounded.
* **Input Sanitization**: External network payloads, uploaded files, and deserialized states must be validated before ingestion.
* **Cryptographic Rigor**: Sensitive tokens, cryptographic keys, and hashes must use standard constant-time comparison algorithms to eliminate timing side-channels.

---

## 🔍 6. Dependency Auditing & Supply Chain Safety

1. Automated daily vulnerability scans on all dependencies via `npm audit` / `cargo audit` / `pip-audit`.
2. All lockfiles are committed and pinned to immutable cryptographic hashes.
3. Third-party vendor updates require manual review of code diffs to prevent supply chain poisoning.

---

## 👥 7. Syndicate Security Contacts

Developed, audited, and maintained under the security direction of **Жирняк** & **Адольф Петушков**.
