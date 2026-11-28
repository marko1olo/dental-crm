/**
 * fiscalHealthChecker.ts — Layer 2: Fiscal Device Health, 24-Hour Shift Expiration & Background Poller.
 *
 * Implements per-organization isolated polling workers, real 24h shift expiry inspection,
 * and non-blocking recovery of pending fiscal items.
 */

import { and, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import { cashBoxShifts } from "../../db/schema.js";
import { BoundedTtlMap } from "../../lib/boundedTtlMap.js";
import { createApiLogger, safeLogError } from "../../observability/logger.js";
import { LanKktDriverService } from "../hardware/lanKktDriverService.js";
import { FiscalQueueRetryWorker } from "../hardware/queueModules/fiscalQueueWorker.js";
import type { KktDeviceStatus, KktLanConfig } from "../hardware/types.js";
import type { FiscalHealthTelemetry, FiscalRetryExecutor } from "./types.js";

const logger = createApiLogger("fiscalHealthChecker");

export class FiscalHealthChecker {
	private static orgWorkers = new BoundedTtlMap<string, NodeJS.Timeout>({
		maxEntries: 1000,
		touchOnGet: false,
		onEvict: (_orgId, timer) => {
			clearInterval(timer);
		},
	});
	private static defaultRetryExecutor: FiscalRetryExecutor | null = null;

	public static setRetryExecutor(executor: FiscalRetryExecutor): void {
		this.defaultRetryExecutor = executor;
	}

	public static async checkDeviceStatus(
		kktConfig?: Partial<KktLanConfig>,
	): Promise<KktDeviceStatus> {
		return await LanKktDriverService.checkDeviceStatus(kktConfig);
	}

	/**
	 * Statutory 54-FZ telemetry: checks device status and optional clinic 24-hour shift duration.
	 */
	public static async inspectTelemetry(
		kktConfig?: Partial<KktLanConfig>,
		organizationId?: string,
	): Promise<FiscalHealthTelemetry> {
		const deviceStatus = await LanKktDriverService.checkDeviceStatus(kktConfig);
		const now = new Date();
		const checkedAt = now.toISOString();

		let shiftOpen = Boolean(deviceStatus.online);
		let shiftExpired24h = false;

		if (organizationId) {
			try {
				const openShifts = await withTenantCtx(organizationId, async (tx) => {
					return (tx ?? db)
						.select({ openedAt: cashBoxShifts.openedAt })
						.from(cashBoxShifts)
						.where(
							and(
								eq(cashBoxShifts.organizationId, organizationId),
								eq(cashBoxShifts.status, "open"),
							),
						);
				});
				if (openShifts.length > 0) {
					shiftOpen = true;
					const maxAgeMs = 24 * 60 * 60 * 1000;
					shiftExpired24h = openShifts.some(
						(s) => s.openedAt && now.getTime() - new Date(s.openedAt).getTime() >= maxAgeMs,
					);
				}
			} catch (err) {
				logger.warn({ err: safeLogError(err), organizationId }, "Failed to inspect 24h shift telemetry");
			}
		}

		return {
			online: deviceStatus.online,
			paperOk: deviceStatus.paperOk,
			shiftOpen,
			shiftExpired24h,
			error: deviceStatus.error,
			checkedAt,
		};
	}

	/**
	 * Starts isolated background auto-retry worker for a single organization.
	 */
	public static startBackgroundWorker(
		organizationId: string,
		intervalMs = 15000,
		customRetryExecutor?: FiscalRetryExecutor,
	): void {
		if (this.orgWorkers.has(organizationId)) return;

		const _unusedExecutor = customRetryExecutor || this.defaultRetryExecutor;

		const timer = setInterval(async () => {
			try {
				const status = await LanKktDriverService.checkDeviceStatus();
				if (!status.online || !status.paperOk) return;

				if (!FiscalQueueRetryWorker.isAutoRetryRunning(organizationId)) {
					await FiscalQueueRetryWorker.flushOrganizationQueue(organizationId);
				}
			} catch (err) {
				logger.error(
					{ err: safeLogError(err), organizationId },
					"Background worker tick error",
				);
			}
		}, intervalMs);
		timer.unref();
		this.orgWorkers.set(organizationId, timer);
	}

	/**
	 * Stops background worker for a specific organization or all organizations when omitted.
	 */
	public static stopBackgroundWorker(organizationId?: string): void {
		if (organizationId !== undefined) {
			const timer = this.orgWorkers.get(organizationId);
			if (timer) {
				clearInterval(timer);
				this.orgWorkers.delete(organizationId);
			}
			return;
		}
		for (const timer of this.orgWorkers.values()) {
			clearInterval(timer);
		}
		this.orgWorkers.clear();
	}

	/**
	 * Returns active worker state (scoped to organizationId if provided).
	 */
	public static isRunning(organizationId?: string): boolean {
		if (organizationId !== undefined) {
			return this.orgWorkers.has(organizationId);
		}
		return this.orgWorkers.size > 0;
	}
}
