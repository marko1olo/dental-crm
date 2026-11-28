/**
 * daemonScheduler.ts — Unified Background Daemon & Audit Job Scheduler.
 *
 * Job definitions and option contracts live in `./daemonJobRegistry.ts`.
 */

import { pool } from "../../db/client.js";
import { BoundedTtlMap } from "../../lib/boundedTtlMap.js";
import { createApiLogger, safeLogError } from "../../observability/index.js";
import {
	runWeeklyRetentionScan,
	type WeeklyRetentionSummary,
} from "./abandonedTreatmentHunterDaemon.js";
import {
	type AdvisoryLockClient,
	type AdvisoryLockPool,
	buildScheduledDaemonJobs,
	type DaemonJobName,
	type DaemonSchedulerOptions,
	type ProactiveAlertsAggregate,
	type ScheduledDaemonJob,
} from "./daemonJobRegistry.js";
import {
	type EmrSaviorDraftAlert,
	runEmrSaviorScan,
} from "./emrSaviorDaemon.js";
import {
	type MdlpOutboxDaemonDigest,
	type MdlpOutboxDaemonOptions,
	runMdlpOutboxDaemon,
} from "./mdlpOutboxDaemon.js";
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

export type {
	DaemonJobName,
	DaemonSchedulerOptions,
	ProactiveAlertsAggregate,
	ScheduledDaemonJob,
} from "./daemonJobRegistry.js";
export {
	runMdlpOutboxDaemon,
	type MdlpOutboxDaemonDigest,
	type MdlpOutboxDaemonOptions,
	type MdlpTransportFn,
	type MdlpTransportResult,
} from "./mdlpOutboxDaemon.js";

const defaultDaemonLogger = createApiLogger("daemonScheduler");

export async function acquireSessionAdvisoryLock(
	jobName: DaemonJobName,
	lockPool: AdvisoryLockPool = pool,
): Promise<{ client: AdvisoryLockClient | null; acquired: boolean }> {
	let client: AdvisoryLockClient | null = null;
	try {
		client = await lockPool.connect();
		const lockResult = await client.query(
			"SELECT pg_try_advisory_lock(hashtext($1)) AS acquired",
			[`daemon_${jobName}`],
		);
		const acquired = lockResult.rows[0]?.acquired === true;
		if (!acquired) {
			try {
				client.release();
			} catch (releaseErr: unknown) {
				defaultDaemonLogger.warn(
					{ err: safeLogError(releaseErr), jobName },
					"[DaemonScheduler] Failed to release advisory lock connection after contention",
				);
			}
			return { client: null, acquired: false };
		}
		return { client, acquired: true };
	} catch (err: unknown) {
		defaultDaemonLogger.error(
			{ err: safeLogError(err), jobName },
			"[DaemonScheduler] Advisory lock acquisition failed; failing closed to prevent split-brain",
		);
		if (client) {
			try {
				client.release(true);
			} catch (cleanupErr: unknown) {
				defaultDaemonLogger.warn(
					{ err: safeLogError(cleanupErr), jobName },
					"[DaemonScheduler] Failed to destroy broken pool client after lock error",
				);
			}
		}
		return { client: null, acquired: false };
	}
}

export async function releaseSessionAdvisoryLock(
	client: AdvisoryLockClient | null,
	jobName: DaemonJobName,
): Promise<void> {
	if (!client) return;
	let unlockFailed = false;
	try {
		await client.query("SELECT pg_advisory_unlock(hashtext($1))", [`daemon_${jobName}`]);
	} catch (err: unknown) {
		unlockFailed = true;
		defaultDaemonLogger.warn(
			{ err: safeLogError(err), jobName },
			"[DaemonScheduler] Failed to unlock session advisory lock; destroying connection",
		);
	} finally {
		try {
			client.release(unlockFailed ? true : undefined);
		} catch (releaseErr: unknown) {
			defaultDaemonLogger.warn(
				{ err: safeLogError(releaseErr), jobName },
				"[DaemonScheduler] Failed to release advisory lock connection",
			);
		}
	}
}

