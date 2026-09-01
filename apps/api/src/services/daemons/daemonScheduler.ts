/**
 * daemonScheduler.ts — Unified Background Daemon & Audit Job Scheduler.
 *
 * Coordinates scheduled clinical, sanitary, and financial audit routines:
 * 1. 07:30 AM: `somaticRadarDaemon` — Morning Pre-Shift Somatic Risk & DDI Clinical Radar Scan.
 * 2. 08:00 AM: `ztlLookAheadDaemon` — Proactive ZTL (Dental Lab) upcoming appointment audit.
 * 3. 21:00 PM: `emrSaviorDaemon` — EMR Savior 043/у SOAP note drafting for shift closure.
 * 4. 21:30 PM: `sanpinAndInventoryDaemon` — SanPiN 3.3686-21 kraft pack 50-day monitor & high-cost surgical ТМЦ reconciliation.
 * 5. Weekly (Sunday 22:00 PM): `abandonedTreatmentHunterDaemon` — Retention & broken clinical funnels audit.
 * 6. Event-Driven: `smartGapFillerService` — Real-time gap filler when appointment is cancelled.
 *
 * Implements non-intrusive in-process scheduler with exact minute deduplication,
 * multi-tenant execution, and error isolation.
 */

import { sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
	runWeeklyRetentionScan,
	type WeeklyRetentionSummary,
} from "./abandonedTreatmentHunterDaemon.js";
import {
	type EmrSaviorDraftAlert,
	runEmrSaviorScan,
} from "./emrSaviorDaemon.js";
import {
	runSanpinAndInventoryAudit,
	type SanpinAndInventoryAuditDigest,
} from "./sanpinAndInventoryDaemon.js";
import {
	type GapFillerAlert,
	triggerSmartGapFiller,
} from "./smartGapFillerService.js";
import {
	runSomaticRadarScan,
	type SomaticRadarAlert,
} from "./somaticRadarDaemon.js";
import {
	runZtlLookAheadScan,
	type ZtlLookAheadAlert,
} from "./ztlLookAheadDaemon.js";

export type DaemonJobName =
	| "somatic_radar_0730"
	| "ztl_lookahead_0800"
	| "emr_savior_2100"
	| "sanpin_inventory_2130"
	| "weekly_retention_sunday";

export interface ScheduledDaemonJob {
	readonly name: DaemonJobName;
	readonly description: string;
	readonly scheduledTime: string; // "HH:MM" in 24-hour format
	readonly daysOfWeek?: number[]; // [0 = Sun, 1 = Mon, ..., 6 = Sat]
	readonly runner: (options?: {
		organizationId?: string;
		now?: Date;
	}) => Promise<unknown>;
}

export interface DaemonSchedulerOptions {
	organizationId?: string | undefined;
	pollIntervalMs?: number | undefined;
	enableSomaticRadar?: boolean | undefined;
	enableZtlLookAhead?: boolean | undefined;
	enableEmrSavior?: boolean | undefined;
	enableSanpinAndInventory?: boolean | undefined;
	enableWeeklyRetention?: boolean | undefined;
	logger?:
		| {
				info?: (msg: string) => void;
				warn?: (msg: string) => void;
				error?: (msg: string) => void;
		  }
		| ((msg: string) => void)
		| undefined;
	nowProvider?: (() => Date) | undefined;
}

export interface ProactiveAlertsAggregate {
	readonly somaticAlerts: SomaticRadarAlert[];
	readonly ztlAlerts: ZtlLookAheadAlert[];
	readonly emrSaviorDrafts: EmrSaviorDraftAlert[];
	readonly retentionSummaries: WeeklyRetentionSummary[];
	readonly sanpinAndInventoryDigests: SanpinAndInventoryAuditDigest[];
	readonly totalAlertsCount: number;
	readonly scannedAt: string;
}

export class DaemonScheduler {
	private timer: NodeJS.Timeout | null = null;
	private isRunning = false;
	private lastExecutedDateHourMinute = new Map<DaemonJobName, string>();
	private options: DaemonSchedulerOptions;
	private nowProvider: () => Date;

