import { useMemo, useState, useEffect } from "react";
import { useInventoryStore } from "../../../store/inventoryStore.js";
import {
	DEFAULT_804N_CONSUMABLE_LINKS,
	getDefaultBomLinksForService804n,
	type ConsumableItemLink,
} from "@dental/shared";
import type {
	ConsumablesDeductionModalItem,
	ConsumablesDeductionModalProps,
	DeductionTotals,
} from "./deductionModalTypes.js";
import {
	computeDeductionTotals,
	resolveStockForMaterial,
} from "./deductionCalculationUtils.js";

const EMPTY_STOCK_MAP: Readonly<Record<string, number>> = Object.freeze({});

export const STANDARD_THERAPIST_KIT_ITEMS: readonly Omit<ConsumablesDeductionModalItem, "currentStock" | "isOverdraft">[] = [
	{
		id: "std-kit-gloves",
		inventoryItemId: "inv-std-gloves",
		itemName: "Перчатки нитриловые неопудренные (пара)",
		category: "ppe",
		unit: "пары",
		standardQty: 2,
		deductedQty: 2,
		unitCostRub: 35,
		isMandatory: true,
	},
	{
		id: "std-kit-mask",
		inventoryItemId: "inv-std-mask",
		itemName: "Маска медицинская защитная трехслойная",
		category: "ppe",
		unit: "шт.",
		standardQty: 2,
		deductedQty: 2,
		unitCostRub: 15,
		isMandatory: true,
	},
	{
		id: "std-kit-saliva",
		inventoryItemId: "inv-std-saliva",
		itemName: "Слюноотсос одноразовый с гибким наконечником",
		category: "ppe",
		unit: "шт.",
		standardQty: 1,
		deductedQty: 1,
		unitCostRub: 12,
		isMandatory: true,
	},
	{
		id: "std-kit-bib",
		inventoryItemId: "inv-std-bib",
		itemName: "Салфетка-нагрудник стоматологическая",
		category: "ppe",
		unit: "шт.",
		standardQty: 1,
		deductedQty: 1,
		unitCostRub: 8,
		isMandatory: true,
	},
	{
		id: "std-kit-cotton-rolls",
		inventoryItemId: "inv-std-cotton-rolls",
		itemName: "Валики ватные стоматологические",
		category: "ppe",
		unit: "шт.",
		standardQty: 6,
		deductedQty: 6,
		unitCostRub: 3,
		isMandatory: true,
	},
];

export function useConsumablesDeductionLogic(props: ConsumablesDeductionModalProps) {
	const {
		serviceCode,
		service804nCode = "A16.07.002.011",
		procedureTitle = "Препарирование и пломба светового отверждения (Filtek / Estelite)",
		currentStockMap = EMPTY_STOCK_MAP,
		onConfirmDeduction,
		onClose,
	} = props;

	const effectiveServiceCode = serviceCode || service804nCode;

	const defaultLinks: readonly ConsumableItemLink[] = useMemo(() => {
		const matched = getDefaultBomLinksForService804n(effectiveServiceCode);
		if (matched.length > 0) return matched;
		return DEFAULT_804N_CONSUMABLE_LINKS.filter(
			(l) => l.service804nCode === "A16.07.002.011" || l.service804nCode === "A11.07.012",
		);
	}, [effectiveServiceCode]);

	const [deductionItems, setDeductionItems] = useState<ConsumablesDeductionModalItem[]>(() =>
		defaultLinks.map((link) => {
			const currentStock = resolveStockForMaterial(link.inventoryItemId, currentStockMap);
			const deductedQty = link.quantityPerService;
			return {
				id: link.id,
				inventoryItemId: link.inventoryItemId,
				itemName: link.itemName,
				category: link.category ?? "Расходные",
				unit: link.unit,
				standardQty: deductedQty,
				deductedQty,
				currentStock,
				unitCostRub: link.costPriceKopecks / 100,
				isOverdraft: currentStock - deductedQty < 0,
				isMandatory: link.isMandatory ?? true,
			};
		}),
	);

	useEffect(() => {
		if (!currentStockMap || Object.keys(currentStockMap).length === 0) return;
		setDeductionItems((prev) =>
			prev.map((it) => {
				const stock = resolveStockForMaterial(it.inventoryItemId, currentStockMap);
				return { ...it, currentStock: stock, isOverdraft: stock - it.deductedQty < 0 };
			}),
		);
	}, [currentStockMap]);

	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleApplyStandardTherapistKit = () => {
		const newItems: ConsumablesDeductionModalItem[] = STANDARD_THERAPIST_KIT_ITEMS.map((link) => {
			const currentStock = resolveStockForMaterial(link.inventoryItemId, currentStockMap);
			return {
				...link,
				currentStock,
				isOverdraft: currentStock - link.deductedQty < 0,
			};
		});
		setDeductionItems(newItems);
	};

	const handleUpdateQty = (itemId: string, delta: number) => {
		setDeductionItems((prev) =>
			prev.map((it) => {
				if (it.id !== itemId) return it;
				// Клинический закон: исключаем микро-валидацию (шаг 0.5 для жидкостей/паст, 1 для штук)
				const step = it.unit === "шприц_гр" || it.unit === "ml" || it.unit === "г" ? 0.5 : 1;
				const newQty = Math.max(0, Math.round((it.deductedQty + delta * step) * 10) / 10);
				return { ...it, deductedQty: newQty, isOverdraft: it.currentStock - newQty < 0 };
			}),
		);
	};

	const totals = useMemo<DeductionTotals>(
		() => computeDeductionTotals(deductionItems),
		[deductionItems],
	);

	const handleConfirm = async () => {
		setIsSubmitting(true);
		try {
			if (onConfirmDeduction) await onConfirmDeduction(deductionItems);
			try {
				useInventoryStore.getState().deductStock(
					"org-default",
					deductionItems.map((d) => ({
						inventoryItemId: d.inventoryItemId,
						itemName: d.itemName,
						quantity: d.deductedQty,
						reason: `Списание по протоколу: ${procedureTitle}`,
						unitCostRub: d.unitCostRub,
					})),
					{ allowOverdraft: true, reason: `Списание по протоколу: ${procedureTitle}` },
				).catch(() => {});
				if (typeof window !== "undefined") {
					window.dispatchEvent(
						new CustomEvent("dente-inventory-reload", {
							detail: { procedureTitle, service804nCode },
						}),
					);
				}
			} catch {
				// Ошибки не блокируют приём врача
			}
			onClose();
		} catch {
			// Ошибки логируются, врач не блокируется
		} finally {
			setIsSubmitting(false);
		}
	};

	return {
		deductionItems,
		totals,
		isSubmitting,
		handleUpdateQty,
		handleConfirm,
		handleApplyStandardTherapistKit,
	};
}
