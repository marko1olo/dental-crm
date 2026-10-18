import { useMemo } from "react";
import type { DoctorCompletedServiceItem } from "@dental/shared/payroll";
import { buildShiftCompletedServices } from "./buildShiftCompletedServices";

export interface UseShiftFinancialSummaryOptions {
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	readonly todayAppointments: readonly any[];
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	readonly payments?: readonly any[] | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	readonly staffById: Map<string, any>;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	readonly patientsById: Map<string, any>;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	readonly currentPatient: any;
	readonly shiftActiveDoctorId?: string | undefined;
	readonly todayIso: string;
	readonly doctorCommissionPct?: number | undefined;
}

export interface ShiftFinancialSummary {
	readonly totalRevenueRub: number;
	readonly plannedRevenueRub: number;
	readonly doctorCommissionPct: number;
	readonly estimatedDoctorPayoutRub: number;
	readonly directPaymentsRub: number;
	readonly appointmentBilledRub: number;
	readonly shiftCompletedServices: readonly DoctorCompletedServiceItem[];
	readonly totalLabCostRub: number;
	readonly totalMaterialCostRub: number;
	readonly netRevenueAfterDeductionsRub: number;
	readonly cashBreakdown: { readonly cashRub: number; readonly cardRub: number; readonly sbpRub: number; readonly depositRub: number };
}

export function useShiftFinancialSummary({
	todayAppointments, payments = [], staffById, patientsById, currentPatient,
	shiftActiveDoctorId, todayIso, doctorCommissionPct = 30,
}: UseShiftFinancialSummaryOptions): ShiftFinancialSummary {
	const completed = useMemo(() => todayAppointments.filter((app: any) => ["completed", "done"].includes(String(app.status || "").toLowerCase())), [todayAppointments]);
	const todayPayments = useMemo(() => (payments ?? []).filter((p: any) => (p.status === "paid" || p.status === "completed") && String(p.paidAt || p.createdAt || "").startsWith(todayIso)), [payments, todayIso]);
	const directPaymentsRub = useMemo(() => todayPayments.reduce((sum: number, p: any) => sum + (Number(p.amountRub) || 0), 0), [todayPayments]);

	const cashBreakdown = useMemo(() => {
		let cash = 0; let card = 0; let sbp = 0; let deposit = 0;
		for (const p of todayPayments) {
			const amt = Number(p.amountRub) || 0;
			const m = String(p.paymentMethod || p.method || "").toLowerCase();
			if (["cash", "наличные"].includes(m)) cash += amt;
			else if (["sbp", "сбп", "qr"].includes(m)) sbp += amt;
			else if (["deposit", "депозит", "advance", "аванс"].includes(m)) deposit += amt;
			else card += amt;
		}
		return { cashRub: cash, cardRub: card, sbpRub: sbp, depositRub: deposit };
	}, [todayPayments]);

	const appointmentBilledRub = useMemo(() => completed.reduce((sum: number, app: any) => sum + (Number(app.priceRub || app.costRub || app.totalRub || app.amountRub) || 0), 0), [completed]);
	const plannedRevenueRub = useMemo(() => todayAppointments.reduce((sum: number, app: any) => sum + (Number(app.priceRub || app.costRub || app.totalRub || app.amountRub) || 0), 0), [todayAppointments]);
	const totalRevenueRub = useMemo(() => Math.max(0, directPaymentsRub > 0 ? directPaymentsRub : appointmentBilledRub), [directPaymentsRub, appointmentBilledRub]);
	const estimatedDoctorPayoutRub = useMemo(() => Math.round((totalRevenueRub * doctorCommissionPct) / 100), [totalRevenueRub, doctorCommissionPct]);
	const shiftCompletedServices = useMemo(() => buildShiftCompletedServices({ todayAppointments, patientsById, currentPatient, shiftActiveDoctorId, todayIso, staffById }), [todayAppointments, patientsById, currentPatient, shiftActiveDoctorId, todayIso, staffById]);
	const totalLabCostRub = useMemo(() => Math.round(shiftCompletedServices.reduce((sum, item) => sum + item.labCostKop, 0) / 100), [shiftCompletedServices]);
	const totalMaterialCostRub = useMemo(() => Math.round(shiftCompletedServices.reduce((sum, item) => sum + item.materialCostKop, 0) / 100), [shiftCompletedServices]);
	const netRevenueAfterDeductionsRub = useMemo(() => Math.max(0, totalRevenueRub - totalLabCostRub - totalMaterialCostRub), [totalRevenueRub, totalLabCostRub, totalMaterialCostRub]);

	return {
		totalRevenueRub, plannedRevenueRub, doctorCommissionPct, estimatedDoctorPayoutRub,
		directPaymentsRub, appointmentBilledRub, shiftCompletedServices, totalLabCostRub,
		totalMaterialCostRub, netRevenueAfterDeductionsRub, cashBreakdown,
	};
}