	// In-memory caches for proactive alert aggregation
	private cachedSomaticAlerts: SomaticRadarAlert[] = [];
	private cachedZtlAlerts: ZtlLookAheadAlert[] = [];
	private cachedEmrAlerts: EmrSaviorDraftAlert[] = [];
	private cachedRetentionSummaries: WeeklyRetentionSummary[] = [];
	private cachedSanpinDigests: SanpinAndInventoryAuditDigest[] = [];
	private cachedGapFillerAlerts = new Map<string, GapFillerAlert>();

	public readonly jobs: ScheduledDaemonJob[];

	constructor(options?: DaemonSchedulerOptions) {
		this.options = {
			organizationId: options?.organizationId ?? "",
			pollIntervalMs: options?.pollIntervalMs ?? 30000, // Check every 30 seconds
			enableSomaticRadar: options?.enableSomaticRadar ?? true,
			enableZtlLookAhead: options?.enableZtlLookAhead ?? true,
			enableEmrSavior: options?.enableEmrSavior ?? true,
			enableSanpinAndInventory: options?.enableSanpinAndInventory ?? true,
			enableWeeklyRetention: options?.enableWeeklyRetention ?? true,
			logger: options?.logger ?? {
				info: (msg: string) => console.log(`[DaemonScheduler:INFO] ${msg}`),
				warn: (msg: string) => console.warn(`[DaemonScheduler:WARN] ${msg}`),
				error: (msg: string) => console.error(`[DaemonScheduler:ERROR] ${msg}`),
			},
		};

		this.nowProvider = options?.nowProvider ?? (() => new Date());

		this.jobs = [
			{
				name: "somatic_radar_0730",
				description:
					"07:30 AM Morning Pre-Shift Somatic Risk & DDI Clinical Radar Scan",
				scheduledTime: "07:30",
				runner: async (opts) => {
					const scanOpts: {
						organizationId?: string | undefined;
						now?: Date | undefined;
						targetDate?: Date | undefined;
					} = {};
					if (opts?.organizationId)
						scanOpts.organizationId = opts.organizationId;
					if (opts?.now) {
						scanOpts.now = opts.now;
						scanOpts.targetDate = opts.now;
					}
					const alerts = await runSomaticRadarScan(scanOpts);
					this.cachedSomaticAlerts = alerts;
					return alerts;
				},
			},
			{
				name: "ztl_lookahead_0800",
				description: "08:00 AM Proactive ZTL Dental Lab Orders Look-Ahead Scan",
				scheduledTime: "08:00",
				runner: async (opts) => {
					const args: {
						organizationId?: string | undefined;
						now?: Date | undefined;
					} = {};
					if (opts?.organizationId) args.organizationId = opts.organizationId;
					if (opts?.now) args.now = opts.now;
					const alerts = await runZtlLookAheadScan(args);
					this.cachedZtlAlerts = alerts;
					return alerts;
				},
			},
			{
				name: "emr_savior_2100",
				description: "21:00 PM EMR Savior 043/у Note Drafter for Shift Closure",
				scheduledTime: "21:00",
				runner: async (opts) => {
					const args: {
						organizationId?: string | undefined;
						targetDate?: Date | undefined;
					} = {};
					if (opts?.organizationId) args.organizationId = opts.organizationId;
					if (opts?.now) args.targetDate = opts.now;
					const alerts = await runEmrSaviorScan(args);
					this.cachedEmrAlerts = alerts;
					return alerts;
				},
			},
			{
				name: "sanpin_inventory_2130",
				description:
					"21:30 PM SanPiN 3.3686-21 Kraft Packs & Expensive Materials Inventory Reconciliation",
				scheduledTime: "21:30",
				runner: async (opts) => {
					const args: {
						organizationId?: string | undefined;
						now?: Date | undefined;
					} = {};
					if (opts?.organizationId) args.organizationId = opts.organizationId;
					if (opts?.now) args.now = opts.now;
					const digests = await runSanpinAndInventoryAudit(args);
					this.cachedSanpinDigests = digests;
					return digests;
				},
			},
			{
				name: "weekly_retention_sunday",
				description:
					"Weekly Sunday 22:00 PM Retention & Abandoned Treatment Hunter",
				scheduledTime: "22:00",
				daysOfWeek: [0], // Sunday
				runner: async (opts) => {
					const args: {
						organizationId?: string | undefined;
						now?: Date | undefined;
					} = {};
					if (opts?.organizationId) args.organizationId = opts.organizationId;
					if (opts?.now) args.now = opts.now;
					const summaries = await runWeeklyRetentionScan(args);
					this.cachedRetentionSummaries = summaries;
					return summaries;
				},
			},
		];
	}

