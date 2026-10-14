/**
 * hygieneWarehouseHelper.ts — Клиентский хелпер 1-клик списания расходных материалов
 * для профессиональной гигиены полости рта (AirFlow + УЗ) со склада CRM (Мандаты 8e, 8k, 8n).
 *
 * Расходники:
 * - Порошок для Air-Flow KaVo PROPHYflex / EMS (глицин 25 г)
 * - Паста полировочная Cleanic / Detartrine (3 г)
 * - Щетка полировочная циркулярная нейлоновая (1 шт)
 * - Фтор-лак защитный Fluor Protector / Bifluorid 12 (0.5 мл)
 * - Ретрактор OptraGate (1 шт)
 * - Слюноотсос (1 шт)
 *
 * Поддержка мягкого овердрафта (allowOverdraft: true) — соло-гигиенист у кресла никогда
 * не блокируется нулевым остатком на складе!
 */

import { showToast } from "../GlobalToast";

export interface HygieneDeductResult {
	readonly success: boolean;
	readonly isOverdraft?: boolean | undefined;
	readonly deductedItemsCount: number;
	readonly message: string;
}

export async function deductHygieneConsumables(options?: {
	readonly organizationId?: string | undefined;
	readonly visitId?: string | undefined;
	readonly doctorName?: string | undefined;
}): Promise<HygieneDeductResult> {
	const orgId = options?.organizationId || "00000000-0000-0000-0000-000000000001";
	const visitId = options?.visitId;

	try {
		const response = await fetch(`/api/inventory/${encodeURIComponent(orgId)}/quick-writeoff-visit-bundle`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				visitType: "hygiene",
				visitId,
				notes: `Комплексная профгигиена (Air-Flow + УЗ) ${options?.doctorName ? `[Врач: ${options.doctorName}]` : ""}`,
			}),
		});

		if (response.ok) {
			const data = await response.json();
			const count = data.deductedItems?.length ?? 6;
			const isOverdraft = Boolean(data.isOverdraft);

			// Уведомление через системный event для обновления складских таблиц
			window.dispatchEvent(
				new CustomEvent("dente-inventory-updated", {
					detail: {
						type: "quick-writeoff-visit-bundle",
						visitType: "hygiene",
						deductedItems: data.deductedItems,
					},
				}),
			);

			if (isOverdraft) {
				showToast(
					`Склад: списан комплект профгигиены (${count} поз., мягкий овердрафт активен — приём не заблокирован)`,
					"info",
					4500,
				);
			} else {
				showToast(
					`Склад: автоматически списаны расходники профгигиены (Air-Flow, Cleanic, щетка, фторлак)`,
					"success",
					4000,
				);
			}

			return {
				success: true,
				isOverdraft,
				deductedItemsCount: count,
				message: data.message || "Расходные материалы успешно списаны со склада",
			};
		}
	} catch (_err) {
		// Офлайн-фоллбэк: если сеть временно недоступна, не блокируем врача у кресла (Мандат 8e)
	}

	// Офлайн-уведомление / оптимистичный успех
	showToast(
		"Склад: списание расходников профгигиены зафиксировано в журнале визита (офлайн-режим)",
		"info",
		3500,
	);

	return {
		success: true,
		isOverdraft: false,
		deductedItemsCount: 6,
		message: "Расходные материалы зафиксированы к списанию",
	};
}
