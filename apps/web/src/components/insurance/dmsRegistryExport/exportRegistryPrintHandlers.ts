/**
 * exportRegistryPrintHandlers.ts — Формирование и печать двустороннего акта и Акта МЭЭ
 */

import { showToast } from "../../GlobalToast.js";
import {
	generateBilateralAcceptanceActHtml,
	generateMeeActHtml,
	type DmsRegistryServiceRecord,
	type DmsRegistrySummary,
} from "../insuranceMath.js";
import type { ClinicLegalInfo } from "./types.js";

export function handlePrintRegistryAct(
	records: readonly DmsRegistryServiceRecord[],
	summary: DmsRegistrySummary,
	clinic: ClinicLegalInfo,
	insurerName: string,
	contractNumber: string,
	contractDate: string,
	representative: string,
	actNumber: string,
	actDate: string,
) {
	const actHtml = generateBilateralAcceptanceActHtml({
		records,
		summary,
		clinicInfo: clinic,
		insurerInfo: {
			name: insurerName === "all" ? "Страховая компания ДМС" : insurerName,
			contractNumber,
			contractDate,
			representative,
		},
		actNumber,
		actDate,
	});
	const printWin = window.open("", "_blank");
	if (printWin) {
		printWin.document.open();
		printWin.document.write(actHtml);
		printWin.document.close();
		printWin.focus();
		setTimeout(() => { printWin.print(); }, 350);
	} else {
		showToast("Разрешите всплывающие окна для печати акта", "warning");
	}
}

export function handlePrintRegistryMeeAct(
	records: readonly DmsRegistryServiceRecord[],
	summary: DmsRegistrySummary,
	clinic: ClinicLegalInfo,
	insurerName: string,
	contractNumber: string,
	contractDate: string,
	representative: string,
	actNumber: string,
	actDate: string,
) {
	if (records.length === 0) {
		showToast("Нет записей для формирования Акта МЭЭ", "warning");
		return;
	}
	const meeHtml = generateMeeActHtml({
		records,
		summary,
		clinicInfo: clinic,
		insurerInfo: {
			name: insurerName === "all" ? "Страховая компания ДМС" : insurerName,
			contractNumber,
			contractDate,
			representative,
		},
		actNumber: `МЭЭ-${actNumber.replace("АКТ-", "")}`,
		actDate,
		expertDoctorName: representative || "Врач-эксперт страховой компании",
	});
	const printWin = window.open("", "_blank");
	if (printWin) {
		printWin.document.open();
		printWin.document.write(meeHtml);
		printWin.document.close();
		printWin.focus();
		setTimeout(() => { printWin.print(); }, 350);
	} else {
		showToast("Разрешите всплывающие окна для печати акта МЭЭ", "warning");
	}
}