	private log(msg: string): void {
		const logger = this.options.logger;
		if (typeof logger === "function") {
			logger(`[DaemonScheduler] ${msg}`);
		} else if (logger && typeof logger.info === "function") {
			logger.info(`[DaemonScheduler] ${msg}`);
		} else {
			console.log(`[DaemonScheduler] ${msg}`);
		}
	}

	/**
	 * Starts the background polling loop.
	 */
	public start(startOptions?: { logger?: unknown }): void {
		if (startOptions?.logger !== undefined) {
			this.options.logger =
				startOptions.logger as DaemonSchedulerOptions["logger"];
		}
		if (this.isRunning) return;
		this.isRunning = true;
		this.log("Starting daemon scheduler background loop...");

		const pollMs = this.options.pollIntervalMs ?? 30000;
		this.timer = setInterval(() => {
			this.checkAndRunJobs().catch((err) => {
				this.log(`Error during checkAndRunJobs: ${err?.message || err}`);
			});
		}, pollMs);

		// Trigger check immediately on startup
		this.checkAndRunJobs().catch((err) => {
			this.log(`Initial check error: ${err?.message || err}`);
		});
	}

	/**
	 * Stops the background loop.
	 */
	public stop(): void {
		if (this.timer) {
			clearInterval(this.timer);
			this.timer = null;
		}
		this.isRunning = false;
		this.log("Daemon scheduler stopped.");
	}

	public getActiveStatus(): boolean {
		return this.isRunning;
	}

	public getCachedSomaticAlerts(): readonly SomaticRadarAlert[] {
		return this.cachedSomaticAlerts;
	}

	public getCachedZtlAlerts(): readonly ZtlLookAheadAlert[] {
		return this.cachedZtlAlerts;
	}

	public getCachedEmrAlerts(): readonly EmrSaviorDraftAlert[] {
		return this.cachedEmrAlerts;
	}

	public getCachedRetentionSummaries(): readonly WeeklyRetentionSummary[] {
		return this.cachedRetentionSummaries;
	}

	public getCachedSanpinDigests(): readonly SanpinAndInventoryAuditDigest[] {
		return this.cachedSanpinDigests;
	}

	public getCachedGapFillerAlerts(): ReadonlyMap<string, GapFillerAlert> {
		return this.cachedGapFillerAlerts;
	}

