import { generateUuidV7 } from "@dental/shared";
import { denteClinicalMutationHeaders } from "../../../lib/denteRequestHeaders.js";
import { clientLogger } from "../../../services/logging/clientLogger.js";
import { showToast } from "../../GlobalToast.js";
import type {
	PackageWriteOffOptions,
	PackageWriteOffResult,
} from "./packageWriteoffTypes.js";
import { CLINICAL_WRITEOFF_PACKAGES } from "./packageWriteoffPresets.js";
import { calculatePackageDeductions } from "./packageWriteoffDeductionCalculator.js";

let packageWriteOffActSeq = 0;

export async function handlePackageWriteOff(
	options: PackageWriteOffOptions,
): Promise<PackageWriteOffResult> {
	const pkg =
		CLINICAL_WRITEOFF_PACKAGES.find((p) => p.id === options.packageId) ??
		CLINICAL_WRITEOFF_PACKAGES[0];
	if (!pkg) {
		throw new Error("Не найден клинический пакет списания материалов");
	}

	const multiplier = Math.max(1, options.quantityMultiplier ?? 1);
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
		: `Клинический пакет «${pkg.title}» успешно списан (${pkg.items.length} поз.).`;

	if (options.fetchFn && options.organizationId) {
		const notesParts = [
			`Акт ${actNumber} (${actDate})`,
			options.cabinetId ? `каб. ${options.cabinetId}` : null,
			options.doctorName ? `врач: ${options.doctorName}` : null,
			options.nurseName ? `ассистент: ${options.nurseName}` : null,
			options.patientName ? `пациент: ${options.patientName}` : null,
		].filter(Boolean);

		try {
			const res = await options.fetchFn(`/api/inventory/${options.organizationId}/quick-writeoff-package`, {
				method: "POST",
				headers: denteClinicalMutationHeaders({
					"Content-Type": "application/json",
					"Idempotency-Key": generateUuidV7(),
				}),
				body: JSON.stringify({
					packageId: pkg.id,
					quantityMultiplier: multiplier,
					...(options.visitId !== undefined ? { visitId: options.visitId } : {}),
					notes: notesParts.join("; "),
				}),
			});
			if (!res.ok) {
				clientLogger.warn(
					"[packageWriteoffExecution] Сервер вернул ошибку при быстром списании пакета",
					{ status: res.status, packageId: pkg.id },
					{ module: "Inventory" },
				);
			}
		} catch (err) {
			clientLogger.warn(
				"[packageWriteoffExecution] Сетевой запрос быстрой утилизации отложен, локальное списание активно",
				err,
				{ module: "Inventory" },
			);
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

/** @deprecated Имя содержит сленг «OneClick». Используйте канонический handlePackageWriteOff */
export const handleOneClickPackageWriteOff = handlePackageWriteOff;
