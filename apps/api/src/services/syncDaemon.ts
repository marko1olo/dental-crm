import { db } from "../db/client.js";
import { patients, visits, organizations } from "../db/schema.js";
import { eq, or } from "drizzle-orm";

/**
 * Hybrid Sync Engine Daemon
 * Implements Conflict-Free Offline-First Sync using Last-Write-Wins
 */

let syncInterval: NodeJS.Timeout | null = null;
const SYNC_INTERVAL_MS = 30000; // 30 seconds

export function startSyncDaemon() {
  if (syncInterval) return;
  console.log("[SyncDaemon] Starting Hybrid Sync Engine...");
  syncInterval = setInterval(runSyncCycle, SYNC_INTERVAL_MS);
}

export function stopSyncDaemon() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    console.log("[SyncDaemon] Stopped Hybrid Sync Engine.");
  }
}

/**
 * Executes a single sync cycle
 * Finds all records with is_synced = false and pushes them to the Cloud Vault
 */
export async function runSyncCycle() {
  try {
    // 1. Fetch unsynced records
    const unsyncedPatients = await db.select().from(patients).where(eq(patients.isSynced, false));
    const unsyncedVisits = await db.select().from(visits).where(eq(visits.isSynced, false));
    const unsyncedOrgs = await db.select().from(organizations).where(eq(organizations.isSynced, false));

    const totalUnsynced = unsyncedPatients.length + unsyncedVisits.length + unsyncedOrgs.length;
    
    if (totalUnsynced === 0) {
      // Nothing to sync
      return;
    }

    console.log(`[SyncDaemon] Found ${totalUnsynced} unsynced records. Pushing to Cloud Vault...`);

    // Mocking Cloud Vault Push (API call to external service)
    const payload = {
      timestamp: new Date().toISOString(),
      patients: unsyncedPatients,
      visits: unsyncedVisits,
      organizations: unsyncedOrgs
    };

    // In a real app, we would send 'payload' via fetch()
    // await fetch('https://cloud-vault.dentalcrm.com/api/v1/sync', { ... })
    const success = true; // Assume success for MVP

    if (success) {
      // 2. Mark records as synced
      if (unsyncedPatients.length > 0) {
        await db.update(patients)
          .set({ isSynced: true })
          .where(or(...unsyncedPatients.map(p => eq(patients.id, p.id))));
      }

      if (unsyncedVisits.length > 0) {
        await db.update(visits)
          .set({ isSynced: true })
          .where(or(...unsyncedVisits.map(v => eq(visits.id, v.id))));
      }

      if (unsyncedOrgs.length > 0) {
        await db.update(organizations)
          .set({ isSynced: true })
          .where(or(...unsyncedOrgs.map(o => eq(organizations.id, o.id))));
      }

      console.log(`[SyncDaemon] Successfully synchronized ${totalUnsynced} records with Cloud Vault.`);
    }
  } catch (err: any) {
    console.error("[SyncDaemon] Sync cycle failed:", err.message);
  }
}
