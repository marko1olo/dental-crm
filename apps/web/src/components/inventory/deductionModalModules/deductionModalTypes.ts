import { formatInventoryUnitRu } from "@dental/shared";

export interface ConsumablesDeductionModalItem {
	readonly id: string;
	readonly inventoryItemId: string;
	readonly itemName: string;
	readonly category: string;
	readonly unit: string;
	readonly standardQty: number;
	readonly deductedQty: number;
	readonly currentStock: number;
	readonly unitCostRub: number;
	readonly isOverdraft: boolean;
	readonly isMandatory: boolean;
}

export interface ConsumablesDeductionModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly procedureTitle?: string | undefined;
	readonly serviceCode?: string | undefined;
	readonly service804nCode?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly patientName?: string | undefined;
	readonly toothNumber?: number | undefined | null;
	readonly currentStockMap?: Record<string, number> | undefined;
	readonly warehouseItems?: readonly any[] | undefined;
	readonly onConfirmDeduction?: (items: ConsumablesDeductionModalItem[]) => void | Promise<void>;
}

export interface DeductionTotals {
	readonly totalCostRub: number;
	readonly overdraftCount: number;
	readonly hasOverdraft: boolean;
	readonly overdraftItemsCount: number;
	readonly activeItemsCount: number;
	readonly carpulesCount: number;
	readonly sharpsCount: number;
}

const CATEGORY_RU_MAP: Readonly<Record<string, string>> = {
	composite: "Композит",
	anesthetic: "Анестезия",
	disinfection: "Дезинфекция",
	ppe: "СИЗ",
	other: "Расходный",
	surgery: "Хирургия",
	orthopedics: "Ортопедия",
	therapy: "Терапия",
	endodontics: "Эндодонтия",
};

export const formatCategoryRu = (cat?: string): string =>
	cat ? CATEGORY_RU_MAP[cat.toLowerCase()] || cat : "Расходный";

export const formatUnitRu = (unit?: string): string =>
	unit ? formatInventoryUnitRu(unit) : "шт.";
