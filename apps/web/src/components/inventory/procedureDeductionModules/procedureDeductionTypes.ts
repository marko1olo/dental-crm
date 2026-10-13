/**
 * procedureDeductionTypes.ts — Контракты типов списания расходных материалов процедур,
 * партийного учета FEFO и актирования медицинских отходов Класса Б (СанПиН 2.1.3684-21).
 */

import type {
	DeductionLineItem,
	DeductionSummary,
	SupplierPurchaseOrderView,
	TechMapCategory,
} from "../inventoryMath.js";
import type { InventoryItem } from "../useInventoryLogic.js";

export type {
	DeductionLineItem,
	DeductionSummary,
	SupplierPurchaseOrderView,
	TechMapCategory,
};

/**
 * Входные пропсы модального окна списания расходных материалов
 */
export interface ProcedureMaterialDeductionModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onConfirmDeduction?: (
		lines: DeductionLineItem[],
		summary: DeductionSummary,
		wasteAct?: ClassBWasteActData,
	) => void | Promise<void>;
	readonly initialTechMapCodes?: readonly string[];
	readonly serviceName?: string;
	readonly patientName?: string;
	readonly toothNumber?: number | string;
	readonly warehouseItems?: readonly InventoryItem[];
	readonly isDeducting?: boolean;
}

/**
 * Вариант партии склада по алгоритму FEFO (First Expired, First Out)
 */
export interface FefoBatchOption {
	readonly id: string;
	readonly lotNumber: string;
	readonly expirationDate?: string;
	readonly stockQuantity: number;
	readonly unitCostRub?: string;
	readonly isNearestExpiry?: boolean;
}

/**
 * Норма расхода материала по номенклатуре услуг Минздрава РФ (Приказ 804н)
 */
export interface ProcedureNormItem {
	readonly code804n?: string;
	readonly materialName: string;
	readonly standardQuantity: number;
	readonly unit: string;
	readonly category: TechMapCategory;
	readonly mandatory?: boolean;
}

/**
 * Данные актирования медицинских отходов Класса Б (эпидемиологически опасные)
 * по СанПиН 2.1.3684-21 и СанПиН 3.3686-21 без эмодзи
 */
export interface ClassBWasteActData {
	readonly enabled: boolean;
	readonly wasteWeightGrams: number;
	readonly hazardClass: "B";
	readonly disinfectantUsed: string;
	readonly responsiblePerson: string;
	readonly containerType: "yellow_bag" | "puncture_resistant_container";
	readonly decontaminationMethod: "chemical" | "physical_autoclave";
	readonly notes?: string;
}

export const DEFAULT_CLASS_B_WASTE_ACT: ClassBWasteActData = {
	enabled: false,
	wasteWeightGrams: 150,
	hazardClass: "B",
	disinfectantUsed: "Хлорсодержащий дезинфектант 0.5% (экспозиция 60 мин)",
	responsiblePerson: "Медицинская сестра процедурного кабинета",
	containerType: "yellow_bag",
	decontaminationMethod: "chemical",
};
