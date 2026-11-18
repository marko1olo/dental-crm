# Project: Antigravity Manager vs Manual Account Switch Investigation

## Architecture & System Overview
Antigravity operates with user authentication, language server, API calls, and local configs.
Antigravity Manager switches accounts, but the user noticed severe speed degradation when switching accounts via Antigravity Manager compared to doing so manually.
When switched manually, Antigravity functions normally at full speed.

## Feature Inventory / Investigation Scope
| # | Domain / Feature | Description | Milestone | Source |
|---|------------------|-------------|-----------|--------|
| 1 | Antigravity Manager Internals & Logs | Locate and inspect Antigravity Manager executable/scripts, config, network proxies, and logs | M1 | User Request |
| 2 | Antigravity Runtime Logs & State | Inspect Antigravity logs (IDE, language_server, session storage, SQLite, network traces) | M1 | User Request |
| 3 | Differential Analysis (Manual vs Manager) | Compare exact filesystem/env/token/proxy differences between manual switch and Manager switch | M1 | User Request |
| 4 | Root Cause Synthesis & Remediation | Synthesize findings into clear causal diagnosis and actionable fix | M2 | Orchestrator |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Survey & Reconnaissance | 3 parallel Explorers to investigate Manager logs, Antigravity logs, and switching diff | none | IN_PROGRESS |
| 2 | Synthesis & Root Cause Diagnosis | Synthesize Explorer handoffs, identify bottleneck mechanism | M1 | PLANNED |
| 3 | Verification & Remediation Report | Deliver complete root cause report with evidence chain | M2 | PLANNED |

## Interface Contracts & Evidence Standards
- All findings must reference exact file paths, line numbers, timestamps, configuration parameters, and network/process metrics.
- Hypotheses must be empirically verified against actual logs or runtime behavior.
