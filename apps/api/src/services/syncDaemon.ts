import { and, eq, ne, or } from "drizzle-orm";
import { db } from "../db/client.js";
import {
	cashLedger,
	organizations,
	patientInvoices,
	patients,
	toothStates,
	treatmentPlans,
	visitDiaries,
} from "../db/schema.js";

let syncInterval: NodeJS.Timeout | null = null;
const SYNC_INTERVAL_MS = 30000; // 30 seconds

function syncDaemonEnabled(): boolean {
	return process.env.DENTE_SYNC_DAEMON_ENABLED === "1";
}

function mockCloudExchangeEnabled(): boolean {
	return (
		process.env.NODE_ENV !== "production" &&
		process.env.DENTE_SYNC_MOCK_CLOUD_ENABLED === "1"
	);
}

export function startSyncDaemon() {
	if (!syncDaemonEnabled()) {
		console.log(
			"[SyncDaemon] Disabled. Set DENTE_SYNC_DAEMON_ENABLED=1 to start synchronization.",
		);
		return;
	}
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
 * Mocks the cloud server interaction
 * Returns mock changes from the Patient Portal/cloud (e.g. invoice payments, patient updates)
 */
async function mockCloudVaultExchange(localPayload: any) {
	const cloudChanges: {
		patients: any[];
		visitDiaries: any[];
		toothStates: any[];
		treatmentPlans: any[];
		patientInvoices: any[];
	} = {
		patients: [],
		visitDiaries: [],
		toothStates: [],
		treatmentPlans: [],
		patientInvoices: [],
	};

	try {
		// 1. Simulate a patient paying their invoice through the online Patient Portal
		// Find an unpaid local invoice to mark as paid in the cloud
		const unpaid = await db
			.select()
			.from(patientInvoices)
			.where(ne(patientInvoices.status, "paid"))
			.limit(1);

		if (unpaid.length > 0) {
			const targetInvoice = unpaid[0];
			if (targetInvoice) {
				console.log(
					`[SyncDaemon Mock] Simulating online payment for invoice ${targetInvoice.id} in Patient Portal`,
				);
				cloudChanges.patientInvoices.push({
					...targetInvoice,
					status: "paid",
					version: targetInvoice.version + 1,
					isSynced: true,
					updatedAt: new Date(),
				});
			}
		}
	} catch (err: any) {
		console.warn(
			"[SyncDaemon Mock] Failed to generate mock cloud changes:",
			err.message,
		);
	}

	return {
		success: true,
		cloudChanges,
	};
}

export type SyncReport = {
	timestamp: string;
	uploadedCount: number;
	downloadedCount: number;
	details: {
		patients: { uploaded: number; downloaded: number };
		visitDiaries: { uploaded: number; downloaded: number };
		toothStates: { uploaded: number; downloaded: number };
		treatmentPlans: { uploaded: number; downloaded: number };
		patientInvoices: { uploaded: number; downloaded: number };
	};
};

/**
 * Runs a single sync cycle
 */
export async function runSyncCycle(): Promise<SyncReport> {
	const report: SyncReport = {
		timestamp: new Date().toISOString(),
		uploadedCount: 0,
		downloadedCount: 0,
		details: {
			patients: { uploaded: 0, downloaded: 0 },
			visitDiaries: { uploaded: 0, downloaded: 0 },
			toothStates: { uploaded: 0, downloaded: 0 },
			treatmentPlans: { uploaded: 0, downloaded: 0 },
			patientInvoices: { uploaded: 0, downloaded: 0 },
		},
	};

	try {
		// 1. Fetch unsynced local records
		const unsyncedPatients = await db
			.select()
			.from(patients)
			.where(eq(patients.isSynced, false));
		const unsyncedDiaries = await db
			.select()
			.from(visitDiaries)
			.where(eq(visitDiaries.isSynced, false));
		const unsyncedToothStates = await db
			.select()
			.from(toothStates)
			.where(eq(toothStates.isSynced, false));
		const unsyncedPlans = await db
			.select()
			.from(treatmentPlans)
			.where(eq(treatmentPlans.isSynced, false));
		const unsyncedInvoices = await db
			.select()
			.from(patientInvoices)
			.where(eq(patientInvoices.isSynced, false));

		const totalUnsynced =
			unsyncedPatients.length +
			unsyncedDiaries.length +
			unsyncedToothStates.length +
			unsyncedPlans.length +
			unsyncedInvoices.length;

		report.uploadedCount = totalUnsynced;
		report.details.patients.uploaded = unsyncedPatients.length;
		report.details.visitDiaries.uploaded = unsyncedDiaries.length;
		report.details.toothStates.uploaded = unsyncedToothStates.length;
		report.details.treatmentPlans.uploaded = unsyncedPlans.length;
		report.details.patientInvoices.uploaded = unsyncedInvoices.length;

		if (totalUnsynced > 0) {
			console.log(
				`[SyncDaemon] Outbound sync: pushing ${totalUnsynced} unsynced records to Cloud Vault`,
			);
		}

		// 2. Exchange payloads with the cloud server
		const localPayload = {
			patients: unsyncedPatients,
			visitDiaries: unsyncedDiaries,
			toothStates: unsyncedToothStates,
			treatmentPlans: unsyncedPlans,
			patientInvoices: unsyncedInvoices,
		};

		const response = mockCloudExchangeEnabled()
			? await mockCloudVaultExchange(localPayload)
			: {
					success: true,
					cloudChanges: {
						patients: [],
						visitDiaries: [],
						toothStates: [],
						treatmentPlans: [],
						patientInvoices: [],
					},
				};

		if (response.success) {
			// Mark uploaded records as synced
			if (unsyncedPatients.length > 0) {
				await db
					.update(patients)
					.set({ isSynced: true })
					.where(or(...unsyncedPatients.map((p) => eq(patients.id, p.id))));
			}
			if (unsyncedDiaries.length > 0) {
				await db
					.update(visitDiaries)
					.set({ isSynced: true })
					.where(or(...unsyncedDiaries.map((d) => eq(visitDiaries.id, d.id))));
			}
			if (unsyncedToothStates.length > 0) {
				await db
					.update(toothStates)
					.set({ isSynced: true })
					.where(
						or(...unsyncedToothStates.map((s) => eq(toothStates.id, s.id))),
					);
			}
			if (unsyncedPlans.length > 0) {
				await db
					.update(treatmentPlans)
					.set({ isSynced: true })
					.where(or(...unsyncedPlans.map((p) => eq(treatmentPlans.id, p.id))));
			}
			if (unsyncedInvoices.length > 0) {
				await db
					.update(patientInvoices)
					.set({ isSynced: true })
					.where(
						or(...unsyncedInvoices.map((i) => eq(patientInvoices.id, i.id))),
					);
			}

			// 3. Process inbound cloud changes (conflict resolution using Last-Write-Wins)
			const cloud = response.cloudChanges;

			// Helper function for Last-Write-Wins merging
			const mergeTable = async (
				table: any,
				cloudRecords: any[],
				detailsKey: keyof typeof report.details,
			) => {
				for (const record of cloudRecords) {
					const localMatch = await db
						.select()
						.from(table)
						.where(eq(table.id, record.id))
						.limit(1);
					const local = localMatch[0];
					if (!local) {
						// New record from cloud -> Insert locally
						await db.insert(table).values({ ...record, isSynced: true });
						report.downloadedCount++;
						report.details[detailsKey].downloaded++;
					} else {
						const localDate = local.updatedAt
							? new Date(local.updatedAt).getTime()
							: 0;
						const cloudDate = record.updatedAt
							? new Date(record.updatedAt).getTime()
							: 0;

						if (cloudDate > localDate) {
							// Cloud is newer -> Update locally
							await db
								.update(table)
								.set({ ...record, isSynced: true })
								.where(eq(table.id, record.id));
							report.downloadedCount++;
							report.details[detailsKey].downloaded++;

							// Side-effects: if patient paid invoice in cloud, insert payment in local ledger
							if (
								table === patientInvoices &&
								record.status === "paid" &&
								local.status !== "paid"
							) {
								console.log(
									`[SyncDaemon] Invoice ${record.id} was paid online. Logging transaction to cash_ledger`,
								);
								await db.insert(cashLedger).values({
									invoiceId: record.id,
									paymentMethod: "card",
									amountRub: record.totalAmountRub,
									timestamp: new Date(),
								});
							}
						} else {
							// Local is newer -> Mark as unsynced to upload it in next cycle
							await db
								.update(table)
								.set({ isSynced: false })
								.where(eq(table.id, record.id));
						}
					}
				}
			};

			await mergeTable(patients, cloud.patients, "patients");
			await mergeTable(visitDiaries, cloud.visitDiaries, "visitDiaries");
			await mergeTable(toothStates, cloud.toothStates, "toothStates");
			await mergeTable(treatmentPlans, cloud.treatmentPlans, "treatmentPlans");
			await mergeTable(
				patientInvoices,
				cloud.patientInvoices,
				"patientInvoices",
			);
		}
	} catch (err: any) {
		console.error("[SyncDaemon] Sync cycle failed:", err.message);
	}

	return report;
}
