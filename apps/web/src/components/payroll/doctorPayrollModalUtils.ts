import {
	generateDoctorPayslipA5Html,
	generateDoctorPayslipMessengerText,
	type DoctorPayrollCalculation,
	type PayrollDoctorProfile,
	type DoctorPayrollSummary,
} from "./payrollCatalogData";

export function getDefaultPayrollPeriod(): { start: string; end: string } {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, "0");
	const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
	return {
		start: `${year}-${month}-01`,
		end: `${year}-${month}-${String(lastDay).padStart(2, "0")}`,
	};
}

export type PeriodPresetType = "current_month" | "previous_month" | "quarter" | "custom";

export function getDatesForPeriodPreset(preset: PeriodPresetType): { start?: string; end?: string } {
	const now = new Date();
	const y = now.getFullYear();
	const m = now.getMonth();
	if (preset === "current_month") {
		const em = String(m + 1).padStart(2, "0");
		const lastD = String(new Date(y, m + 1, 0).getDate()).padStart(2, "0");
		return { start: `${y}-${em}-01`, end: `${y}-${em}-${lastD}` };
	}
	if (preset === "previous_month") {
		const prev = new Date(y, m - 1, 1);
		const py = prev.getFullYear();
		const pm = String(prev.getMonth() + 1).padStart(2, "0");
		const lastD = String(new Date(py, prev.getMonth() + 1, 0).getDate()).padStart(2, "0");
		return { start: `${py}-${pm}-01`, end: `${py}-${pm}-${lastD}` };
	}
	if (preset === "quarter") {
		const q = Math.floor(m / 3);
		const sm = String(q * 3 + 1).padStart(2, "0");
		const em = q * 3 + 3;
		const lastD = String(new Date(y, em, 0).getDate()).padStart(2, "0");
		return { start: `${y}-${sm}-01`, end: `${y}-${String(em).padStart(2, "0")}-${lastD}` };
	}
	return {};
}

export function exportDoctorPayrollToCsv(
	allDoctorsSummaries: readonly { doctor: PayrollDoctorProfile; summary: DoctorPayrollSummary }[],
	periodDates: { labelRu: string; startIso: string; endIso: string }
): void {
	const header = "Табельный ID;Врач;Специальность;Период;Оплата приёма (руб);Вычет Лаб (руб);Вычет Мат (руб);Чистая база (руб);Ставка %;Начислено (руб);К выплате (руб)\n";
	const rows = allDoctorsSummaries.map(({ doctor: d, summary: s }) => `${d.id};"${d.name}";"${d.specialtyTitleRu}";"${periodDates.labelRu}";${(s.totalGrossKopecks / 100).toFixed(2)};${(s.totalLabCostKopecks / 100).toFixed(2)};${(s.totalMaterialCostKopecks / 100).toFixed(2)};${(s.totalNetBaseKopecks / 100).toFixed(2)};${d.commissionPercent}%;${(s.doctorAccruedKopecks / 100).toFixed(2)};${(s.payoutKopecks / 100).toFixed(2)}`);
	const blob = new Blob(["\uFEFF" + header + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = `Ведомость_зарплаты_${periodDates.startIso}_${periodDates.endIso}.csv`;
	a.click();
	URL.revokeObjectURL(url);
}

export function printDoctorPayslip(
	calc: DoctorPayrollCalculation,
	doctor: PayrollDoctorProfile,
	clinicName: string
): void {
	const html = generateDoctorPayslipA5Html(calc, doctor, clinicName);
	const win = window.open("", "_blank");
	if (win) {
		win.document.write(html);
		win.document.close();
		win.focus();
		setTimeout(() => win.print(), 250);
	}
}

export function copyPayslipToClipboard(
	calc: DoctorPayrollCalculation,
	doctor: PayrollDoctorProfile,
	clinicName: string
): boolean {
	if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
		navigator.clipboard.writeText(generateDoctorPayslipMessengerText(calc, doctor, clinicName));
		return true;
	}
	return false;
}

export function calculateOrderNetAndFee(
	ord: { grossKopecks: number; labCostKopecks: number; materialCostKopecks: number },
	doctor: PayrollDoctorProfile | null,
	customPercent: number | null
): { netBase: number; fee: number } {
	const netBase = Math.max(0, ord.grossKopecks - ord.labCostKopecks - ord.materialCostKopecks);
	const fee = doctor?.payoutModel === "chair_rental" ? netBase : Math.round((netBase * (customPercent ?? doctor?.commissionPercent ?? 25)) / 100);
	return { netBase, fee };
}

export const EMPTY_DOCTOR_PAYROLL_SUMMARY: DoctorPayrollSummary = {
	doctorId: "", doctorName: "Врач не выбран", schemeType: "net_percentage",
	totalGrossKopecks: 0, totalLabCostKopecks: 0, totalMaterialCostKopecks: 0, totalNetBaseKopecks: 0,
	doctorAccruedKopecks: 0, chairRentalKopecks: 0, advanceKopecks: 0, ndfl13TaxKopecks: 0,
	payoutKopecks: 0, payoutStatus: "accrued", servicesCount: 0, minimumGuaranteeApplied: false,
};

export function buildDoctorPayrollCalculation(
	summary: DoctorPayrollSummary,
	selectedDoctor: PayrollDoctorProfile | null,
	periodDates: { startIso: string; endIso: string },
	customPercent: number | null
): DoctorPayrollCalculation {
	return {
		doctorId: summary.doctorId,
		doctorName: summary.doctorName,
		specialtyTitleRu: selectedDoctor?.specialtyTitleRu ?? "Врач-стоматолог",
		periodLabelRu: `${periodDates.startIso} — ${periodDates.endIso}`,
		totalGrossKopecks: summary.totalGrossKopecks,
		totalLabCostKopecks: summary.totalLabCostKopecks,
		totalMaterialCostKopecks: summary.totalMaterialCostKopecks,
		totalNetBaseKopecks: summary.totalNetBaseKopecks,
		commissionPercent: customPercent ?? selectedDoctor?.commissionPercent ?? 25,
		earnedDoctorKopecks: summary.doctorAccruedKopecks,
		chairRentalKopecks: summary.chairRentalKopecks,
		advanceKopecks: summary.advanceKopecks,
		minimumGuaranteeApplied: summary.minimumGuaranteeApplied,
		grossPayoutBeforeTaxKop: Math.max(summary.doctorAccruedKopecks, (summary.minimumGuaranteeApplied && selectedDoctor) ? selectedDoctor.minGuaranteeMonthlyKop : 0),
		ndfl13TaxKopecks: summary.ndfl13TaxKopecks,
		netPayoutToDoctorKopecks: summary.payoutKopecks,
		servicesCount: summary.servicesCount,
		isChairRental: selectedDoctor?.payoutModel === "chair_rental",
		payoutStatus: summary.payoutStatus,
	};
}
