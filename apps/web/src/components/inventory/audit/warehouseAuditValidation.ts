import { kopecksToRubles } from "@dental/shared";
import type {
	Torg16WriteoffLineItem,
	WarehouseInventoryAuditDocument,
	WarehouseTorg16WriteoffAct,
} from "./warehouseAuditTypes.js";

export function validateInventoryAuditDraft(doc: Partial<WarehouseInventoryAuditDocument>): {
	isValid: boolean;
	errors: string[];
	warnings: string[];
} {
	const errors: string[] = [];
	const warnings: string[] = [];

	if (!doc.documentNumber || doc.documentNumber.trim().length === 0) {
		errors.push("Номер инвентаризационной описи обязателен.");
	}
	if (!doc.orderNumber || doc.orderNumber.trim().length === 0) {
		errors.push("Номер приказа о проведении инвентаризации (ИНВ-22) обязателен.");
	}
	if (!doc.molFullName || doc.molFullName.trim().length === 0) {
		errors.push("ФИО материально ответственного лица (МОЛ) обязательно.");
	}
	if (!doc.commission || doc.commission.length === 0) {
		warnings.push("Опись оформляется ответственным сотрудником (единоличное списание/опись без обязательного требования комиссии из 3 человек).");
	} else if (!doc.commission.some((c) => c.role === "chairman")) {
		warnings.push("В составе инвентаризационной комиссии не указан председатель.");
	}

	if (!doc.items || doc.items.length === 0) {
		errors.push("Инвентаризационная опись должна содержать хотя бы одну позицию ТМЦ.");
	} else {
		for (const it of doc.items) {
			if (it.actualQuantity < 0) {
				errors.push(`Товар «${it.nameRu}» содержит отрицательное фактическое количество.`);
			} else if (it.bookQuantity < 0) {
				warnings.push(`Товар «${it.nameRu}» имеет отрицательный остаток (${it.bookQuantity}) — мягкий овердрафт.`);
			}
			if (!it.batchNumber || it.batchNumber.trim().length === 0) {
				warnings.push(`Товар «${it.nameRu}» не имеет номера серии (LOT).`);
			}
			if (it.fefoStatus === "expired") {
				warnings.push(`Товар «${it.nameRu}» (партия ${it.batchNumber}) просрочен и подлежит списанию по ТОРГ-16.`);
			}
		}
	}

	return { isValid: errors.length === 0, errors, warnings };
}

export function generateTorg16ActFromInventory(
	doc: WarehouseInventoryAuditDocument,
	customReason?: string,
): WarehouseTorg16WriteoffAct {
	const expiredLines = doc.items.filter(
		(it) => it.isWriteoffRequired || it.fefoStatus === "expired" || it.daysUntilExpiration <= 0,
	);

	let totalQuantity = 0;
	let totalCostKopecks = 0;

	const items: Torg16WriteoffLineItem[] = expiredLines.map((it) => {
		const qty = it.actualQuantity > 0 ? it.actualQuantity : it.bookQuantity;
		const lineCost = Math.round(qty * it.unitCostKopecks);
		totalQuantity += qty;
		totalCostKopecks += lineCost;

		return {
			itemId: it.itemId, sku: it.sku, nameRu: it.nameRu, unitRu: it.unitRu,
			okeiCode: it.okeiCode, batchNumber: it.batchNumber, expiryDate: it.expiryDate,
			quantity: qty, unitCostKopecks: it.unitCostKopecks, totalCostKopecks: lineCost,
			totalCostRubles: kopecksToRubles(lineCost),
			defectDescriptionRu: `Истек срок годности (${it.expiryDate}), выбытие по FEFO аудиту`,
		};
	});

	return {
		actNumber: `ТОРГ-16-${doc.documentNumber.replace(/[^0-9a-zA-Zа-яА-Я-]/g, "")}`,
		actDate: doc.auditDate || new Date().toISOString().slice(0, 10),
		inventoryDocNumber: doc.documentNumber, organizationNameRu: doc.organizationNameRu,
		organizationOkpo: doc.organizationOkpo, organizationInn: doc.organizationInn,
		warehouseNameRu: doc.warehouseNameRu, molFullName: doc.molFullName, molPosition: doc.molPosition,
		reasonRu: customReason || "Истечение гарантированного срока годности материалов (FEFO контроль)",
		commission: doc.commission, items, totalQuantity, totalCostKopecks,
		totalCostRubles: kopecksToRubles(totalCostKopecks),
	};
}
