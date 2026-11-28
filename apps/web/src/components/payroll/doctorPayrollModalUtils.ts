import {
	generateDoctorPayslipA5Html,
	generateDoctorPayslipMessengerText,
	type DoctorPayrollCalculation,
	type PayrollDoctorProfile,
	type DoctorPayrollSummary,
	type PayrollServiceOrder,
} from "./payrollCatalogData";
import {
	basisPointsFromPercent,
	computeEffectiveDoctorBaseAfterRefund,
	formatKopecksToRubles,
	percentageOfKopecks,
	resolveIdentItemBasis,
	type CashAdvanceAllocationPolicy,
	type DoctorCompletedServiceItem,
	type IdentSalaryModel,
	type Kopecks,
} from "@dental/shared";

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
	const rows = allDoctorsSummaries.map(({ doctor: d, summary: s }) => `${d.id};"${d.name}";"${d.specialtyTitleRu}";"${periodDates.labelRu}";${formatKopecksToRubles(s.totalGrossKopecks)};${formatKopecksToRubles(s.totalLabCostKopecks)};${formatKopecksToRubles(s.totalMaterialCostKopecks)};${formatKopecksToRubles(s.totalNetBaseKopecks)};${d.commissionPercent}%;${formatKopecksToRubles(s.doctorAccruedKopecks)};${formatKopecksToRubles(s.payoutKopecks)}`);
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
	ord: PayrollServiceOrder,
	doctor: PayrollDoctorProfile | null,
	customPercent: number | null,
	identSalaryModel: IdentSalaryModel = "net_proportional_discount",
	cashAdvancePolicy: CashAdvanceAllocationPolicy = "proportional",
): { netBase: number; fee: number } {
	const svcItem: DoctorCompletedServiceItem = {
		id: ord.id,
		dateIso: ord.dateIso,
		patientName: ord.patientName,
		medicalCardNumber: ord.medicalCardNumber,
		serviceNameRu: ord.serviceNameRu,
		category: ord.category,
		grossRevenueKop: ord.grossKopecks,
		...(ord.listPriceKopecks !== undefined ? { listPriceKop: ord.listPriceKopecks } : {}),
		...(ord.discountKopecks !== undefined ? { discountKop: ord.discountKopecks } : {}),
		...(ord.salaryPriceKopecks !== undefined ? { salaryPriceKop: ord.salaryPriceKopecks } : {}),
		labCostKop: ord.labCostKopecks,
		materialCostKop: ord.materialCostKopecks,
		isPaid: ord.isPaid54Fz,
		...(ord.paidKopecks !== undefined ? { paidAmountKop: ord.paidKopecks, actuallyPaidGrossKop: ord.paidKopecks } : {}),
	};
	const basis = resolveIdentItemBasis(svcItem, identSalaryModel, cashAdvancePolicy);
	if (!basis.shouldInclude) {
		return { netBase: 0, fee: 0 };
	}
	const effectiveGrossKop = computeEffectiveDoctorBaseAfterRefund({
		item: svcItem,
		identSalaryModel,
		cashAdvancePolicy,
		salaryPriceKop: basis.salaryBaseConfiguredKop,
		actualPaidKop: basis.actualPaidKop,
		refundKop: 0,
	});
	const netBase = Math.max(0, effectiveGrossKop - ord.labCostKopecks - ord.materialCostKopecks);
	const catRate = doctor?.categoryRates?.[ord.category];
	const pct = customPercent ?? catRate ?? doctor?.commissionPercent ?? 25;
	const fee =
		doctor?.payoutModel === "chair_rental"
			? netBase
			: percentageOfKopecks(netBase as Kopecks, basisPointsFromPercent(pct));
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
