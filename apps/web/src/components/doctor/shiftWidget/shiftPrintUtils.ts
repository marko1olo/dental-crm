/**
 * shiftPrintUtils.ts — Формирование и отправка на печать расчетного листка за смену.
 * Mandate 8x: полное исключение канцелярита Т-51.
 * Mandate 8b: строго <= 120 строк на файл.
 */

import { generateDoctorEarningsPayslipHtml } from "@dental/shared";
import { showToast } from "../../GlobalToast.js";
import type { ChairsideShiftEarningsSummary } from "../doctorShiftEarnings.js";

export function printShiftPayslip(
	summary: ChairsideShiftEarningsSummary,
	customPrintHandler?: (() => void) | undefined,
): void {
	if (customPrintHandler) {
		customPrintHandler();
		return;
	}

	try {
		const html = generateDoctorEarningsPayslipHtml({
			organizationName: "ООО «ДЕНТЕ»",
			doctorName: summary.doctorName,
			specialtyTitle: "Врач-стоматолог терапевт-ортопед",
			periodFromIso: `${summary.shiftDateIso}T08:00:00.000Z`,
			periodToIso: `${summary.shiftDateIso}T20:00:00.000Z`,
			grossRevenueRub: summary.grossRevenueRub,
			netBaseRevenueRub: summary.netBaseRevenueRub,
			pieceworkAccruedRub: summary.totalEarnedPayoutRub,
			totalAccruedRub: summary.totalEarnedPayoutRub,
			ndflTaxRub: Math.round(summary.totalEarnedPayoutRub * 0.13),
			withheldLabRub: summary.labCostRub,
			withheldMaterialRub: summary.materialsCostRub,
			overheadConsumablesCoveredRub: 1500,
			netPayoutRub: Math.round(summary.totalEarnedPayoutRub * 0.87),
		});

		const printWin = window.open("", "_blank");
		if (printWin) {
			printWin.document.write(html);
			printWin.document.close();
			printWin.focus();
			setTimeout(() => {
				printWin.print();
			}, 250);
		}
		showToast("Расчет зарплаты за смену отправлен на печать", "info");
	} catch (err) {
		showToast("Не удалось открыть окно печати", "error");
	}
}