export class DaemonScheduler {
	private timer: NodeJS.Timeout | null = null;
	private isRunning = false;
	private isChecking = false;
	private lastExecutedDateHourMinute = new BoundedTtlMap<DaemonJobName, string>({
		maxEntries: 64,
		ttlMs: 48 * 60 * 60_000,
	});
	private options: DaemonSchedulerOptions;
	private nowProvider: () => Date;

	private cachedSomaticAlerts: SomaticRadarAlert[] = [];
	private cachedZtlAlerts: ZtlLookAheadAlert[] = [];
	private cachedEmrAlerts: EmrSaviorDraftAlert[] = [];
	private cachedRetentionSummaries: WeeklyRetentionSummary[] = [];
	private cachedSanpinDigests: SanpinAndInventoryAuditDigest[] = [];
	private cachedGapFillerAlerts = new BoundedTtlMap<string, GapFillerAlert>({
		maxEntries: 1000,
		ttlMs: 60 * 60_000,
	});

	public readonly jobs: ScheduledDaemonJob[];

	constructor(options?: DaemonSchedulerOptions) {
		this.options = {
			organizationId: options?.organizationId ?? "",
			pollIntervalMs: options?.pollIntervalMs ?? 30000,
			enableSomaticRadar: options?.enableSomaticRadar ?? true,
			enableZtlLookAhead: options?.enableZtlLookAhead ?? true,
			enableEmrSavior: options?.enableEmrSavior ?? true,
			enableSanpinAndInventory: options?.enableSanpinAndInventory ?? true,
			enableWeeklyRetention: options?.enableWeeklyRetention ?? true,
			enableMdlpOutbox: options?.enableMdlpOutbox ?? true,
			advisoryLockPool: options?.advisoryLockPool,
			logger: options?.logger ?? defaultDaemonLogger,
		};

		this.nowProvider = options?.nowProvider ?? (() => new Date());

		this.jobs = buildScheduledDaemonJobs({
			setSomaticAlerts: (alerts) => {
				this.cachedSomaticAlerts = alerts;
			},
			setZtlAlerts: (alerts) => {
				this.cachedZtlAlerts = alerts;
			},
			setEmrAlerts: (alerts) => {
				this.cachedEmrAlerts = alerts;
			},
			setSanpinDigests: (digests) => {
				this.cachedSanpinDigests = digests;
			},
			setRetentionSummaries: (summaries) => {
				this.cachedRetentionSummaries = summaries;
			},
		});
	}

	private log(msg: string): void {
		const logger = this.options.logger ?? defaultDaemonLogger;
		if (typeof logger === "function") {
			logger(`[DaemonScheduler] ${msg}`);
		} else if (logger && typeof logger.info === "function") {
			logger.info(`[DaemonScheduler] ${msg}`);
		} else {
			defaultDaemonLogger.info(msg);
		}
	}