	/**
	 * Evaluates current time against registered jobs and executes matching tasks.
	 */
	public async checkAndRunJobs(now?: Date): Promise<DaemonJobName[]> {
		const currentNow = now ?? this.nowProvider();
		const executedJobs: DaemonJobName[] = [];
		const currentHour = String(currentNow.getHours()).padStart(2, "0");
		const currentMin = String(currentNow.getMinutes()).padStart(2, "0");
		const currentTimeStr = `${currentHour}:${currentMin}`;
		const currentDayOfWeek = currentNow.getDay();
		const dateKey = `${currentNow.getFullYear()}-${currentNow.getMonth() + 1}-${currentNow.getDate()}_${currentTimeStr}`;

		for (const job of this.jobs) {
			if (
				job.name === "somatic_radar_0730" &&
				this.options.enableSomaticRadar === false
			)
				continue;
			if (
				job.name === "ztl_lookahead_0800" &&
				this.options.enableZtlLookAhead === false
			)
				continue;
			if (
				job.name === "emr_savior_2100" &&
				this.options.enableEmrSavior === false
			)
				continue;
			if (
				job.name === "sanpin_inventory_2130" &&
				this.options.enableSanpinAndInventory === false
			)
				continue;
			if (
				job.name === "weekly_retention_sunday" &&
				this.options.enableWeeklyRetention === false
			)
				continue;

			if (job.daysOfWeek && !job.daysOfWeek.includes(currentDayOfWeek)) {
				continue;
			}

			if (job.scheduledTime === currentTimeStr) {
				const lastRun = this.lastExecutedDateHourMinute.get(job.name);
				if (lastRun === dateKey) {
					continue;
				}

				let lockAcquired = true;
				try {
					const lockResult = await db.execute<{ acquired: boolean }>(
						sql`SELECT pg_try_advisory_lock(hashtext(${`daemon_${job.name}`})) AS acquired`,
					);
					const row = lockResult.rows?.[0] as
						| { acquired?: boolean }
						| undefined;
					if (row && row.acquired === false) {
						lockAcquired = false;
						this.log(
							`Job «${job.name}» skipped: advisory lock held by another cluster instance.`,
						);
						continue;
					}
				} catch {
					// Fallback in environments without live DB connection or mock test runners
				}

				this.log(
					`Executing scheduled job «${job.name}» (${job.description})...`,
				);
				this.lastExecutedDateHourMinute.set(job.name, dateKey);

				try {
					const runOpts: { organizationId?: string; now?: Date } = {
						now: currentNow,
					};
					if (this.options.organizationId) {
						runOpts.organizationId = this.options.organizationId;
					}
					await job.runner(runOpts);
					executedJobs.push(job.name);
					this.log(`Successfully completed job «${job.name}».`);
				} catch (err: unknown) {
					const errorMsg = err instanceof Error ? err.message : String(err);
					this.log(`Job «${job.name}» failed: ${errorMsg}`);
				} finally {
					if (lockAcquired) {
						try {
							await db.execute(
								sql`SELECT pg_advisory_unlock(hashtext(${`daemon_${job.name}`}))`,
							);
						} catch {
							// Safe ignore
						}
					}
				}
			}
		}

		return executedJobs;
	}

	// ─── ROUTE-LEVEL ON-DEMAND TRIGGER METHODS (COPILOT & REST) ─────────────

	public async triggerSomaticRadarScan(options?: {
		organizationId?: string | undefined;
		targetDate?: Date | undefined;
		now?: Date | undefined;
	}): Promise<SomaticRadarAlert[]> {
		const args: { organizationId?: string; targetDate?: Date; now?: Date } = {};
		if (options?.organizationId) args.organizationId = options.organizationId;
		if (options?.targetDate) args.targetDate = options.targetDate;
		if (options?.now) args.now = options.now;
		return runSomaticRadarScan(args);
	}

	public async runSomaticRadarScanNow(options?: {
		organizationId?: string | undefined;
		targetDate?: Date | undefined;
		now?: Date | undefined;
	}): Promise<SomaticRadarAlert[]> {
		return this.triggerSomaticRadarScan(options);
	}

	public async triggerZtlScan(options?: {
		organizationId?: string | undefined;
		lookAheadHours?: number | undefined;
		now?: Date | undefined;
	}): Promise<ZtlLookAheadAlert[]> {
		const args: {
			organizationId?: string;
			lookAheadHours?: number;
			now?: Date;
		} = {};
		if (options?.organizationId) args.organizationId = options.organizationId;
		if (options?.lookAheadHours !== undefined)
			args.lookAheadHours = options.lookAheadHours;
		if (options?.now) args.now = options.now;
		return runZtlLookAheadScan(args);
	}

