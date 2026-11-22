import {
	type MdlpCarpuleBatch,
	type MdlpCarpuleQueueItem,
	type MdlpCarpuleQueueStats,
	calculateQueueStats,
	createCarpuleQueueItem,
	groupQueueByBatch,
	sortQueueByFefo,
	validateQueueForDisposal,
} from "@dental/shared";
import { and, eq, or } from "drizzle-orm";
import { db } from "../../db/client.js";
import { mdlpItems } from "../../db/schema.js";
import { mdlpLogger } from "./logger.js";

export interface AddToQueueInput {
	rawBarcode: string;
	costRub?: number | null | undefined;
	patientId?: string | null | undefined;
	patientName?: string | null | undefined;
	visitId?: string | null | undefined;
	doctorId?: string | null | undefined;
	doctorName?: string | null | undefined;
	cabinetId?: string | null | undefined;
}

export class MdlpQueueService {
	// OrganizationId -> Queue Items
	private readonly queues = new Map<string, MdlpCarpuleQueueItem[]>();

	private getOrgQueue(orgId: string): MdlpCarpuleQueueItem[] {
		let queue = this.queues.get(orgId);
		if (!queue) {
			queue = [];
			this.queues.set(orgId, queue);
		}
		return queue;
	}

	private async persistItemToDb(orgId: string, item: MdlpCarpuleQueueItem): Promise<void> {
		try {
			const [existing] = await db
				.select()
				.from(mdlpItems)
				.where(
					and(
						eq(mdlpItems.organizationId, orgId),
						eq(mdlpItems.sgtin, item.sgtin),
					),
				)
				.limit(1);

			if (existing) {
				await db
					.update(mdlpItems)
					.set({
						status: "queued",
						rawBarcode: item.rawBarcode,
						patientId: item.patientId ?? existing.patientId,
						visitId: item.visitId ?? existing.visitId,
						doctorId: item.doctorId ?? existing.doctorId,
						costRub: item.costRub != null ? String(item.costRub) : existing.costRub,
						updatedAt: new Date(),
					})
					.where(eq(mdlpItems.id, existing.id));
			} else {
				await db.insert(mdlpItems).values({
					organizationId: orgId,
					sgtin: item.sgtin,
					gtin: item.gtin,
					serialNumber: item.serialNumber,
					rawBarcode: item.rawBarcode,
					tradeName: item.drugInfo?.tradeName ?? "Медицинский препарат (МДЛП)",
					inn: item.drugInfo?.inn ?? null,
					series: item.series ?? null,
					expirationDate: item.expirationDate,
					status: "queued",
					costRub: item.costRub != null ? String(item.costRub) : null,
					patientId: item.patientId ?? null,
					visitId: item.visitId ?? null,
					doctorId: item.doctorId ?? null,
				});
			}
		} catch (err) {
			mdlpLogger.warn(err, `[MdlpQueueService] DB persistence failed for SGTIN ${item.sgtin}`);
		}
	}

	private async removeQueuedItemFromDb(orgId: string, itemIdOrSgtin: string): Promise<void> {
		try {
			const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(itemIdOrSgtin);
			const identifierCondition = isUuid
				? or(eq(mdlpItems.id, itemIdOrSgtin), eq(mdlpItems.sgtin, itemIdOrSgtin))
				: eq(mdlpItems.sgtin, itemIdOrSgtin);

			await db
				.update(mdlpItems)
				.set({
					status: "in_stock",
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(mdlpItems.organizationId, orgId),
						eq(mdlpItems.status, "queued"),
						identifierCondition,
					),
				);
		} catch (err) {
			mdlpLogger.warn(err, `[MdlpQueueService] DB remove failed for ${itemIdOrSgtin}`);
		}
	}

	private async clearQueuedItemsInDb(orgId: string): Promise<void> {
		try {
			await db
				.update(mdlpItems)
				.set({
					status: "in_stock",
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(mdlpItems.organizationId, orgId),
						eq(mdlpItems.status, "queued"),
					),
				);
		} catch (err) {
			mdlpLogger.warn(err, `[MdlpQueueService] DB clear failed for org ${orgId}`);
		}
	}

	public async hydrateFromDb(orgId: string): Promise<MdlpCarpuleQueueItem[]> {
		try {
			const rows = await db
				.select()
				.from(mdlpItems)
				.where(
					and(
						eq(mdlpItems.organizationId, orgId),
						eq(mdlpItems.status, "queued"),
					),
				);

			if (rows.length > 0) {
				const queue = this.getOrgQueue(orgId);
				for (const row of rows) {
					const exists = queue.some((q) => q.sgtin === row.sgtin);
					if (!exists) {
						const item = createCarpuleQueueItem(row.rawBarcode || row.sgtin, {
							costRub: row.costRub ? Number(row.costRub) : null,
							patientId: row.patientId ?? undefined,
							visitId: row.visitId ?? undefined,
							doctorId: row.doctorId ?? undefined,
						});
						queue.push(item);
					}
				}
				const sorted = sortQueueByFefo(queue);
				this.queues.set(orgId, sorted);
				return sorted;
			}
		} catch (err) {
			mdlpLogger.warn(err, `[MdlpQueueService] DB hydration failed for org ${orgId}`);
		}
		return this.getOrgQueue(orgId);
	}

