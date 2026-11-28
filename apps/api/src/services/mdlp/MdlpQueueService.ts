import {
	type MdlpCarpuleBatch,
	type MdlpCarpuleQueueItem,
	type MdlpCarpuleQueueStats,
	calculateQueueStats,
	createCarpuleQueueItem,
	generateUuidV7,
	groupQueueByBatch,
	kopecksToRubles,
	rublesToKopecks,
	sortQueueByFefo,
	validateQueueForDisposal,
} from "@dental/shared";
import { and, eq, or } from "drizzle-orm";
import { db } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import { mdlpItems } from "../../db/schema.js";
import { BoundedStringSet, BoundedTtlMap } from "../../lib/boundedTtlMap.js";
import { mdlpLogger } from "./logger.js";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface AddToQueueInput {
	rawBarcode: string;
	costRub?: number | null | undefined;
	costKopecks?: number | null | undefined;
	patientId?: string | null | undefined;
	patientName?: string | null | undefined;
	visitId?: string | null | undefined;
	doctorId?: string | null | undefined;
	doctorName?: string | null | undefined;
	cabinetId?: string | null | undefined;
}

export interface AddToQueueResult {
	success: boolean;
	item: MdlpCarpuleQueueItem;
	stats: MdlpCarpuleQueueStats;
	warnings: string[];
}

export interface MdlpQueueServiceOptions {
	/**
	 * Explicit DI switch allowing in-memory fallback when PostgreSQL is unavailable in isolated unit tests.
	 * Production runtime must keep this `false` so database failures propagate loudly.
	 */
	readonly allowInMemoryFallback?: boolean | undefined;
}

/**
 * MdlpQueueService — Сервис очереди списания медикаментов МДЛП «Честный Знак».
 * Состояние персистентно хранится в таблице PostgreSQL mdlp_items (статус 'queued')
 * со строгой изоляцией по organizationId.
 */
export class MdlpQueueService {
	// Ограниченный LRU+TTL кэш для синхронных вызовов без утечки памяти
	private readonly cacheByOrg = new BoundedTtlMap<string, MdlpCarpuleQueueItem[]>({
		maxEntries: 512,
		ttlMs: 30 * 60_000,
	});
	// Организации (при явном DI fallback в тестах), для которых запись в БД не удалась и очередь держится только в кэше
	private readonly unpersistedOrgs = new BoundedStringSet(512, 30 * 60_000);
	private allowInMemoryFallback: boolean;

	constructor(options: MdlpQueueServiceOptions = {}) {
		this.allowInMemoryFallback = options.allowInMemoryFallback ?? false;
	}

	public setAllowInMemoryFallback(allowed: boolean): void {
		this.allowInMemoryFallback = allowed;
	}

	public isInMemoryFallbackAllowed(): boolean {
		return this.allowInMemoryFallback;
	}

	private getCachedOrgQueue(orgId: string): MdlpCarpuleQueueItem[] {
		let queue = this.cacheByOrg.get(orgId);
		if (!queue) {
			queue = [];
			this.cacheByOrg.set(orgId, queue);
		}
		return queue;
	}

	/**
	 * Получение персистентной очереди из PostgreSQL с валидацией и группировкой FEFO.
	 */
	public async getQueueAsync(
		orgId: string,
		options: { sortByFefo?: boolean | undefined; cabinetId?: string | null | undefined } = {},
	): Promise<{
		items: MdlpCarpuleQueueItem[];
		batches: readonly MdlpCarpuleBatch[];
		stats: MdlpCarpuleQueueStats;
		validation: { isValid: boolean; errors: string[]; warnings: string[] };
	}> {
		try {
			const rows = await withTenantCtx(orgId, async (tx) =>
				tx
					.select()
					.from(mdlpItems)
					.where(
						and(
							eq(mdlpItems.organizationId, orgId),
							eq(mdlpItems.status, "queued"),
						),
					),
			);

			const items: MdlpCarpuleQueueItem[] = rows.map((row) =>
				createCarpuleQueueItem(row.rawBarcode || row.sgtin, {
					id: row.id,
					costRub:
						row.costKopecks != null
							? kopecksToRubles(row.costKopecks)
							: row.costRub != null
								? Number(row.costRub)
								: null,
					patientId: row.patientId ?? undefined,
					visitId: row.visitId ?? undefined,
					doctorId: row.doctorId ?? undefined,
				}),
			);

			let resultItems = items;
			if (options.cabinetId) {
				resultItems = resultItems.filter((it) => it.cabinetId === options.cabinetId);
			}
			if (options.sortByFefo !== false) {
				resultItems = sortQueueByFefo(resultItems);
			}

			if (rows.length === 0 && this.unpersistedOrgs.has(orgId) && this.getCachedOrgQueue(orgId).length > 0) {
				return this.getQueue(orgId, options);
			}

			// Обновляем кэш
			this.cacheByOrg.set(orgId, resultItems);

			return {
				items: resultItems,
				batches: groupQueueByBatch(resultItems),
				stats: calculateQueueStats(resultItems),
				validation: validateQueueForDisposal(resultItems),
			};
		} catch (err) {
			mdlpLogger.warn(err, `[MdlpQueueService] DB query failed for org ${orgId}`);
			if (!this.allowInMemoryFallback) throw err;
			return this.getQueue(orgId, options);
		}
	}

