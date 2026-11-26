import type { FastifyBaseLogger } from "fastify";
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

export interface AdvisoryLockClient {
	query: (
		sqlText: string,
		values?: string[],
	) => Promise<{ rows: Array<{ acquired?: unknown }> }>;
	release: (destroy?: boolean | Error) => void;
}

export interface AdvisoryLockPool {
	connect: () => Promise<AdvisoryLockClient>;
}

export interface DaemonSchedulerOptions {
	organizationId?: string | undefined;
	pollIntervalMs?: number | undefined;
	enableSomaticRadar?: boolean | undefined;
	enableZtlLookAhead?: boolean | undefined;
	enableEmrSavior?: boolean | undefined;
	enableSanpinAndInventory?: boolean | undefined;
	enableWeeklyRetention?: boolean | undefined;
	enableMdlpOutbox?: boolean | undefined;
	advisoryLockPool?: AdvisoryLockPool | undefined;
	logger?:
		| FastifyBaseLogger
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

export function buildScheduledDaemonJobs(caches: {
	setSomaticAlerts: (alerts: SomaticRadarAlert[]) => void;
	setZtlAlerts: (alerts: ZtlLookAheadAlert[]) => void;
	setEmrAlerts: (alerts: EmrSaviorDraftAlert[]) => void;
	setSanpinDigests: (digests: SanpinAndInventoryAuditDigest[]) => void;
	setRetentionSummaries: (summaries: WeeklyRetentionSummary[]) => void;
}): ScheduledDaemonJob[] {
	return [
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
				if (opts?.organizationId) scanOpts.organizationId = opts.organizationId;
				if (opts?.now) {
					scanOpts.now = opts.now;
					scanOpts.targetDate = opts.now;
				}
				const alerts = await runSomaticRadarScan(scanOpts);
				caches.setSomaticAlerts(alerts);
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
				caches.setZtlAlerts(alerts);
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
				caches.setEmrAlerts(alerts);
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
				caches.setSanpinDigests(digests);
				return digests;
			},
		},
		{
			name: "weekly_retention_sunday",
			description:
				"Weekly Sunday 22:00 PM Retention & Abandoned Treatment Hunter",
			scheduledTime: "22:00",
			daysOfWeek: [0],
			runner: async (opts) => {
				const args: {
					organizationId?: string | undefined;
					now?: Date | undefined;
				} = {};
				if (opts?.organizationId) args.organizationId = opts.organizationId;
				if (opts?.now) args.now = opts.now;
				const summaries = await runWeeklyRetentionScan(args);
				caches.setRetentionSummaries(summaries);
				return summaries;
			},
		},
	];
}
