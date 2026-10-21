import { showToast } from "../../GlobalToast";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import { ONE_CLICK_LAB_DEFAULTS, addWorkingDays, calculateMaterialTotalCostKopecks } from "../../lab/labMath";
import type { LabOrderCreationParams } from "./types";

export async function createExpressLabOrder({
	patientId,
	doctorId,
	targetTeeth,
	currentTierTitle,
}: LabOrderCreationParams): Promise<void> {
	if (!targetTeeth || targetTeeth.length === 0) {
		showToast("Нет выбранных ортопедических зубов для наряда ЗТЛ", "warning");
		return;
	}

	const due = addWorkingDays(new Date(), ONE_CLICK_LAB_DEFAULTS.workingDays);
	const dueDateIso = due.toISOString();
	const dueDateFormatted = due.toLocaleDateString("ru-RU");
	const isBridge = targetTeeth.length > 1;
	const construction = isBridge ? ONE_CLICK_LAB_DEFAULTS.restorationTypeBridge : ONE_CLICK_LAB_DEFAULTS.restorationTypeSingle;
	const priceRub =
		(calculateMaterialTotalCostKopecks(ONE_CLICK_LAB_DEFAULTS.materialId, targetTeeth.length) || 650000 * targetTeeth.length) / 100;
	const toothFdiStr = targetTeeth.join(", ");

	try {
		showToast(`Создаём наряд ЗТЛ для зубов ${toothFdiStr}...`, "info", 2000);
		const res = await fetch("/api/clinical/lab-orders", {
			method: "POST",
			headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
			body: JSON.stringify({
				patientId,
				doctorId,
				toothFdi: toothFdiStr,
				material: ONE_CLICK_LAB_DEFAULTS.materialName,
				colorVita: ONE_CLICK_LAB_DEFAULTS.colorVita,
				dueDate: dueDateIso,
				clinicalNotes: `• Наряд ЗТЛ из плана лечения (${currentTierTitle})\n• Конструкция: ${isBridge ? `Мостовидный протез (${targetTeeth.length} ед.: ${targetTeeth.join("-")})` : "Одиночная коронка"}\n• Материал: ${ONE_CLICK_LAB_DEFAULTS.materialName}\n• Цвет: VITA Classical ${ONE_CLICK_LAB_DEFAULTS.colorVita}\n• Срок: 7 рабочих дней (до ${dueDateFormatted})\n• Цементный зазор: ${ONE_CLICK_LAB_DEFAULTS.cementGapMicrons} мкм`,
				priceRub,
			}),
		});

		if (!res.ok) {
			const err = await res.json().catch(() => ({}));
			throw new Error(err.message || "Ошибка создания наряда ЗТЛ");
		}

		const savedOrder = await res.json();
		if (savedOrder?.id) {
			for (const tooth of targetTeeth) {
				try {
					await fetch(`/api/clinical/lab-orders/${savedOrder.id}/items`, {
						method: "POST",
						headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
						body: JSON.stringify({
							toothFdi: tooth,
							restorationType: construction,
							material: ONE_CLICK_LAB_DEFAULTS.materialId,
							shadeFinal: ONE_CLICK_LAB_DEFAULTS.colorVita,
							translucencyLevel: ONE_CLICK_LAB_DEFAULTS.translucency,
							cementGapMicrons: ONE_CLICK_LAB_DEFAULTS.cementGapMicrons,
							priceRub: priceRub / targetTeeth.length,
						}),
					});
				} catch {
					// Non-blocking item fallback
				}
			}
		}

		showToast(`Наряд ЗТЛ успешно оформлен для зубов ${toothFdiStr} (Цирконий A2, срок до ${dueDateFormatted})!`, "success", 6000);
		window.dispatchEvent(new CustomEvent("dente-lab-order-created", { detail: { order: savedOrder } }));
	} catch (err: any) {
		showToast(err.message || "Не удалось оформить наряд в ЗТЛ", "error");
	}
}
