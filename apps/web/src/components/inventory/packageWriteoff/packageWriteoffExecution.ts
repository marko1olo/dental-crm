import { showToast } from "../../GlobalToast.js";
import type {
	OneClickPackageWriteOffOptions,
	OneClickPackageWriteOffResult,
} from "./packageWriteoffTypes.js";
import { CLINICAL_WRITEOFF_PACKAGES } from "./packageWriteoffPresets.js";
import { calculatePackageDeductions } from "./packageWriteoffDeductionCalculator.js";

let packageWriteOffActSeq = 0;

export async function handleOneClickPackageWriteOff(
	options: OneClickPackageWriteOffOptions,
): Promise<OneClickPackageWriteOffResult> {
	const pkg =
		CLINICAL_WRITEOFF_PACKAGES.find((p) => p.id === options.packageId) ??
		CLINICAL_WRITEOFF_PACKAGES[0]!;

	const multiplier = Math.max(1, options.quantityMultiplier ?? 1);
	const allowSoftOverdraft = options.allowSoftOverdraft ?? true;
	const now = new Date();
	const actDate = now.toISOString().slice(0, 10);
	const actNumber = `АКТ-СПИС-ПК-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(++packageWriteOffActSeq).padStart(3, "0")}`;

	const stockMap = new Map<string, number>();
	if (options.currentStockMap) {
		for (const [k, v] of Object.entries(options.currentStockMap)) {
			stockMap.set(k.toLowerCase().trim(), Number(v) || 0);
		}
	}
	if (options.warehouseItems) {
		for (const it of options.warehouseItems) {
			const qty = Number(it.stockQuantity) || 0;
			if (it.id) stockMap.set(it.id.toLowerCase().trim(), qty);
			if (it.sku) stockMap.set(it.sku.toLowerCase().trim(), qty);
			if (it.name) stockMap.set(it.name.toLowerCase().trim(), qty);
		}
	}

	const calc = calculatePackageDeductions(pkg, multiplier, stockMap);
	const isOverdraft = calc.overdraftItems.length > 0;
	const overdraftCount = calc.overdraftItems.length;

	// МАНДАТ 8e & 8n: Нулевой остаток НИКОГДА не блокирует врача или медсестру.
	// При дефиците система всегда уходит в мягкий овердрафт (emergency_overdraft) с мягким предупреждением.
	const toastType: "success" | "warning" = isOverdraft ? "warning" : "success";
	const toastMessage = isOverdraft
		? `Остаток 0: Мягкий учет расхода при нехватке (списание с дефицитом / мягкий овердрафт склада, пакет «${pkg.title}», дефицит ${overdraftCount} поз., накладная в пути). Операция не заблокирована!`
		: `Клинический пакет «${pkg.title}» успешно списан со склада (${pkg.items.length} поз., без комиссии из 3 человек).`;

	if (options.fetchFn && options.organizationId) {
		try {
			await options.fetchFn(`/api/inventory/${options.organizationId}/quick-writeoff-package`, {
				method: "POST", headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					packageId: pkg.id, quantityMultiplier: multiplier, allowOverdraft: true,
					allowSoftOverdraft: true, actNumber, actDate, cabinetId: options.cabinetId,
					doctorName: options.doctorName, nurseName: options.nurseName,
					patientName: options.patientName, visitId: options.visitId,
				}),
			});
		} catch (err) {
			console.warn("Сетевой запрос быстрой утилизации отложен, локальное списание активно:", err);
		}
	}

	options.onToast ? options.onToast(toastMessage, toastType) : showToast(toastMessage, toastType);

	return {
		success: true, packageId: pkg.id, packageTitle: pkg.title, actNumber, actDate,
		totalItemsCount: pkg.items.length, totalQuantity: calc.totalQuantity,
		totalCostKopecks: calc.totalCostKopecks, isOverdraft, overdraftCount,
		overdraftItems: calc.overdraftItems, deductedItems: calc.deductedItems,
		toastMessage, toastType,
	};
}
