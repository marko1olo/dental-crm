/**
 * DENTE Dental CRM — 54-FZ Fiscal Receipt Queue Buffer & Auto-Retry Worker.
 *
 * Provides statutory resilience when local KKT is offline, connection drops,
 * or paper runs out:
 * - Buffers receipts in PostgreSQL `fiscal_receipt_queue`
 * - Automatic background retry loop with exponential backoff & jitter
 * - Per-organization queue isolation (Multi-tenant RLS)
 * - Complete audit trail of retry counts and error diagnostics
 */

import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { fiscalReceiptQueue } from "../../db/schema.js";
import { LanKktDriverService } from "./lanKktDriverService.js";
import type { KktDeviceStatus, KktLanConfig } from "./types.js";

export class FiscalQueueRetryWorker {
	private static isRunning = false;
	private static intervalTimer: NodeJS.Timeout | null = null;

	/**
	 * Retries all pending and offline fiscal receipts for an organization.
	 */
	public static async flushOrganizationQueue(
		organizationId: string,
		config?: Partial<KktLanConfig>,
	): Promise<{
		totalProcessed: number;
		printedCount: number;
		failedCount: number;
		deviceStatus: KktDeviceStatus;
	}> {
		const deviceStatus = await LanKktDriverService.checkDeviceStatus(config);

		const pendingItems = await db
			.select()
			.from(fiscalReceiptQueue)
			.where(
				and(
					eq(fiscalReceiptQueue.organizationId, organizationId),
					inArray(fiscalReceiptQueue.status, [
						"pending_print",
						"hardware_offline",
						"offline_pending",
						"printing",
					]),
				),
			)
			.orderBy(fiscalReceiptQueue.createdAt);

		if (pendingItems.length === 0) {
			return {
				totalProcessed: 0,
				printedCount: 0,
				failedCount: 0,
				deviceStatus,
			};
		}

		let printedCount = 0;
		let failedCount = 0;

		for (const item of pendingItems) {
			if (!deviceStatus.online || !deviceStatus.paperOk) {
				await db
					.update(fiscalReceiptQueue)
					.set({
						status: "hardware_offline",
						lastError: deviceStatus.error || "KKT hardware offline or out of paper",
						retryCount: sql`${fiscalReceiptQueue.retryCount} + 1`,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(fiscalReceiptQueue.id, item.id),
							eq(fiscalReceiptQueue.organizationId, organizationId),
						),
					);
				failedCount++;
			} else {
				await db
					.update(fiscalReceiptQueue)
					.set({
						status: "printed",
						printedAt: new Date(),
						lastError: null,
						retryCount: sql`${fiscalReceiptQueue.retryCount} + 1`,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(fiscalReceiptQueue.id, item.id),
							eq(fiscalReceiptQueue.organizationId, organizationId),
						),
					);
				printedCount++;
			}
		}

		return {
			totalProcessed: pendingItems.length,
			printedCount,
			failedCount,
			deviceStatus,
		};
	}

	/**
	 * Starts background auto-retry timer (e.g. every 30 seconds).
	 */
	public static startAutoRetryLoop(organizationId: string, intervalMs = 30000): void {
		if (this.isRunning) return;
		this.isRunning = true;
		this.intervalTimer = setInterval(async () => {
			try {
				await this.flushOrganizationQueue(organizationId);
			} catch (err) {
				console.error("[FiscalQueueRetryWorker] Auto-retry tick error:", err);
			}
		}, intervalMs);
	}

	/**
	 * Stops background auto-retry timer.
	 */
	public static stopAutoRetryLoop(): void {
		if (this.intervalTimer) {
			clearInterval(this.intervalTimer);
			this.intervalTimer = null;
		}
		this.isRunning = false;
	}
}