	public start(startOptions?: { logger?: DaemonSchedulerOptions["logger"] }): void {
		if (startOptions?.logger !== undefined) {
			this.options.logger = startOptions.logger;
		}
		if (this.isRunning) return;
		this.isRunning = true;
		this.log("Starting daemon scheduler background loop...");

		const pollMs = this.options.pollIntervalMs ?? 30000;
		const timer = setInterval(() => {
			this.checkAndRunJobs().catch((err: unknown) => {
				const msg = err instanceof Error ? err.message : String(err);
				this.log(`Error during checkAndRunJobs: ${msg}`);
			});
		}, pollMs);
		timer.unref();
		this.timer = timer;

		this.checkAndRunJobs().catch((err: unknown) => {
			const msg = err instanceof Error ? err.message : String(err);
			this.log(`Initial check error: ${msg}`);
		});
	}

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
		return new Map(this.cachedGapFillerAlerts.entries());
	}

	private isJobEnabled(name: DaemonJobName): boolean {
		if (name === "somatic_radar_0730") return this.options.enableSomaticRadar !== false;
		if (name === "ztl_lookahead_0800") return this.options.enableZtlLookAhead !== false;
		if (name === "emr_savior_2100") return this.options.enableEmrSavior !== false;
		if (name === "sanpin_inventory_2130") {
			return this.options.enableSanpinAndInventory !== false;
		}
		if (name === "weekly_retention_sunday") {
			return this.options.enableWeeklyRetention !== false;
		}
		return true;
	}

	/**
	 * Evaluates current time against registered jobs and executes matching tasks
	 * with a dedicated-connection session advisory lock (preventing cross-connection unlock mismatch).
	 */
	public async checkAndRunJobs(now?: Date): Promise<DaemonJobName[]> {
		if (this.isChecking) return [];
		this.isChecking = true;
		try {
			const currentNow = now ?? this.nowProvider();
			const executedJobs: DaemonJobName[] = [];
			const currentHour = String(currentNow.getHours()).padStart(2, "0");
			const currentMin = String(currentNow.getMinutes()).padStart(2, "0");
			const currentTimeStr = `${currentHour}:${currentMin}`;
			const currentDayOfWeek = currentNow.getDay();
			const dateKey = `${currentNow.getFullYear()}-${currentNow.getMonth() + 1}-${currentNow.getDate()}_${currentTimeStr}`;

			for (const job of this.jobs) {
				if (!this.isJobEnabled(job.name)) continue;
				if (job.daysOfWeek && !job.daysOfWeek.includes(currentDayOfWeek)) continue;
				if (job.scheduledTime !== currentTimeStr) continue;

				const lastRun = this.lastExecutedDateHourMinute.get(job.name);
				if (lastRun === dateKey) continue;

				const lock = await acquireSessionAdvisoryLock(
					job.name,
					this.options.advisoryLockPool,
				);
				if (!lock.acquired) {
					this.log(
						`Job «${job.name}» skipped: advisory lock unavailable or held by another cluster instance.`,
					);
					continue;
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
					await releaseSessionAdvisoryLock(lock.client, job.name);
				}
			}

			if (this.options.enableMdlpOutbox !== false) {
				try {
					await runMdlpOutboxDaemon({
						organizationId: this.options.organizationId || undefined,
					});
				} catch (mdlpErr: unknown) {
					const msg = mdlpErr instanceof Error ? mdlpErr.message : String(mdlpErr);
					this.log(`MDLP Outbox daemon execution failed: ${msg}`);
				}
			}

			return executedJobs;
		} finally {
			this.isChecking = false;
		}
	}

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
		if (options?.lookAheadHours !== undefined) {
			args.lookAheadHours = options.lookAheadHours;
		}
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
		if (options?.maxCandidates !== undefined) {
			args.maxCandidates = options.maxCandidates;
		}
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
		if (options?.lookbackHours !== undefined) {
			args.lookbackHours = options.lookbackHours;
		}
		if (options?.warningWindowDays !== undefined) {
			args.warningWindowDays = options.warningWindowDays;
		}
		return runSanpinAndInventoryAudit(args);
	}

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
			this.triggerSomaticRadarScan(orgId ? { organizationId: orgId, now } : { now }),
			this.triggerZtlScan(orgId ? { organizationId: orgId, now } : { now }),
			this.triggerEmrSaviorScan(
				orgId ? { organizationId: orgId, targetDate: now } : { targetDate: now },
			),
			this.triggerRetentionScan(orgId ? { organizationId: orgId, now } : { now }),
			this.triggerSanpinAndInventoryAudit(orgId ? { organizationId: orgId, now } : { now }),
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

	public async triggerMdlpOutbox(
		options?: MdlpOutboxDaemonOptions,
	): Promise<MdlpOutboxDaemonDigest> {
		const opts: MdlpOutboxDaemonOptions = {};
		const effectiveOrgId =
			options?.organizationId ?? (this.options.organizationId || undefined);
		if (effectiveOrgId !== undefined) opts.organizationId = effectiveOrgId;
		if (options?.batchSize !== undefined) opts.batchSize = options.batchSize;
		if (options?.timeoutMs !== undefined) opts.timeoutMs = options.timeoutMs;
		if (options?.transport !== undefined) opts.transport = options.transport;
		if (options?.workerId !== undefined) opts.workerId = options.workerId;
		return runMdlpOutboxDaemon(opts);
	}
}

/**
 * Singleton instance of DaemonScheduler for API server runtime.
 */
export const defaultDaemonScheduler = new DaemonScheduler();
