/**
 * apps/web/src/components/sanpin/journalModules/useSanPinJournalLogic.ts
 *
 * Мастер-хук журнала автоклавирования и стерилизации (СанПиН 3.3686-21).
 * Объединяет выборку циклов, пакетные действия и печать/экспорт.
 * Мандат 8b: строго <= 120 строк.
 */

import { useState, useMemo } from "react";
import { loadSavedClinicAutoclaves } from "../autoclave/autoclaveDeviceTypes";
import type { SanPinJournalPeriod } from "./sanpinJournalTypes";
import { useSanPinCyclesFetch } from "./useSanPinCyclesFetch";
import { useSanPinBatchActions } from "./useSanPinBatchActions";
import { useSanPinPrintExport } from "./useSanPinPrintExport";

export interface UseSanPinJournalLogicParams {
	readonly onAttachPouchToVisit?: ((pouchCode: string, snippet: string) => void) | undefined;
	readonly initialFilterAutoclave?: string | undefined;
}

export function useSanPinJournalLogic({
	onAttachPouchToVisit,
	initialFilterAutoclave = "all",
}: UseSanPinJournalLogicParams = {}) {
	const [period, setPeriod] = useState<SanPinJournalPeriod>("day");
	const [selectedAutoclave, setSelectedAutoclave] = useState<string>(initialFilterAutoclave);
	const [searchQuery, setSearchQuery] = useState("");
	const [directScanCode, setDirectScanCode] = useState("");
	const [showScannerModal, setShowScannerModal] = useState(false);

	const devices = useMemo(() => {
		try {
			return loadSavedClinicAutoclaves();
		} catch {
			return [];
		}
	}, []);

	const { cycles, setCycles, isLoading, fetchCyclesFromDb } = useSanPinCyclesFetch(period);

	const filteredCycles = useMemo(() => {
		return cycles.filter((cyc) => {
			if (selectedAutoclave !== "all" && cyc.autoclaveCode !== selectedAutoclave) {
				return false;
			}
			if (searchQuery.trim()) {
				const query = searchQuery.toLowerCase();
				const matchQuery =
					cyc.pouchCodes.some((code) => code.toLowerCase().includes(query)) ||
					cyc.itemsSummary.toLowerCase().includes(query) ||
					cyc.operatorName.toLowerCase().includes(query) ||
					cyc.autoclaveCode.toLowerCase().includes(query);
				if (!matchQuery) return false;
			}
			return true;
		});
	}, [cycles, selectedAutoclave, searchQuery]);

	const { isAutofilling, handleAutofillNorms, handleQuickBatchNorm, handleQuickPsoNorm } = useSanPinBatchActions(
		devices,
		selectedAutoclave,
		period,
		fetchCyclesFromDb,
		setCycles,
	);

	const { handleQuickChairsideScan, handlePrint257, handleExportCsv } = useSanPinPrintExport(
		selectedAutoclave,
		devices,
		filteredCycles,
		onAttachPouchToVisit,
	);

	const handleScanWrapper = (code: string) => {
		handleQuickChairsideScan(code);
		setDirectScanCode("");
	};

	return {
		period,
		setPeriod,
		selectedAutoclave,
		setSelectedAutoclave,
		searchQuery,
		setSearchQuery,
		directScanCode,
		setDirectScanCode,
		isAutofilling,
		isLoading,
		showScannerModal,
		setShowScannerModal,
		filteredCycles,
		fetchCyclesFromDb,
		handleAutofillNorms,
		handleQuickBatchNorm,
		handleQuickPsoNorm,
		handleQuickChairsideScan: handleScanWrapper,
		handlePrint257,
		handleExportCsv,
	};
}