	/**
	 * Синхронный интерфейс получения очереди (использует кэш текущей сессии).
	 */
	public getQueue(
		orgId: string,
		options: { sortByFefo?: boolean | undefined; cabinetId?: string | null | undefined } = {},
	): {
		items: MdlpCarpuleQueueItem[];
		batches: readonly MdlpCarpuleBatch[];
		stats: MdlpCarpuleQueueStats;
		validation: { isValid: boolean; errors: string[]; warnings: string[] };
	} {
		let queue = this.getCachedOrgQueue(orgId);

		if (options.cabinetId) {
			queue = queue.filter((it) => it.cabinetId === options.cabinetId);
		}
		if (options.sortByFefo !== false) {
			queue = sortQueueByFefo(queue);
		}

		return {
			items: queue,
			batches: groupQueueByBatch(queue),
			stats: calculateQueueStats(queue),
			validation: validateQueueForDisposal(queue),
		};
	}

	/**
	 * Асинхронное добавление карпулы/препарата в очередь с записью в PostgreSQL.
	 */
	public async addToQueueAsync(orgId: string, input: AddToQueueInput): Promise<AddToQueueResult> {
		const warnings: string[] = [];
		const resolvedCostKopecks =
			input.costKopecks != null
				? Math.round(input.costKopecks)
				: input.costRub != null
					? rublesToKopecks(input.costRub)
					: null;
		const item = createCarpuleQueueItem(input.rawBarcode, {
			id: generateUuidV7(),
			costRub: resolvedCostKopecks != null ? kopecksToRubles(resolvedCostKopecks) : input.costRub,
			patientId: input.patientId,
			patientName: input.patientName,
			visitId: input.visitId,
			doctorId: input.doctorId,
			doctorName: input.doctorName,
			cabinetId: input.cabinetId,
		});

		try {
			await withTenantCtx(orgId, async (tx) => {
				const [existing] = await tx
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
					if (existing.status === "queued") {
						warnings.push(`Препарат с SGTIN ${item.sgtin} уже присутствует в очереди.`);
					} else {
						await tx
							.update(mdlpItems)
							.set({
								status: "queued",
								rawBarcode: item.rawBarcode,
								patientId: item.patientId ?? existing.patientId,
								visitId: item.visitId ?? existing.visitId,
								doctorId: item.doctorId ?? existing.doctorId,
								costRub:
									resolvedCostKopecks != null
										? String(kopecksToRubles(resolvedCostKopecks))
										: existing.costRub,
								costKopecks:
									resolvedCostKopecks != null
										? BigInt(resolvedCostKopecks)
										: existing.costKopecks,
								updatedAt: new Date(),
							})
							.where(and(eq(mdlpItems.organizationId, orgId), eq(mdlpItems.id, existing.id)));
					}
				} else {
					await tx.insert(mdlpItems).values({
						id: UUID_REGEX.test(item.id) ? item.id : undefined,
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
						costRub:
							resolvedCostKopecks != null
								? String(kopecksToRubles(resolvedCostKopecks))
								: null,
						costKopecks:
							resolvedCostKopecks != null ? BigInt(resolvedCostKopecks) : null,
						patientId: item.patientId ?? null,
						visitId: item.visitId ?? null,
						doctorId: item.doctorId ?? null,
					});
				}
			});
			this.unpersistedOrgs.delete(orgId);
		} catch (err) {
			mdlpLogger.warn(err, `[MdlpQueueService] DB persistence failed for SGTIN ${item.sgtin}`);
			if (!this.allowInMemoryFallback) throw err;
			this.unpersistedOrgs.add(orgId);
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

		// Обновляем локальный кэш
		const queue = this.getCachedOrgQueue(orgId);
		const existingIdx = queue.findIndex((q) => q.sgtin === item.sgtin);
		if (existingIdx === -1) {
			queue.push(item);
		}
		const sorted = sortQueueByFefo(queue);
		this.cacheByOrg.set(orgId, sorted);

		return {
			success: true,
			item,
			stats: calculateQueueStats(sorted),
			warnings,
		};
	}

