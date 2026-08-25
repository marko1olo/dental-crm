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

		return {
			success: true,
			removed,
			stats: calculateQueueStats(filtered),
		};
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

	/**
	 * Clears the queue for an organization.
	 */
	public clearQueue(orgId: string): { success: boolean; clearedCount: number } {
		const queue = this.getOrgQueue(orgId);
		const count = queue.length;
		this.queues.set(orgId, []);
		return { success: true, clearedCount: count };
	}
}

export const mdlpQueueService = new MdlpQueueService();
