/**
 * expressLabOrderHelper.ts — Единый SSOT хелпер быстрого оформления наряда ЗТЛ (Мандаты 8e, 8n, 8bf, 8zp).
 *
 * Консолидирует дублирующуюся логику экспресс-заказа из:
 * - apps/web/src/components/treatment-plans/networkSync/planLabOrderCreator.ts
 * - apps/web/src/components/odontogram/useOdontogramQuickActions.ts
 */

import { generateUuidV7, kopecksToRubles } from "@dental/shared";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { showToast } from "../GlobalToast";
import {
	ONE_CLICK_LAB_DEFAULTS,
	addWorkingDays,
	calculateMaterialTotalCostKopecks,
} from "./labMath";

export interface ExpressLabOrderRequest {
	readonly patientId: string;
	readonly doctorId?: string | null | undefined;
	readonly targetTeeth: readonly number[];
	readonly sourceContext?: "treatment_plan" | "odontogram" | string | undefined;
	readonly currentTierTitle?: string | undefined;
}

export interface ExpressLabOrderResult {
	readonly success: boolean;
	readonly order?: Record<string, unknown> | undefined;
	readonly error?: string | undefined;
}

/**
 * Оформляет наряд ЗТЛ у кресла за 1 клик с безопасными клиническими дефолтами (Цирконий A2).
 */
export async function submitExpressLabOrder({
	patientId,
	doctorId,
	targetTeeth,
	sourceContext,
	currentTierTitle,
}: ExpressLabOrderRequest): Promise<ExpressLabOrderResult> {
	if (!targetTeeth || targetTeeth.length === 0) {
		const msg = "Выберите зубы для оформления наряда ЗТЛ";
		showToast(msg, "warning");
		return { success: false, error: msg };
	}

	const due = addWorkingDays(new Date(), ONE_CLICK_LAB_DEFAULTS.workingDays);
	const dueDateIso = due.toISOString();
	const dueDateFormatted = due.toLocaleDateString("ru-RU");
	const isBridge = targetTeeth.length > 1;
	const priceKopecks =
		calculateMaterialTotalCostKopecks(ONE_CLICK_LAB_DEFAULTS.materialId, targetTeeth.length) ||
		650000 * targetTeeth.length;
	const priceRub = kopecksToRubles(priceKopecks);
	const toothFdiStr = targetTeeth.join(", ");

	const contextHeader = currentTierTitle
		? `• Наряд ЗТЛ из плана лечения (${currentTierTitle})`
		: sourceContext === "odontogram"
			? "• Экспресс-наряд ЗТЛ из одонтограммы"
			: "• Экспресс-наряд ЗТЛ";

	const constructionDescription = isBridge
		? `Мостовидный протез (${targetTeeth.length} ед.: ${targetTeeth.join("-")})`
		: "Одиночная коронка";

	const clinicalNotes = `${contextHeader}\n• Конструкция: ${constructionDescription}\n• Материал: ${ONE_CLICK_LAB_DEFAULTS.materialName}\n• Цвет: VITA Classical ${ONE_CLICK_LAB_DEFAULTS.colorVita}\n• Срок: ${ONE_CLICK_LAB_DEFAULTS.workingDays} рабочих дней (до ${dueDateFormatted})\n• Цементный зазор: ${ONE_CLICK_LAB_DEFAULTS.cementGapMicrons} мкм`;

	try {
		showToast(`Оформляем наряд ЗТЛ для зубов ${toothFdiStr}...`, "info", 2000);
		const res = await fetch("/api/lab/orders", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Idempotency-Key": generateUuidV7(),
				...denteAdminSecretRequestHeaders(),
			},
			body: JSON.stringify({
				patientId,
				doctorId: doctorId ?? null,
				toothFdi: toothFdiStr,
				material: ONE_CLICK_LAB_DEFAULTS.materialName,
				colorVita: ONE_CLICK_LAB_DEFAULTS.colorVita,
				dueDate: dueDateIso,
				clinicalNotes,
				priceRub,
				priceKopecks,
			}),
		});

		if (!res.ok) {
			const err = (await res.json().catch(() => ({}))) as { message?: string };
			throw new Error(err.message || "Ошибка создания наряда ЗТЛ на сервере");
		}

		const savedOrder = (await res.json()) as Record<string, unknown>;

		showToast(
			`Наряд ЗТЛ успешно оформлен для зубов ${toothFdiStr} (Цирконий A2, срок до ${dueDateFormatted})!`,
			"success",
			6000,
		);

		window.dispatchEvent(
			new CustomEvent("dente-lab-order-created", {
				detail: { ...savedOrder, order: savedOrder },
			}),
		);

		return { success: true, order: savedOrder };
	} catch (err: unknown) {
		const message =
			err instanceof Error
				? err.message
				: "Не удалось оформить наряд в лабораторию";
		showToast(message, "error");
		return { success: false, error: message };
	}
}