	public async triggerEmrSaviorScan(options?: {
		organizationId?: string | undefined;
		targetDate?: Date | undefined;
	}): Promise<EmrSaviorDraftAlert[]> {
		const args: { organizationId?: string; targetDate?: Date } = {};
		if (options?.organizationId) args.organizationId = options.organizationId;
		if (options?.targetDate) args.targetDate = options.targetDate;
		return runEmrSaviorScan(args);
	}

	public async triggerRetentionScan(options?: {
		organizationId?: string | undefined;
		now?: Date | undefined;
	}): Promise<WeeklyRetentionSummary[]> {
		const args: {
			organizationId?: string | undefined;
			now?: Date | undefined;
		} = {};
		if (options?.organizationId) args.organizationId = options.organizationId;
		if (options?.now) args.now = options.now;
		return runWeeklyRetentionScan(args);
	}

	public async triggerGapFiller(
		cancelledAppointmentId: string,
		options?: {
			organizationId?: string | undefined;
			maxCandidates?: number | undefined;
		},
	): Promise<GapFillerAlert | null> {
		const args: {
			organizationId?: string | undefined;
			maxCandidates?: number | undefined;
		} = {};
		if (options?.organizationId) args.organizationId = options.organizationId;
		if (options?.maxCandidates !== undefined)
			args.maxCandidates = options.maxCandidates;
		return triggerSmartGapFiller(cancelledAppointmentId, args);
	}

	public async triggerSanpinAndInventoryAudit(options?: {
		organizationId?: string | undefined;
		now?: Date | undefined;
		lookbackHours?: number | undefined;
		warningWindowDays?: number | undefined;
	}): Promise<SanpinAndInventoryAuditDigest[]> {
		const args: {
			organizationId?: string | undefined;
			now?: Date | undefined;
			lookbackHours?: number | undefined;
			warningWindowDays?: number | undefined;
		} = {};
		if (options?.organizationId) args.organizationId = options.organizationId;
		if (options?.now) args.now = options.now;
		if (options?.lookbackHours !== undefined)
			args.lookbackHours = options.lookbackHours;
		if (options?.warningWindowDays !== undefined)
			args.warningWindowDays = options.warningWindowDays;
		return runSanpinAndInventoryAudit(args);
	}

	/**
	 * Returns unified proactive alerts across all daemons.
	 */
	public async getProactiveAlerts(options?: {
		organizationId?: string;
		liveScan?: boolean;
	}): Promise<ProactiveAlertsAggregate> {
		const orgId = options?.organizationId;
		const now = this.nowProvider();

		const [
			somaticAlerts,
			ztlAlerts,
			emrSaviorDrafts,
			retentionSummaries,
			sanpinAndInventoryDigests,
		] = await Promise.all([
			this.triggerSomaticRadarScan(
				orgId ? { organizationId: orgId, now } : { now },
			),
			this.triggerZtlScan(orgId ? { organizationId: orgId, now } : { now }),
			this.triggerEmrSaviorScan(
				orgId
					? { organizationId: orgId, targetDate: now }
					: { targetDate: now },
			),
			this.triggerRetentionScan(
				orgId ? { organizationId: orgId, now } : { now },
			),
			this.triggerSanpinAndInventoryAudit(
				orgId ? { organizationId: orgId, now } : { now },
			),
		]);

		let totalCount =
			somaticAlerts.length + ztlAlerts.length + emrSaviorDrafts.length;
		for (const r of retentionSummaries) {
			totalCount += r.topPriorityPatients.length;
		}
		for (const d of sanpinAndInventoryDigests) {
			totalCount += d.sanpinAlerts.length + d.inventoryDiscrepancyAlerts.length;
		}

		return {
			somaticAlerts,
			ztlAlerts,
			emrSaviorDrafts,
			retentionSummaries,
			sanpinAndInventoryDigests,
			totalAlertsCount: totalCount,
			scannedAt: now.toISOString(),
		};
	}
}

/**
 * Singleton instance of DaemonScheduler for API server runtime.
 */
export const defaultDaemonScheduler = new DaemonScheduler();