	/**
	 * Adds a scanned DataMatrix barcode to the organization's carpule queue.
	 */
	public addToQueue(orgId: string, input: AddToQueueInput): {
		success: boolean;
		item: MdlpCarpuleQueueItem;
		stats: MdlpCarpuleQueueStats;
		warnings: string[];
	} {
		const warnings: string[] = [];
		const queue = this.getOrgQueue(orgId);

		const item = createCarpuleQueueItem(input.rawBarcode, {
			costRub: input.costRub,
			patientId: input.patientId,
			patientName: input.patientName,
			visitId: input.visitId,
			doctorId: input.doctorId,
			doctorName: input.doctorName,
			cabinetId: input.cabinetId,
		});

		// Check for duplicate SGTIN
		const existingIndex = queue.findIndex(
			(q) => q.sgtin && item.sgtin && q.sgtin === item.sgtin,
		);
		if (existingIndex !== -1) {
			warnings.push(`Препарат с SGTIN ${item.sgtin} уже присутствует в очереди.`);
		} else {
			queue.push(item);
			// Async persist in background
			this.persistItemToDb(orgId, item).catch(() => {});
		}

		if (item.isExpired) {
			warnings.push(
				`Внимание! Срок годности препарата "${item.drugInfo?.tradeName ?? item.gtin}" истек (${item.expirationDate}).`,
			);
		} else if (item.isExpiringSoon) {
			warnings.push(
				`Предупреждение: Препарат "${item.drugInfo?.tradeName ?? item.gtin}" истекает в течение 90 дней (${item.expirationDate}).`,
			);
		}

		// Sort queue by FEFO
		const sorted = sortQueueByFefo(queue);
		this.queues.set(orgId, sorted);

		return {
			success: true,
			item,
			stats: calculateQueueStats(sorted),
			warnings,
		};
	}

	public async addToQueueAsync(orgId: string, input: AddToQueueInput): Promise<{
		success: boolean;
		item: MdlpCarpuleQueueItem;
		stats: MdlpCarpuleQueueStats;
		warnings: string[];
	}> {
		const res = this.addToQueue(orgId, input);
		await this.persistItemToDb(orgId, res.item);
		return res;
	}

	/**
	 * Removes a specific item from the queue by ID or SGTIN.
	 */
	public removeFromQueue(
		orgId: string,
		itemIdOrSgtin: string,
	): { success: boolean; removed: boolean; stats: MdlpCarpuleQueueStats } {
		const queue = this.getOrgQueue(orgId);
		const initialLen = queue.length;
		const filtered = queue.filter(
			(it) => it.id !== itemIdOrSgtin && it.sgtin !== itemIdOrSgtin,
		);

		this.queues.set(orgId, filtered);
		const removed = filtered.length < initialLen;
		if (removed) {
			this.removeQueuedItemFromDb(orgId, itemIdOrSgtin).catch(() => {});
		}

		return {
			success: true,
			removed,
			stats: calculateQueueStats(filtered),
		};
	}

	public async removeFromQueueAsync(
		orgId: string,
		itemIdOrSgtin: string,
	): Promise<{ success: boolean; removed: boolean; stats: MdlpCarpuleQueueStats }> {
		const res = this.removeFromQueue(orgId, itemIdOrSgtin);
		await this.removeQueuedItemFromDb(orgId, itemIdOrSgtin);
		return res;
	}

	/**
	 * Returns current queue items and statistics for an organization.
	 */
	public getQueue(
		orgId: string,
		options: { sortByFefo?: boolean; cabinetId?: string | null } = {},
	): {
		items: MdlpCarpuleQueueItem[];
		batches: readonly MdlpCarpuleBatch[];
		stats: MdlpCarpuleQueueStats;
		validation: { isValid: boolean; errors: string[]; warnings: string[] };
	} {
		let queue = this.getOrgQueue(orgId);

		if (options.cabinetId) {
			queue = queue.filter((it) => it.cabinetId === options.cabinetId);
		}

		if (options.sortByFefo !== false) {
			queue = sortQueueByFefo(queue);
		}

		const stats = calculateQueueStats(queue);
		const batches = groupQueueByBatch(queue);
		const validation = validateQueueForDisposal(queue);

		return {
			items: queue,
			batches,
			stats,
			validation,
		};
	}

	public async getQueueAsync(
		orgId: string,
		options: { sortByFefo?: boolean; cabinetId?: string | null } = {},
	): Promise<{
		items: MdlpCarpuleQueueItem[];
		batches: readonly MdlpCarpuleBatch[];
		stats: MdlpCarpuleQueueStats;
		validation: { isValid: boolean; errors: string[]; warnings: string[] };
	}> {
		await this.hydrateFromDb(orgId);
		return this.getQueue(orgId, options);
	}

	/**
	 * Clears the queue for an organization.
	 */
	public clearQueue(orgId: string): { success: boolean; clearedCount: number } {
		const queue = this.getOrgQueue(orgId);
		const count = queue.length;
		this.queues.set(orgId, []);
		this.clearQueuedItemsInDb(orgId).catch(() => {});
		return { success: true, clearedCount: count };
	}

	public async clearQueueAsync(orgId: string): Promise<{ success: boolean; clearedCount: number }> {
		const res = this.clearQueue(orgId);
		await this.clearQueuedItemsInDb(orgId);
		return res;
	}
}

export const mdlpQueueService = new MdlpQueueService();
