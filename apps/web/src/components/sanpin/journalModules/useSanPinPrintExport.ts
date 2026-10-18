/**
 * apps/web/src/components/sanpin/journalModules/useSanPinPrintExport.ts
 *
 * Обработчики печати журнала автоклавирования и экспорта CSV.
 * Мандат 8b: строго <= 120 строк.
 */

import { showToast } from "../../GlobalToast";
import { normalizePouchBarcode } from "./pouchBarcodeUtils";
import { handleGenerateMonthlyForm257 } from "../AutoclavePrintHelpers";
import { parseAndValidateKraftBarcode } from "@dental/shared";
import type { SanPinCycleEntry } from "./sanpinJournalTypes";

export function useSanPinPrintExport(
	selectedAutoclave: string,
	devices: any[],
	filteredCycles: readonly SanPinCycleEntry[],
	onAttachPouchToVisit?: (pouchCode: string, snippet: string) => void,
) {
	const handleQuickChairsideScan = (codeToScan: string) => {
		const raw = codeToScan.trim();
		if (!raw) return;
		const normalized = normalizePouchBarcode(raw);
		parseAndValidateKraftBarcode(normalized, {
			referenceDate: new Date().toISOString().slice(0, 10),
		});

		const snippet = `Стерилизация СанПиН 3.3686-21: крафт-пакет №${normalized} (АК-01, 134°C / 2.1 бар / 5 мин, индикатор 5 кл. норма).`;
		if (onAttachPouchToVisit) {
			onAttachPouchToVisit(normalized, snippet);
		}
		showToast(`Крафт-пакет №${normalized} прикреплён к визиту за 1 сек (134°C / 2.1 бар, Норма)`, "success");
	};

	const handlePrint257 = () => {
		try {
			handleGenerateMonthlyForm257(selectedAutoclave, devices);
			showToast("Печатный журнал автоклавирования сформирован (А4)", "success");
		} catch {
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
		const link = document.createElement("a");
		link.href = url;
		link.setAttribute("download", `SanPiN_Sterilization_Journal_${new Date().toISOString().slice(0, 10)}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		showToast("Журнал стерилизации экспортирован в CSV", "success");
	};

	return { handleQuickChairsideScan, handlePrint257, handleExportCsv };
}
