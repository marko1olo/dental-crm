import { Decimal } from "decimal.js";

export interface BranchPurchaseRequest {
	branchId: string;
	branchName: string;
	itemId: string;
	itemName: string;
	requestedQuantity: number;
	baseUnitPriceRub: number;
}

export interface VolumeDiscountTier {
	minQuantity: number;
	discountPercent: number;
}

export interface AggregatedProcurementItem {
	itemId: string;
	itemName: string;
	totalQuantity: number;
	baseUnitPriceRub: number;
	applicableDiscountPercent: number;
	discountedUnitPriceRub: number;
	totalBaseCostRub: number;
	totalDiscountedCostRub: number;
	totalSavingsRub: number;
	branchAllocations: {
		branchId: string;
		branchName: string;
		allocatedQuantity: number;
		allocatedCostRub: number;
	}[];
}

export interface ConsolidatedPurchaseOrder {
	orderNumber: string;
	items: AggregatedProcurementItem[];
	totalOrderCostRub: number;
	totalSavingsRub: number;
	participatingBranchesCount: number;
	generatedAt: Date;
}

export class CentralWarehouseProcurementService {
	public static readonly DEFAULT_DISCOUNT_TIERS: VolumeDiscountTier[] = [
		{ minQuantity: 100, discountPercent: 20 },
		{ minQuantity: 50, discountPercent: 10 },
		{ minQuantity: 20, discountPercent: 5 },
		{ minQuantity: 0, discountPercent: 0 },
	];

	/**
	 * Определяет процент скидки за объем партии
	 */
	public static getDiscountPercentForQuantity(
		quantity: number,
		tiers: VolumeDiscountTier[] = this.DEFAULT_DISCOUNT_TIERS,
	): number {
		const sorted = [...tiers].sort((a, b) => b.minQuantity - a.minQuantity);
		for (const tier of sorted) {
			if (quantity >= tier.minQuantity) {
				return tier.discountPercent;
			}
		}
		return 0;
	}

	/**
	 * Консолидирует заявки от филиалов в единый оптовый заказ
	 */
	public static aggregateProcurement(
		requests: readonly BranchPurchaseRequest[],
		discountTiers: VolumeDiscountTier[] = this.DEFAULT_DISCOUNT_TIERS,
		now: Date = new Date(),
	): ConsolidatedPurchaseOrder {
		const branchSet = new Set<string>();
		const itemsMap = new Map<
			string,
			{
				itemName: string;
				baseUnitPrice: Decimal;
				branchRequests: { branchId: string; branchName: string; qty: number }[];
			}
		>();

		for (const req of requests) {
			branchSet.add(req.branchId);
			const entry = itemsMap.get(req.itemId) ?? {
				itemName: req.itemName,
				baseUnitPrice: new Decimal(req.baseUnitPriceRub),
				branchRequests: [],
			};
			entry.branchRequests.push({
				branchId: req.branchId,
				branchName: req.branchName,
				qty: req.requestedQuantity,
			});
			itemsMap.set(req.itemId, entry);
		}

		let totalOrderCostDec = new Decimal(0);
		let totalSavingsDec = new Decimal(0);
		const aggregatedItems: AggregatedProcurementItem[] = [];

		for (const [itemId, data] of itemsMap.entries()) {
			const totalQty = data.branchRequests.reduce((sum, b) => sum + b.qty, 0);
			const discountPct = this.getDiscountPercentForQuantity(totalQty, discountTiers);
			const discountFactor = new Decimal(1).minus(new Decimal(discountPct).div(100));

			const discountedUnitPrice = data.baseUnitPrice.times(discountFactor).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
			const totalBaseCost = data.baseUnitPrice.times(totalQty).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
			const totalDiscountedCost = discountedUnitPrice.times(totalQty).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
			const totalSavings = totalBaseCost.minus(totalDiscountedCost).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

			totalOrderCostDec = totalOrderCostDec.plus(totalDiscountedCost);
			totalSavingsDec = totalSavingsDec.plus(totalSavings);

			const branchAllocations = data.branchRequests.map((b) => ({
				branchId: b.branchId,
				branchName: b.branchName,
				allocatedQuantity: b.qty,
				allocatedCostRub: discountedUnitPrice.times(b.qty).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
			}));

			aggregatedItems.push({
				itemId,
				itemName: data.itemName,
				totalQuantity: totalQty,
				baseUnitPriceRub: data.baseUnitPrice.toNumber(),
				applicableDiscountPercent: discountPct,
				discountedUnitPriceRub: discountedUnitPrice.toNumber(),
				totalBaseCostRub: totalBaseCost.toNumber(),
				totalDiscountedCostRub: totalDiscountedCost.toNumber(),
				totalSavingsRub: totalSavings.toNumber(),
				branchAllocations,
			});
		}

		const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
		const orderNumber = `PO-CENTRAL-${dateStr}-${aggregatedItems.length}`;

		return {
			orderNumber,
			items: aggregatedItems,
			totalOrderCostRub: totalOrderCostDec.toNumber(),
			totalSavingsRub: totalSavingsDec.toNumber(),
			participatingBranchesCount: branchSet.size,
			generatedAt: now,
		};
	}
}
