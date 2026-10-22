/**
 * implantPlanBuilder.ts — генератор позиций сметы / плана лечения из параметров имплантации.
 * Mandate 8b: Модульность, строго < 120 строк.
 * Mandate 8e: Doctor Autonomy (независимость хирурга, свобода скидок и цен).
 */

import type { TreatmentPlanItem } from "../../treatment-plans/types";
import { showToast } from "../../GlobalToast";
import {
	type CtImplantBridgeParams,
	DEFAULT_IMPLANT_PRICES_RUB,
	STORAGE_PREFIX,
	getImplantBrandTitle,
} from "./implantBridgeTypes";
import { updateOdontogramToothToPlannedImplant } from "./implantDiarySoapBuilder";

/**
 * 1. Формирует официальную позицию сметы / плана лечения по Номенклатуре МЗ РФ 804н.
 * Код A16.07.054: Внутрикостная дентальная имплантация
 */
export function buildImplantTreatmentPlanItem(params: CtImplantBridgeParams): TreatmentPlanItem {
	const brandTitle = getImplantBrandTitle(params.implantSpec.brand);
	const priceRub = params.customPriceRub ?? DEFAULT_IMPLANT_PRICES_RUB[params.implantSpec.brand] ?? 25000;
	const diameterStr = params.implantSpec.diameterMm.toFixed(1);
	const lengthStr = params.implantSpec.lengthMm.toFixed(1);

	const nerveStatus =
		params.nerveClearanceMm !== null
			? `Дистанция до канала: ${params.nerveClearanceMm.toFixed(1)} мм`
			: "Канал не размечен";

	const ridgeHStr = typeof params.ridgeHeightMm === "number" ? `H=${params.ridgeHeightMm.toFixed(1)} мм` : "H: не измерялась (—)";
	const ridgeWStr = typeof params.ridgeWidthMm === "number" ? `W=${params.ridgeWidthMm.toFixed(1)} мм` : "W: не измерялась (—)";

	const clinicalRationale =
		`КЛКТ-замеры (FDI #${params.toothFdi}): гребень ${ridgeHStr}, ` +
		`${ridgeWStr}. Плотность кости: ${params.mischClass ?? "не измерялась"} ` +
		`(${params.meanHU !== null ? `${params.meanHU} HU` : "D3"}). ${nerveStatus}. ` +
		`Торк фиксации: ${params.recommendedTorqueNcm}.`;

	return {
		id: `plan-implant-${params.toothFdi}-${Date.now()}`,
		toothNumber: params.toothFdi,
		code804n: "A16.07.054",
		name: `Внутрикостная дентальная имплантация: ${brandTitle} (Ø${diameterStr} × ${lengthStr} мм)`,
		category: "Хирургия",
		priceRub,
		unitPriceRub: priceRub,
		discountRub: 0,
		quantity: 1,
		phase: 2,
		stageKind: "stage_2_surgery",
		isAuto: false,
		materials: `Имплантат ${brandTitle} Ø${diameterStr} × ${lengthStr} мм`,
		clinicalRationale,
	};
}

/**
 * 2. Локальное хранилище кастомных позиций плана для синхронизации без перезагрузки.
 */
export function loadPersistedCustomPlanItems(patientId: string): TreatmentPlanItem[] {
	if (typeof window === "undefined" || !window.localStorage || !patientId) return [];
	try {
		const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${patientId}`);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

export function savePersistedCustomPlanItem(patientId: string, item: TreatmentPlanItem): void {
	if (typeof window === "undefined" || !window.localStorage || !patientId) return;
	try {
		const existing = loadPersistedCustomPlanItems(patientId);
		const filtered = existing.filter((it) => it.id !== item.id);
		filtered.push(item);
		window.localStorage.setItem(`${STORAGE_PREFIX}${patientId}`, JSON.stringify(filtered));
	} catch {
		// ignore
	}
}

/**
 * 3. Экспорт имплантата в план лечения (1-клик):
 * - Генерирует TreatmentPlanItem
 * - Диспатчит событие 'dente-add-treatment-plan-item'
 * - Сохраняет в локальном кеше пациента
 * - Размечает зуб в одонтограмме ('Planned_Implant')
 */
export function exportImplantToTreatmentPlan(params: CtImplantBridgeParams): TreatmentPlanItem {
	const item = buildImplantTreatmentPlanItem(params);

	if (params.patientId) {
		savePersistedCustomPlanItem(params.patientId, item);
	}

	updateOdontogramToothToPlannedImplant(params.toothFdi);

	if (typeof window !== "undefined") {
		try {
			window.dispatchEvent(
				new CustomEvent("dente-add-treatment-plan-item", {
					detail: {
						item,
						toothNumber: params.toothFdi,
						patientId: params.patientId,
					},
				}),
			);
		} catch {
			// ignore
		}
	}

	showToast(
		`Имплантат ${getImplantBrandTitle(params.implantSpec.brand)} Ø${params.implantSpec.diameterMm}x${params.implantSpec.lengthMm} (зуб #${params.toothFdi}) добавлен в план лечения!`,
		"success",
		4500,
	);

	return item;
}
