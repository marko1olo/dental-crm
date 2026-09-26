import { useMemo, useState } from "react";
import {
	parseChestnyZnakDataMatrix,
	type RetailProductItem,
} from "@dental/shared";
import type { TreatmentPlanItem, TreatmentPlanStageKind } from "../../../treatment-plans/types";
import { showToast } from "../../../GlobalToast";
import {
	mapTreatmentItemsToFiscalReceipt,
	TREATMENT_STAGE_LABELS,
} from "../../order804nFiscalEngine";
import {
	distributeLoyaltyDiscountAcrossItems,
	type LoyaltyDiscountPreset,
	type FiscalItemDraft,
} from "../../fiscal/fiscal54fzEngine";
import { formatMoneyRu } from "./fiscalModalRefundLogic";
import type { FlexibleFiscalItem } from "./fiscalModalTypes";

export interface UseFiscalItemsAndDiscountsParams {
	readonly propItems?: readonly (TreatmentPlanItem | FlexibleFiscalItem)[] | undefined;
	readonly fallbackAmount: number;
}

export function useFiscalItemsAndDiscounts({
	propItems,
	fallbackAmount,
}: UseFiscalItemsAndDiscountsParams) {
	const [additionalRetailItems, setAdditionalRetailItems] = useState<TreatmentPlanItem[]>([]);
	const [isRetailModalOpen, setIsRetailModalOpen] = useState<boolean>(false);
	const [selectedStageKind, setSelectedStageKind] = useState<string>("all");
	const [mdlpCodes, setMdlpCodes] = useState<Record<string, string>>({});

	// Doctor Discounts & Round to Hundreds (Mandate 8e: Freedom for doctors)
	const [selectedDiscountPreset, setSelectedDiscountPreset] = useState<LoyaltyDiscountPreset>("none");
	const [customDiscountPercent, setCustomDiscountPercent] = useState<number>(0);
	const [customDiscountRub, setCustomDiscountRub] = useState<number>(0);

	const items: readonly TreatmentPlanItem[] = useMemo(() => {
		const baseItems: TreatmentPlanItem[] = [];
		if (propItems && propItems.length > 0) {
			for (let idx = 0; idx < propItems.length; idx++) {
				const item = propItems[idx];
				const candidate = item as Partial<FiscalItemDraft> & Partial<TreatmentPlanItem>;
				const qty = candidate.quantity ?? 1;
				const price = candidate.priceRub ?? candidate.unitPriceRub ?? 0;
				const unitPrice = candidate.unitPriceRub ?? (qty > 0 ? price / qty : price);
				baseItems.push({
					id: candidate.id || `item-${idx + 1}`,
					name: candidate.name || "Стоматологическая медицинская услуга",
					code804n: candidate.code804n || (candidate.isRetail ? "RETAIL" : "A16.07.002"),
					toothNumber: candidate.toothFdiNumber ?? candidate.toothNumber ?? undefined,
					quantity: qty,
					unitPriceRub: unitPrice,
					priceRub: price,
					discountRub: candidate.discountRub ?? 0,
					category: candidate.taxDeductionCategory === "2" ? "implantology" : (candidate.category || "therapy"),
					phase: typeof candidate.phase === "number" ? candidate.phase : 1,
					stageKind:
						candidate.stageKind && candidate.stageKind !== ("all" as string)
							? (candidate.stageKind as TreatmentPlanStageKind)
							: "stage_1_therapy",
					vatRate: candidate.vatRate,
					paymentSubject: candidate.paymentSubject,
					barcode: candidate.barcode,
					sku: candidate.sku,
					isRetail: candidate.isRetail,
				});
			}
		} else if (fallbackAmount > 0) {
			baseItems.push({
				id: "synthetic-804n-fallback-item",
				code804n: "A16.07.002",
				name: "Стоматологические медицинские услуги (клинический прием)",
				category: "therapy",
				unitPriceRub: fallbackAmount,
				priceRub: fallbackAmount,
				quantity: 1,
				discountRub: 0,
				phase: 1,
				stageKind: "stage_1_therapy",
			});
		}
		return [...baseItems, ...additionalRetailItems];
	}, [propItems, fallbackAmount, additionalRetailItems]);

	const handleAddRetailProduct = (product: RetailProductItem, quantity: number) => {
		const isCert = product.category === "certificates";
		const newItem: TreatmentPlanItem = {
			id: `retail-${product.id}-${Date.now()}`,
			name: product.name,
			code804n: isCert ? "CERTIFICATE" : "RETAIL",
			unitPriceRub: product.priceRub,
			priceRub: product.priceRub * quantity,
			quantity,
			discountRub: 0,
			category: product.category,
			phase: 1,
			stageKind: "stage_1_therapy",
			vatRate: product.vatRate,
			paymentSubject: product.paymentSubject,
			barcode: product.barcode,
			sku: product.sku,
			isRetail: true,
		};
		setAdditionalRetailItems((prev) => [...prev, newItem]);
		showToast(`Добавлено в чек: ${product.name} (${quantity} шт.)`, "success", 2000);
	};

	const handleRemoveRetailItem = (itemId: string) => {
		setAdditionalRetailItems((prev) => prev.filter((it) => it.id !== itemId));
		showToast("Товар витрины удален из чека", "info", 1500);
	};

	const availableStages = useMemo(() => {
		const stages = new Set<string>();
		for (const it of items) {
			if (it.stageKind) stages.add(it.stageKind);
			else if (it.category) stages.add(it.category);
		}
		return Array.from(stages);
	}, [items]);

	const baseActiveItems = useMemo(() => {
		if (selectedStageKind === "all") return items;
		return items.filter((it) => (it.stageKind || it.category) === selectedStageKind);
	}, [items, selectedStageKind]);

	const discountResult = useMemo(() => {
		return distributeLoyaltyDiscountAcrossItems(
			baseActiveItems.map((it, idx) => ({
				id: it.id || `item-${idx + 1}`,
				name: it.name,
				quantity: it.quantity && it.quantity > 0 ? it.quantity : 1,
				priceRub: it.unitPriceRub || it.priceRub || 0,
				discountRub: it.discountRub || 0,
			})),
			{
				preset: selectedDiscountPreset,
				customPercent: customDiscountPercent,
				customRub: customDiscountRub,
			},
		);
	}, [baseActiveItems, selectedDiscountPreset, customDiscountPercent, customDiscountRub]);

	const activeItems = useMemo(() => {
		if (selectedDiscountPreset === "none" && customDiscountPercent === 0 && customDiscountRub === 0) {
			return baseActiveItems;
		}
		return baseActiveItems.map((it, idx) => {
			const discounted = discountResult.items[idx];
			return {
				...it,
				discountRub: discounted?.discountRub ?? 0,
			};
		});
	}, [baseActiveItems, selectedDiscountPreset, customDiscountPercent, customDiscountRub, discountResult]);

	const fiscalData = useMemo(() => {
		return mapTreatmentItemsToFiscalReceipt(activeItems);
	}, [activeItems]);

	const totalSumRub = fiscalData.totalRub;
	const totalKopecks = fiscalData.totalKopecks;

	const handleSelectStage = (
		stage: string,
		onResetTenders: (newTotal: number) => void,
	) => {
		setSelectedStageKind(stage);
		const filtered = stage === "all" ? items : items.filter((it) => (it.stageKind || it.category) === stage);
		const newTotalRub = mapTreatmentItemsToFiscalReceipt(filtered).totalRub;
		onResetTenders(newTotalRub);
		showToast(
			stage === "all"
				? `Выбран полный план: ${formatMoneyRu(newTotalRub)}`
				: `Выбран этап [${TREATMENT_STAGE_LABELS[stage] || stage}]: ${formatMoneyRu(newTotalRub)}`,
			"info",
			2000,
		);
	};

	const handleUpdateMdlpCode = (itemId: string, rawCode: string) => {
		setMdlpCodes((prev) => ({ ...prev, [itemId]: rawCode }));
		if (rawCode.trim()) {
			const parsed = parseChestnyZnakDataMatrix(rawCode);
			if (parsed.isValid) {
				showToast(`DataMatrix Честный ЗНАК валиден: ${parsed.matchedTradeName || "код принят"}`, "success", 2000);
			} else {
				showToast(`Некорректный код маркировки: ${parsed.errorMessage || "ошибка формата"}`, "warning", 3000);
			}
		}
	};

	return {
		items,
		additionalRetailItems,
		isRetailModalOpen,
		setIsRetailModalOpen,
		selectedStageKind,
		setSelectedStageKind,
		mdlpCodes,
		selectedDiscountPreset,
		setSelectedDiscountPreset,
		customDiscountPercent,
		setCustomDiscountPercent,
		customDiscountRub,
		setCustomDiscountRub,
		availableStages,
		baseActiveItems,
		discountResult,
		activeItems,
		fiscalData,
		totalSumRub,
		totalKopecks,
		handleAddRetailProduct,
		handleRemoveRetailItem,
		handleSelectStage,
		handleUpdateMdlpCode,
	};
}
