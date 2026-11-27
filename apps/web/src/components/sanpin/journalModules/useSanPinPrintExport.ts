/**
 * apps/web/src/components/sanpin/journalModules/useSanPinPrintExport.ts
 *
 * Обработчики печати журнала автоклавирования и экспорта CSV.
 * Мандат 8b: строго <= 120 строк.
 */

import { showToast } from "../../GlobalToast";
import { clientLogger } from "../../../services/logging/clientLogger";
import { handleGenerateMonthlySterilizationLog } from "../AutoclavePrintHelpers";
import type { ClinicAutoclaveDeviceLike } from "../autoclaveMonthlyJournalPrint.js";
import type { SanPinCycleEntry } from "./sanpinJournalTypes";

export function useSanPinPrintExport(
	selectedAutoclave: string,
	devices: readonly ClinicAutoclaveDeviceLike[],
	filteredCycles: readonly SanPinCycleEntry[],
) {
	const handlePrintSterilizationLog = () => {
		try {
			handleGenerateMonthlySterilizationLog(selectedAutoclave, devices);
			showToast("Печатный журнал автоклавирования сформирован (А4)", "success");
		} catch (err) {
			clientLogger.warn("[useSanPinPrintExport] Print journal generation failed", err, {
				module: "SanPin",
			});
			showToast("Ошибка при формировании журнала автоклавирования", "error");
		}
	};

	const handleExportCsv = () => {
		const header = "Дата,Время,Цикл,Автоклав,Температура C,Давление бар,Экспозиция мин,Индикатор,Результат,Крафт-пакеты,Оператор\n";
		const rows = filteredCycles.map((c) =>
			`"${c.date}","${c.time}","№${c.cycleNumber}","${c.autoclaveCode} (${c.autoclaveModel})",${c.temperatureC},${c.pressureBar},${c.durationMin},"${c.indicatorClass} класс","${c.isIndicatorNorm ? "Норма" : "Брак"}","${c.pouchCodes.join("; ")}","${c.operatorName}"`
		).join("\n");
		const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const now = new Date();
		const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
		const link = document.createElement("a");
		try {
			link.href = url;
			link.setAttribute("download", `SanPiN_Sterilization_Journal_${localDate}.csv`);
			document.body.appendChild(link);
			link.click();
		} finally {
			if (link.parentNode) {
				link.parentNode.removeChild(link);
			}
			URL.revokeObjectURL(url);
		}
		showToast("Журнал стерилизации экспортирован в CSV", "success");
	};

	return { handlePrintSterilizationLog, handleExportCsv };
}
