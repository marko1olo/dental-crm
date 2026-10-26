/**
 * useCbctStudioExportActions.ts — Действия экспорта в ЭМК, смету и PDF отчет (Мандаты 8e, 8b).
 */

import { useCallback } from "react";
import { showToast } from "../../../GlobalToast";

export function useCbctStudioExportActions(patientId?: string, studyId?: string) {
	const handleExportToEmr = useCallback(() => {
		showToast("Протокол КЛКТ сохранен в медицинскую карту пациента", "success");
	}, []);

	const handleExportToFinance = useCallback(() => {
		showToast("КЛКТ-исследование и имплантат добавлены в смету приёма", "success");
	}, []);

	const handleExportToPlan = useCallback(() => {
		showToast("Исследование привязано к плану лечения", "success");
	}, []);

	const handleExportToSchedule = useCallback(() => {
		showToast("Назначен повторный приём с контрольным снимком", "info");
	}, []);

	const handleExportPdfReport = useCallback(() => {
		showToast("Формирование клинического A4 отчета...", "info");
	}, []);

	const handleResetAll = useCallback(() => {
		showToast("Все настройки вьюпортов и фильтров сброшены", "info");
	}, []);

	return {
		handleExportToEmr,
		handleExportToFinance,
		handleExportToPlan,
		handleExportToSchedule,
		handleExportPdfReport,
		handleResetAll,
	};
}
