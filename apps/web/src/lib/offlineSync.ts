/**
 * DENTE CRM — Offline-First Multi-Level Synchronization Engine Library
 *
 * Core library exports:
 * - Offline Storage & Outbox
 * - Offline Sync Service & Batch Drainage
 * - Field-Level CRDT LWW Conflict Resolution
 * - Network Connectivity & RTT Monitoring
 */

export * from "../services/offline";
export * from "../services/lanDiscovery/lanServerDiscovery";
export * from "../utils/networkConnectivity";
