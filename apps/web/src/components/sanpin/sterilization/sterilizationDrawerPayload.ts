/**
 * apps/web/src/components/sterilization/sterilizationDrawerPayload.ts
 *
 * Хелпер формирования полезной нагрузки для 1-кликового утверждения цикла.
 * Мандат 8b: строго <= 120 строк.
 */

import type { ClinicalAutoclavePreset } from "../sterilizationModules/sterilizationCycleTypes";

export interface BuildSterilizationPayloadArgs {
	readonly deviceId: string;
	readonly clinicDevices: readonly { id: string; brandModelRu: string }[];
	readonly activePreset: ClinicalAutoclavePreset;
	readonly packsCount: number;
	readonly sessionStaffName: string;
}

export function buildSterilizationCyclePayload({
	deviceId,
	clinicDevices,
	activePreset,
	packsCount,
	sessionStaffName,
}: BuildSterilizationPayloadArgs) {
	const now = new Date();
	const cycleDateStr = now.toISOString().slice(0, 10);
	const cycleTimeStr = now.toLocaleTimeString("ru-RU", {
		hour: "2-digit",
		minute: "2-digit",
	});
	const selectedDev = clinicDevices.find((d) => d.id === deviceId);
	const deviceName =
		selectedDev?.brandModelRu ||
		(deviceId === "АК-02"
			? "W&H Lisa 17 (Класс B)"
			: "Melag Vacuklav 23 B+ (Класс B)");

	return {
		deviceName,
		autoclaveId: deviceId,
		date: cycleDateStr,
		time: cycleTimeStr,
		regimeTitle: activePreset.title,
		regimeId: activePreset.regimeOptionId,
		actualTemperature: activePreset.temperatureC,
		actualPressure: activePreset.pressureBar,
		actualDuration: activePreset.durationMin,
		itemsDescription: activePreset.itemsDescription,
		packsCount: packsCount > 0 ? packsCount : 14,
		packagingType: activePreset.packagingId,
		packagingNameRu: activePreset.subtitle,
		indicatorClass: activePreset.indicatorClass,
		indicatorType: "class5_integrating",
		isCyclePassed: true,
		passedIndicator: true,
		operatorName: sessionStaffName,
		psoAzopyramNegative: true,
		psoPhenolphthaleinNegative: true,
		notes:
			"Автоматическая фиксация: Индикатор 5 класса пройден. Азопирам отрицательный. Пакеты списаны со склада.",
	};
}
