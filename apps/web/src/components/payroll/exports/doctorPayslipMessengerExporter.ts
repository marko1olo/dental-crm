import type { DoctorPayrollResult } from "@dental/shared/payroll";

/**
 * Generates clean formatted text for instant messenger dispatch (WhatsApp / Telegram).
 * Adheres strictly to Mandate 8d (Zero cartoon emojis, clean typography with bullets and dividers).
 */
export function generateDoctorPayslipMessengerText(
	payrollResult: DoctorPayrollResult,
	clinicName: string = "ООО «Денте Стоматология»"
): string {
	const isChairRental = payrollResult.payoutModel === "chair_rental";
	const grossRub = (payrollResult.totalGrossRevenueKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 });
	const labRub = (payrollResult.totalLabDeductionsKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 });
	const matRub = (payrollResult.totalMaterialDeductionsKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 });
	const netBaseRub = (payrollResult.totalNetBaseKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 });
	const netToDocRub = (payrollResult.netPayoutToDoctorKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 });
	const isSelfEmployed = payrollResult.taxRegime === "self_employed";

	const lines: string[] = [
		`РАСЧЕТНЫЙ ЛИСТОК ВРАЧА`,
		`Клиника: ${clinicName}`,
		`Сотрудник: ${payrollResult.doctorName}`,
		`Специальность: ${payrollResult.specialtyTitleRu}`,
		`Период: ${payrollResult.periodLabelRu}`,
		`─────────────────────────────────`,
		`• Выручка от приёмов: ${grossRub} ₽ (${payrollResult.serviceCount} услуг)`,
	];

	if (isChairRental && (payrollResult.chairRentalKop ?? 0) > 0) {
		const rentalRub = ((payrollResult.chairRentalKop ?? 0) / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 });
		lines.push(`• Аренда стоматологического кресла: -${rentalRub} ₽`);
	}

	if (payrollResult.totalLabDeductionsKop > 0) {
		lines.push(`• Удержание ЗТЛ (лаборатория): -${labRub} ₽`);
	}
	if (payrollResult.totalMaterialDeductionsKop > 0) {
		lines.push(`• Удержание за материалы: -${matRub} ₽`);
	}
	if (payrollResult.totalRefundClawbackKop > 0) {
		const clawbackRub = (payrollResult.totalRefundClawbackKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 });
		lines.push(`• Сторно возвратов пациентам: -${clawbackRub} ₽`);
	}

	lines.push(`─────────────────────────────────`);

	if (isChairRental) {
		lines.push(`• Чистый доход врача (100%): ${netBaseRub} ₽`);
	} else {
		const commRub = (payrollResult.earnedBaseCommissionKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 });
		lines.push(`• Начислено по ставке (${payrollResult.baseCommissionPercent}%): ${commRub} ₽`);
		if (payrollResult.kpiBonusEarnedKop > 0) {
			const kpiRub = (payrollResult.kpiBonusEarnedKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 });
			lines.push(`• KPI Премия (+${payrollResult.kpiBonusPercent}%): ${kpiRub} ₽`);
		}
	}

	if (isSelfEmployed) {
		const npdRub = ((payrollResult.npd6TaxKop ?? Math.round((payrollResult.netPayoutToDoctorKop * 6) / 100)) / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 });
		lines.push(`• Налог НПД (6%): ${npdRub} ₽ (чек «Мой налог»)`);
	} else {
		const effectiveNdfl = (payrollResult.ndflTaxKop ?? payrollResult.ndfl13TaxKop) / 100;
		lines.push(`• Удержан НДФЛ: -${effectiveNdfl.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽`);
	}

	lines.push(`─────────────────────────────────`);
	lines.push(`ИТОГО К ВЫПЛАТЕ: ${netToDocRub} ₽`);

	if ((payrollResult.advancePayoutKop ?? 0) > 0) {
		const advanceRub = ((payrollResult.advancePayoutKop ?? 0) / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 });
		const mainRub = ((payrollResult.mainPayoutKop ?? (payrollResult.netPayoutToDoctorKop - (payrollResult.advancePayoutKop ?? 0))) / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 });
		lines.push(`• Выплаченный аванс: -${advanceRub} ₽`);
		lines.push(`• ОСТАТОК К ПЕРЕЧИСЛЕНИЮ: ${mainRub} ₽`);
	}

	return lines.join("\n");
}
