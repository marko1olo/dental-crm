/**
 * daemonScheduler.ts — Layer 2: Master Audit Coordinator & Daemon Scheduler Lifecycle.
 *
 * Coordinates nightly 21:30 PM SanPiN 3.3686-21 kraft pack storage checks & high-cost
 * surgical inventory reconciliations into a unified quiet digest for backoffice management.
 * Provides timer orchestration, interval loop, and start/stop lifecycle management.
 */

import { runExpensiveMaterialsInventoryAudit } from "./inventoryDeductionRunner.js";
import { runSanpinSterilizationAudit } from "./sanpinCycleRunner.js";
import type {
	InventoryReconciliationAlertItem,
	SanpinAndInventoryAuditDigest,
	SanpinAndInventoryAuditOptions,
	SanpinDaemonSchedulerConfig,
	SanpinSterilizationAlertItem,
} from "./types.js";

/**
 * Combined Nightly 21:30 PM SanPiN 3.3686-21 & Inventory Audit Scan.
 * Generates a unified, quiet digest for Head Nurse and Chief Doctor / Warehouse Manager.
 */
export async function runSanpinAndInventoryAudit(
	options?: SanpinAndInventoryAuditOptions,
): Promise<SanpinAndInventoryAuditDigest[]> {
	try {
		const now = options?.now ?? new Date();
		const orgId = options?.organizationId;

		const sanpinOptions: {
			organizationId?: string;
			now?: Date;
			warningWindowDays?: number;
		} = {};
		if (orgId) sanpinOptions.organizationId = orgId;
		sanpinOptions.now = now;
		if (options?.warningWindowDays !== undefined)
			sanpinOptions.warningWindowDays = options.warningWindowDays;

		const sanpinAlerts = await runSanpinSterilizationAudit(sanpinOptions);

		const inventoryOptions: {
			organizationId?: string;
			targetDate?: Date;
			lookbackHours?: number;
		} = {};
		if (orgId) inventoryOptions.organizationId = orgId;
		inventoryOptions.targetDate = now;
		if (options?.lookbackHours !== undefined)
			inventoryOptions.lookbackHours = options.lookbackHours;

		const inventoryResult =
			await runExpensiveMaterialsInventoryAudit(inventoryOptions);
		const inventoryAlerts = inventoryResult.alerts;

		// Group alerts by organization
		const orgMap = new Map<
			string,
			{
				sanpin: SanpinSterilizationAlertItem[];
				inventory: InventoryReconciliationAlertItem[];
				totalSurgicalActs: number;
			}
		>();

		if (orgId) {
			orgMap.set(orgId, {
				sanpin: [],
				inventory: [],
				totalSurgicalActs: inventoryResult.totalSurgicalActsAudited,
			});
		}

		for (const a of sanpinAlerts) {
			if (!orgMap.has(a.organizationId)) {
				orgMap.set(a.organizationId, {
					sanpin: [],
					inventory: [],
					totalSurgicalActs: 0,
				});
			}
			orgMap.get(a.organizationId)?.sanpin.push(a);
		}

		for (const inv of inventoryAlerts) {
			if (!orgMap.has(inv.organizationId)) {
				orgMap.set(inv.organizationId, {
					sanpin: [],
					inventory: [],
					totalSurgicalActs: inventoryResult.totalSurgicalActsAudited,
				});
			}
			orgMap.get(inv.organizationId)?.inventory.push(inv);
		}

		// Fallback if no alerts but org was requested
		if (orgMap.size === 0 && orgId) {
			orgMap.set(orgId, {
				sanpin: [],
				inventory: [],
				totalSurgicalActs: inventoryResult.totalSurgicalActsAudited,
			});
		}

		const digests: SanpinAndInventoryAuditDigest[] = [];

		for (const [targetOrgId, data] of orgMap.entries()) {
			let totalDiscrepancyRub = 0;
			for (const inv of data.inventory) {
				totalDiscrepancyRub += inv.billedOrInstalled.estimatedPriceRub;
			}

			const expiredCount = data.sanpin.filter(
				(s) => s.status === "EXPIRED",
			).length;
			const expiringSoonCount = data.sanpin.filter(
				(s) => s.status === "EXPIRING_SOON",
			).length;

			const distinctDiscrepantVisits = new Set(
				data.inventory.map((i) => i.visitId),
			);
			const totalSurgicalActs = Math.max(
				data.totalSurgicalActs,
				distinctDiscrepantVisits.size,
			);
			const discrepantCount = distinctDiscrepantVisits.size;
			const reconciledCount = Math.max(0, totalSurgicalActs - discrepantCount);

			digests.push({
				id: `sanpin_inv_digest_${targetOrgId}_${now.getTime()}`,
				organizationId: targetOrgId,
				scanDate: now.toLocaleDateString("ru-RU"),
				scanTimestamp: now.toISOString(),
				summary: {
					totalKraftPacksChecked: data.sanpin.length,
					expiredPacksCount: expiredCount,
					expiringSoonPacksCount: expiringSoonCount,
					totalSurgicalActsAudited: totalSurgicalActs,
					reconciledSurgicalActsCount: reconciledCount,
					discrepantSurgicalActsCount: discrepantCount,
					totalEstimatedDiscrepancyRub: totalDiscrepancyRub,
				},
				sanpinAlerts: data.sanpin,
				inventoryDiscrepancyAlerts: data.inventory,
				createdAt: now.toISOString(),
			});
		}

		return digests;
	} catch (error) {
		console.error(
			"[SanpinAndInventoryDaemon:ERROR] Failed to run SanPiN and inventory combined audit:",
			error,
		);
		throw error;
	}
}

