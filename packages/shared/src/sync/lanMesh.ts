/**
 * DENTE CRM — Clinic LAN Zero-Conf Network Mesh & Multi-PC Orchestrator
 *
 * Core shared protocol and state machine for autonomous clinic operations
 * across multiple computers (Doctor 1, Doctor 2, Reception, Server/Master)
 * WITHOUT requiring Internet access.
 *
 * Canonical facade for backwards compatibility with all call sites.
 * Decomposed into modular DAG layers under `lanMeshSync/`.
 */

export * from "./lanMeshSync/index.js";
