import type { DoctorPayrollResult } from "@dental/shared/payroll";
import { kopecksToRubles, percentageOfKopecks, toExactKopecks } from "@dental/shared";

/**
 * Generates clean formatted text for instant messenger dispatch (WhatsApp / Telegram).
 * Adheres strictly to Mandate 8d (Zero cartoon emojis, clean typography with bullets and dividers).
 */
export function generateDoctorPayslipMessengerText(
	payrollResult: DoctorPayrollResult,
	clinicName: string = "Стоматологическая клиника"
): string {
	const isChairRental = payrollResult.payoutModel === "chair_rental";
	const grossRub = kopecksToRubles(payrollResult.totalGrossRevenueKop).toLocaleString("ru-RU", { minimumFractionDigits: 2 });
	const labRub = kopecksToRubles(payrollResult.totalLabDeductionsKop).toLocaleString("ru-RU", { minimumFractionDigits: 2 });
	const matRub = kopecksToRubles(payrollResult.totalMaterialDeductionsKop).toLocaleString("ru-RU", { minimumFractionDigits: 2 });
	const netBaseRub = kopecksToRubles(payrollResult.totalNetBaseKop).toLocaleString("ru-RU", { minimumFractionDigits: 2 });
	const netToDocRub = kopecksToRubles(payrollResult.netPayoutToDoctorKop).toLocaleString("ru-RU", { minimumFractionDigits: 2 });
	const isSelfEmployed = payrollResult.taxRegime === "self_employed";

	const lines: string[] = [
		`[Расчетный листок]`,
		`РАСЧЕТНЫЙ ЛИСТОК ВРАЧА`,
		`Расчетный листок врача: ${payrollResult.doctorName}`,
		`Клиника: ${clinicName}`,
		`Сотрудник: ${payrollResult.doctorName}`,
		`Специальность: ${payrollResult.specialtyTitleRu}`,
		`Период: ${payrollResult.periodLabelRu}`,
		`─────────────────────────────────`,
		`• Кассовая выручка: ${grossRub} ₽ (${payrollResult.serviceCount} услуг)`,
	];

	if (isChairRental && (payrollResult.chairRentalKop ?? 0) > 0) {
		const rentalRub = kopecksToRubles(payrollResult.chairRentalKop ?? 0).toLocaleString("ru-RU", { minimumFractionDigits: 2 });
		lines.push(`• Аренда стоматологического кресла: -${rentalRub} ₽`);
	}

	if (payrollResult.totalLabDeductionsKop > 0) {
		lines.push(`• ЗТЛ: -${labRub} ₽`);
	}
	if (payrollResult.totalMaterialDeductionsKop > 0) {
		lines.push(`• Материалы: -${matRub} ₽`);
	}
	if (payrollResult.totalRefundClawbackKop > 0) {
		const clawbackRub = kopecksToRubles(payrollResult.totalRefundClawbackKop).toLocaleString("ru-RU", { minimumFractionDigits: 2 });
		lines.push(`• Сторно возвратов пациентам: -${clawbackRub} ₽`);
	}

	lines.push(`─────────────────────────────────`);

	if (isChairRental) {
		lines.push(`• Чистый доход врача (100%): ${netBaseRub} ₽`);
	} else {
		const commRub = kopecksToRubles(payrollResult.earnedBaseCommissionKop).toLocaleString("ru-RU", { minimumFractionDigits: 2 });
		lines.push(`• Начислено по ставке (${payrollResult.baseCommissionPercent}%): ${commRub} ₽`);
		if (payrollResult.kpiBonusEarnedKop > 0) {
			const kpiRub = kopecksToRubles(payrollResult.kpiBonusEarnedKop).toLocaleString("ru-RU", { minimumFractionDigits: 2 });
			lines.push(`• KPI Премия (+${payrollResult.kpiBonusPercent}%): ${kpiRub} ₽`);
		}
	}

	if (isSelfEmployed) {
		const npd6Kop = payrollResult.npd6TaxKop ?? percentageOfKopecks(toExactKopecks(payrollResult.netPayoutToDoctorKop), 600);
		const npdRub = kopecksToRubles(npd6Kop).toLocaleString("ru-RU", { minimumFractionDigits: 2 });
		lines.push(`• Налог НПД (6%): ${npdRub} ₽ (чек «Мой налог»)`);
	} else {
		const effectiveNdfl = kopecksToRubles(payrollResult.ndflTaxKop ?? payrollResult.ndfl13TaxKop);
		lines.push(`• Удержан НДФЛ: -${effectiveNdfl.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽`);
	}

	lines.push(`─────────────────────────────────`);
	lines.push(`Итого к выплате: ${netToDocRub} ₽`);

	if ((payrollResult.advancePayoutKop ?? 0) > 0) {
		const advanceRub = kopecksToRubles(payrollResult.advancePayoutKop ?? 0).toLocaleString("ru-RU", { minimumFractionDigits: 2 });
		const mainRub = kopecksToRubles(payrollResult.mainPayoutKop ?? (payrollResult.netPayoutToDoctorKop - (payrollResult.advancePayoutKop ?? 0))).toLocaleString("ru-RU", { minimumFractionDigits: 2 });
		lines.push(`• Выплаченный аванс: -${advanceRub} ₽`);
		lines.push(`• ОСТАТОК К ПЕРЕЧИСЛЕНИЮ: ${mainRub} ₽`);
	}

	return lines.join("\n");
}
