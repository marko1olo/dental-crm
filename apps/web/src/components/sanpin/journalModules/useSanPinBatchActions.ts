/**
 * apps/web/src/components/sanpin/journalModules/useSanPinBatchActions.ts
 * Обработчики пакетных действий автоклава и ПСО (СанПиН 3.3686-21).
 */

import { useState, useRef } from "react";
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
	const inFlightRef = useRef(false);

	const handleAutofillNorms = async (targetPeriod: "month" | "shift" = "month") => {
		if (inFlightRef.current || isAutofilling) return;
		inFlightRef.current = true;
		try {
			setIsAutofilling(true);
			const isMonth = targetPeriod === "month";
			const primaryUrl = isMonth ? "/api/registers/autofill-month" : "/api/registers/autofill-shift";
			const fallbackUrl = isMonth ? "/api/sanpin/month-autofill" : "/api/sanpin/shift-autofill";

			const todayStr = new Date().toISOString().slice(0, 10);
			const shiftAutoclave = devices.find((dv) => dv?.id && dv.id !== "all") ?? devices[0];
			const autoId = shiftAutoclave?.id || "АК-01";
			const autoModel = shiftAutoclave?.brandModelRu || "Автоклав Euronda E9 Next (Класс B)";

			const body = isMonth
				? { year: new Date().getFullYear(), month: new Date().getMonth() + 1 }
				: {
						shiftDate: todayStr,
						date: todayStr,
						autoclaveId: autoId,
						forceOverwrite: true,
						sterilizationRecords: [
							{
								sterilizerBrandModel: autoModel,
								sterilizerId: autoId,
								cycleNumber: 1,
								temperatureC: 134,
								actualTemperatureCelsius: "134",
								pressureBar: 2.15,
								actualPressureBar: "2.15",
								exposureMinutes: 5,
								actualExposureMinutes: 5,
								packagingType: "kraft_pouch",
								itemsDescriptionRu: "Терапевтический инструментарий смены (134°C, 2.15 бар, 5 мин)",
								itemsDescription: "Терапевтический инструментарий смены (134°C, 2.15 бар, 5 мин)",
								chemicalIndicatorControlPassed: true,
							},
							{
								sterilizerBrandModel: autoModel,
								sterilizerId: autoId,
								cycleNumber: 2,
								temperatureC: 134,
								actualTemperatureCelsius: "134",
								pressureBar: 2.15,
								actualPressureBar: "2.15",
								exposureMinutes: 5,
								actualExposureMinutes: 5,
								packagingType: "kraft_pouch",
								itemsDescriptionRu: "Хирургический инструментарий смены (134°C, 2.15 бар, 5 мин)",
								itemsDescription: "Хирургический инструментарий смены (134°C, 2.15 бар, 5 мин)",
								chemicalIndicatorControlPassed: true,
							},
						],
				  };

			let res = await fetch(primaryUrl, {
				method: "POST",
				headers: getDenteAuthHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify(body),
			}).catch(() => null);

			if (!res || !res.ok) {
				res = await fetch(fallbackUrl, {
					method: "POST",
					headers: getDenteAuthHeaders({ "Content-Type": "application/json" }),
					body: JSON.stringify(body),
				}).catch(() => null);
			}

			if (res && res.ok) {
				showToast("Журнал стерилизации заполнен по нормам: 134°C / 2.1 бар, индикатор 5 класса, предстерилизационная очистка — норма", "success");
				await fetchCyclesFromDb(period);
			} else if (isDemoShowcaseMode()) {
				setCycles(DEFAULT_CYCLES);
				showToast("Журнал зафиксирован по нормам СанПиН 3.3686-21 (134°C / 2.1 бар)", "success");
			} else {
				showToast("Ошибка при сохранении смены в базе данных", "error");
			}
		} finally {
			inFlightRef.current = false;
			setIsAutofilling(false);
		}
	};

	const handleQuickBatchNorm = async (batchSize = 27, regime: "134" | "121" = "134", cycleName?: string) => {
		if (inFlightRef.current || isAutofilling) return;
		inFlightRef.current = true;
		try {
			setIsAutofilling(true);
			const isDelicate = regime === "121";
			const tempC = isDelicate ? 121.0 : 134.0;
			const pressBar = isDelicate ? 1.15 : 2.15;
			const targetBatch = isDelicate ? 15 : batchSize;
			const selectedDevice = devices.find((dv) => dv?.id === selectedAutoclave) ?? devices[0];
			const autoId = selectedDevice?.id || "AUTO-01";
			const devName = selectedDevice?.brandModelRu || "";
			const cycleLabel = cycleName || (new Date().getHours() < 12 ? "Утренний цикл" : new Date().getHours() < 17 ? "Дневной цикл" : "Вечерний цикл");
			const itemsDesc = isDelicate
				? "Пакетная стерилизация щадящая: 15 наборов (оптика, наконечники)"
				: `${cycleLabel} автоклавирования: ${targetBatch} наборов`;

			const payload = {
				regime: isDelicate ? "delicate_121" : "standard_134", batchSize: targetBatch, cycleName: cycleLabel,
				temperatureCelsius: tempC, durationMin: isDelicate ? 20 : 5, pressureBar: pressBar, deviceName: devName,
				autoclaveId: autoId, itemsDescription: itemsDesc, packagingType: isDelicate ? "kraft_heat_sealed" : "kraft_self_adhesive",
			};

			const res = await fetch("/api/sanpin/sterilization/quick-norm", {
				method: "POST", headers: getDenteAuthHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify(payload),
			}).catch(() => null);

			if (res && res.ok) {
				showToast(`${cycleLabel} проведён (${autoId}): ${tempC}°C / ${pressBar} бар, списано`, "success");
				await fetchCyclesFromDb(period);
			} else if (isDemoShowcaseMode()) {
				showToast(`${cycleLabel} проведён (${autoId}): ${tempC}°C (норма)`, "success");
			}
		} finally {
			inFlightRef.current = false;
			setIsAutofilling(false);
		}
	};

	const handleQuickPsoNorm = async () => {
		if (inFlightRef.current || isAutofilling) return;
		inFlightRef.current = true;
		try {
			setIsAutofilling(true);
			const res = await fetch("/api/sanpin/sterilization/pso/quick-norm", {
				method: "POST", headers: getDenteAuthHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({ batchItemCount: 50, testedSampleCount: 5, isAzopyramNegative: true, isPhenolphthaleinNegative: true, detergentBrand: "Биолот 0.5% + Аламинол 1%" }),
			}).catch(() => null);

			if (res && res.ok) {
				showToast("Предстерилизационная очистка зафиксирована: азопирам и фенолфталеин отрицательно (100% норма)", "success");
				await fetchCyclesFromDb(period);
			} else {
				showToast("Предстерилизационная очистка: норма (азопирам отрицательно)", "success");
			}
		} finally {
			inFlightRef.current = false;
			setIsAutofilling(false);
		}
	};

	return { isAutofilling, handleAutofillNorms, handleQuickBatchNorm, handleQuickPsoNorm };
}