/**
 * Dedicated SanPiN and Inventory Daemon Scheduler & Interval Lifecycle Manager.
 * Handles timer orchestration, graceful start/stop, concurrency protection, and quiet digest emission.
 */
export class SanpinDaemonScheduler {
	private timer: NodeJS.Timeout | null = null;
	private active = false;
	private executing = false;
	private lastRunTimestamp: string | null = null;
	private runsCompleted = 0;
	private config: SanpinDaemonSchedulerConfig;
	private readonly defaultIntervalMs = 60_000; // 1 minute interval for check loop

	constructor(config: SanpinDaemonSchedulerConfig = {}) {
		this.config = config;
	}

	public start(): void {
		if (this.active) return;
		this.active = true;

		const interval = this.config.intervalMs ?? this.defaultIntervalMs;
		this.timer = setInterval(() => {
			void this.tick();
		}, interval);

		if (this.timer.unref) {
			this.timer.unref();
		}

		this.log("Started SanPiN & Inventory background daemon scheduler loop.");
	}

	public stop(): void {
		if (!this.active) return;
		this.active = false;
		if (this.timer) {
			clearInterval(this.timer);
			this.timer = null;
		}
		this.log("Stopped SanPiN & Inventory background daemon scheduler loop.");
	}

	public isRunning(): boolean {
		return this.active;
	}

	public isBusy(): boolean {
		return this.executing;
	}

	public getStatus(): {
		readonly isRunning: boolean;
		readonly isBusy: boolean;
		readonly lastRunTimestamp: string | null;
		readonly runsCompleted: number;
	} {
		return {
			isRunning: this.active,
			isBusy: this.executing,
			lastRunTimestamp: this.lastRunTimestamp,
			runsCompleted: this.runsCompleted,
		};
	}

	public async triggerNow(
		overrideOptions?: SanpinAndInventoryAuditOptions,
	): Promise<SanpinAndInventoryAuditDigest[]> {
		if (this.executing) {
			this.log("Execution already in progress, skipping concurrent trigger.");
			return [];
		}

		this.executing = true;
		try {
			const now =
				overrideOptions?.now ??
				(this.config.nowProvider ? this.config.nowProvider() : new Date());

			const digests = await runSanpinAndInventoryAudit({
				organizationId:
					overrideOptions?.organizationId ?? this.config.organizationId,
				now,
				warningWindowDays:
					overrideOptions?.warningWindowDays ?? this.config.warningWindowDays,
				lookbackHours:
					overrideOptions?.lookbackHours ?? this.config.lookbackHours,
			});

			this.lastRunTimestamp = now.toISOString();
			this.runsCompleted++;

			if (this.config.onDigest) {
				await this.config.onDigest(digests);
			}

			return digests;
		} catch (err) {
			if (this.config.onError) {
				this.config.onError(err);
			} else {
				this.logError("SanPiN & Inventory audit run encountered an error:", err);
			}
			return [];
		} finally {
			this.executing = false;
		}
	}

	private async tick(): Promise<void> {
		if (!this.active || this.executing) return;
		await this.triggerNow();
	}

	private log(message: string): void {
		if (this.config.logger?.info) {
			this.config.logger.info(`[SanpinDaemonScheduler] ${message}`);
		}
	}

	private logError(message: string, error: unknown): void {
		if (this.config.logger?.error) {
			this.config.logger.error(`[SanpinDaemonScheduler] ${message} ${String(error)}`);
		} else {
			console.error(`[SanpinDaemonScheduler] ${message}`, error);
		}
	}
}

/**
 * Default singleton instance of the SanPiN & Inventory Daemon Scheduler.
 */
export const defaultSanpinDaemonScheduler = new SanpinDaemonScheduler();
