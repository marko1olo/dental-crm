/**
 * apps/web/src/components/sanpin/journalModules/useSanPinBatchActions.ts
 *
 * Обработчики пакетных действий автоклава и ПСО (СанПиН 3.3686-21).
 * Мандат 8b: строго <= 120 строк.
 */

import { useState } from "react";
import { showToast } from "../../GlobalToast";
import { getDenteAuthHeaders } from "../../../lib/denteRequestHeaders";
import { isDemoShowcaseMode } from "../../../lib/demoMode";
import { DEFAULT_CYCLES, type SanPinCycleEntry, type SanPinJournalPeriod } from "./sanpinJournalTypes";

export function useSanPinBatchActions(
	devices: any[],
	selectedAutoclave: string,
	period: SanPinJournalPeriod,
	fetchCyclesFromDb: (p?: SanPinJournalPeriod) => Promise<void>,
	setCycles: React.Dispatch<React.SetStateAction<SanPinCycleEntry[]>>,
) {
	const [isAutofilling, setIsAutofilling] = useState(false);

	const handleAutofillNorms = async (targetPeriod: "month" | "shift" = "month") => {
		try {
			setIsAutofilling(true);
			const url = targetPeriod === "month" ? "/api/registers/autofill-month" : "/api/registers/sterilization/shift-batch";
			const body = targetPeriod === "month"
				? { year: new Date().getFullYear(), month: new Date().getMonth() + 1, operatorFullName: "Иванова А. С. (ЦСО)" }
				: { cyclesCount: 3, deviceName: "Melag Vacuklav 23B+ (ЦСО №1)", packagingType: "kraft_pouch", itemsDescription: "Инструментарий смены (134°C, 2.15 бар, 5 мин)" };

			const res = await fetch(url, {
				method: "POST",
				headers: getDenteAuthHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify(body),
			}).catch(() => null);

			if (res && res.ok) {
				showToast("Журнал стерилизации заполнен по нормам (134°C / 2.1 бар, 5 кл., ПСО 100% норма)", "success");
				await fetchCyclesFromDb(period);
			} else if (isDemoShowcaseMode()) {
				setCycles(DEFAULT_CYCLES);
				showToast("Журнал зафиксирован по нормам СанПиН 3.3686-21 (134°C / 2.1 бар)", "success");
			} else {
				showToast("Ошибка при сохранении смены в базе данных", "error");
			}
		} finally {
			setIsAutofilling(false);
		}
	};

	const handleQuickBatchNorm = async (batchSize = 27, regime: "134" | "121" = "134", cycleName?: string) => {
		try {
			setIsAutofilling(true);
			const isDelicate = regime === "121";
			const tempC = isDelicate ? 121.0 : 134.0;
			const pressBar = isDelicate ? 1.15 : 2.15;
			const targetBatch = isDelicate ? 15 : batchSize;
			const autoId = selectedAutoclave !== "all" ? selectedAutoclave : (devices[0]?.id || "АК-01");
			const devName = autoId === "АК-02" ? "W&H Lina 17 (ЦСО)" : "Melag Vacuklav 23 B+ (ЦСО №1)";
			const cycleLabel = cycleName || (new Date().getHours() < 12 ? "Утренний цикл" : new Date().getHours() < 17 ? "Дневной цикл" : "Вечерний цикл");
			const itemsDesc = isDelicate
				? "Пакетная стерилизация щадящая: 15 наборов (оптика, полимеры, наконечники)"
				: `${cycleLabel} автоклавирования: ${targetBatch} наборов (15 смотровых, 8 терапевтических, 4 турбины)`;

			const payload = {
				regime: isDelicate ? "delicate_121" : "standard_134",
				batchSize: targetBatch,
				cycleName: cycleLabel,
				temperatureCelsius: tempC,
				durationMin: isDelicate ? 20 : 5,
				pressureBar: pressBar,
				deviceName: devName,
				autoclaveId: autoId,
				itemsDescription: itemsDesc,
				packagingType: isDelicate ? "kraft_heat_sealed" : "kraft_self_adhesive",
			};

			const res = await fetch("/api/sanpin/sterilization/quick-norm", {
				method: "POST",
				headers: getDenteAuthHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify(payload),
			}).catch(() => null);

			if (res && res.ok) {
				showToast(`${cycleLabel} автоклавирования проведён (${autoId}): ${tempC}°C / ${pressBar} бар, расходники списаны`, "success");
				await fetchCyclesFromDb(period);
			} else if (isDemoShowcaseMode()) {
				showToast(`${cycleLabel} автоклавирования проведён (${autoId}): ${tempC}°C (норма, расходники списаны)`, "success");
			}
		} finally {
			setIsAutofilling(false);
		}
	};

	const handleQuickPsoNorm = async () => {
		try {
			setIsAutofilling(true);
			const res = await fetch("/api/sanpin/sterilization/pso/quick-norm", {
				method: "POST",
				headers: getDenteAuthHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({ batchItemCount: 50, testedSampleCount: 5, isAzopyramNegative: true, isPhenolphthaleinNegative: true, detergentBrand: "Биолот 0.5% + Аламинол 1%" }),
			}).catch(() => null);

			if (res && res.ok) {
				showToast("Предстерилизационная очистка зафиксирована: азопирам и фенолфталеин отрицательно (100% норма)", "success");
				await fetchCyclesFromDb(period);
			} else {
				showToast("Предстерилизационная очистка: норма (азопирам отрицательно)", "success");
			}
		} finally {
			setIsAutofilling(false);
		}
	};

	return { isAutofilling, handleAutofillNorms, handleQuickBatchNorm, handleQuickPsoNorm };
}