	/**
	 * Синхронный фасад добавления в очередь (с асинхронным сохранением в PostgreSQL).
	 */
	public addToQueue(orgId: string, input: AddToQueueInput): AddToQueueResult {
		const warnings: string[] = [];
		const queue = this.getCachedOrgQueue(orgId);

		const item = createCarpuleQueueItem(input.rawBarcode, {
			id: generateUuidV7(),
			costRub: input.costRub,
			patientId: input.patientId,
			patientName: input.patientName,
			visitId: input.visitId,
			doctorId: input.doctorId,
			doctorName: input.doctorName,
			cabinetId: input.cabinetId,
		});

		const existingItem = queue.find((q) => Boolean(q.sgtin && item.sgtin && q.sgtin === item.sgtin));
		if (existingItem) {
			warnings.push(`Препарат с SGTIN ${item.sgtin} уже присутствует в очереди.`);
		} else {
			queue.push(item);
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

		const sorted = sortQueueByFefo(queue);
		this.cacheByOrg.set(orgId, sorted);

		// Асинхронно персистим в PostgreSQL
		void this.addToQueueAsync(orgId, input).catch((err) => {
			mdlpLogger.warn(err, `[MdlpQueueService] Async DB save failed for ${item.sgtin}`);
		});

		return {
			success: true,
			item,
			stats: calculateQueueStats(sorted),
			warnings,
		};
	}

	/**
	 * Удаление конкретной позиции из очереди по ID или SGTIN.
	 */
	public async removeFromQueueAsync(
		orgId: string,
		itemIdOrSgtin: string,
	): Promise<{ success: boolean; removed: boolean; stats: MdlpCarpuleQueueStats }> {
		try {
			const isUuid = UUID_REGEX.test(itemIdOrSgtin);
			const condition = isUuid
				? or(eq(mdlpItems.id, itemIdOrSgtin), eq(mdlpItems.sgtin, itemIdOrSgtin))
				: eq(mdlpItems.sgtin, itemIdOrSgtin);

			await withTenantCtx(orgId, async (tx) => {
				await tx
					.update(mdlpItems)
					.set({ status: "in_stock", updatedAt: new Date() })
					.where(and(eq(mdlpItems.organizationId, orgId), eq(mdlpItems.status, "queued"), condition));
			});
		} catch (err) {
			mdlpLogger.warn(err, `[MdlpQueueService] DB remove failed for ${itemIdOrSgtin}`);
			if (!this.allowInMemoryFallback) throw err;
		}

		const queue = this.getCachedOrgQueue(orgId);
		const filtered = queue.filter((it) => it.id !== itemIdOrSgtin && it.sgtin !== itemIdOrSgtin);
		this.cacheByOrg.set(orgId, filtered);

		return {
			success: true,
			removed: filtered.length < queue.length,
			stats: calculateQueueStats(filtered),
		};
	}

	public removeFromQueue(
		orgId: string,
		itemIdOrSgtin: string,
	): { success: boolean; removed: boolean; stats: MdlpCarpuleQueueStats } {
		const queue = this.getCachedOrgQueue(orgId);
		const filtered = queue.filter((it) => it.id !== itemIdOrSgtin && it.sgtin !== itemIdOrSgtin);
		this.cacheByOrg.set(orgId, filtered);

		void this.removeFromQueueAsync(orgId, itemIdOrSgtin).catch((err) => {
			mdlpLogger.warn(err, `[MdlpQueueService] Async DB remove failed for ${itemIdOrSgtin}`);
		});

		return {
			success: true,
			removed: filtered.length < queue.length,
			stats: calculateQueueStats(filtered),
		};
	}

	/**
	 * Очистка очереди организации с возвратом позиций в статус 'in_stock'.
	 */
	public async clearQueueAsync(orgId: string): Promise<{ success: boolean; clearedCount: number }> {
		let count = 0;
		try {
			const updated = await withTenantCtx(orgId, async (tx) => {
				return tx
					.update(mdlpItems)
					.set({ status: "in_stock", updatedAt: new Date() })
					.where(and(eq(mdlpItems.organizationId, orgId), eq(mdlpItems.status, "queued")))
					.returning({ id: mdlpItems.id });
			});
			count = updated.length;
		} catch (err) {
			mdlpLogger.warn(err, `[MdlpQueueService] DB clear failed for org ${orgId}`);
			if (!this.allowInMemoryFallback) throw err;
		}

		const queue = this.getCachedOrgQueue(orgId);
		const clearedCount = Math.max(count, queue.length);
		this.cacheByOrg.set(orgId, []);
		this.unpersistedOrgs.delete(orgId);

		return { success: true, clearedCount };
	}

	public evictDisposedFromCache(orgId: string, sgtins: readonly string[]): void {
		if (sgtins.length === 0) return;
		const disposedSet = new Set(sgtins);
		const queue = this.getCachedOrgQueue(orgId);
		const remaining = queue.filter((it) => !disposedSet.has(it.sgtin));
		this.cacheByOrg.set(orgId, remaining);
		if (remaining.length === 0) {
			this.unpersistedOrgs.delete(orgId);
		}
	}

	public clearQueue(orgId: string): { success: boolean; clearedCount: number } {
		const queue = this.getCachedOrgQueue(orgId);
		const count = queue.length;
		this.cacheByOrg.set(orgId, []);

		void this.clearQueueAsync(orgId).catch((err) => {
			mdlpLogger.warn(err, `[MdlpQueueService] Async DB clear failed for org ${orgId}`);
		});

		return { success: true, clearedCount: count };
	}
}

export const mdlpQueueService = new MdlpQueueService();
