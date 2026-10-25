import type { PatientAppointment, PatientInvoiceItem } from "./patientCabinetTypes.js";
import type { PatientCabinetSummary, PatientPersonalCabinetData } from "./patientCabinetProfileTypes.js";
import { calculateCheckupDaysRemaining } from "./patientCabinetFormatters.js";

export function createEmptyPatientCabinetData(
	patientId = "",
	fullName = "Пациент",
	phone = "",
): PatientPersonalCabinetData {
	return {
		patientId,
		fullName,
		phone,
		cardNumber: "",
		curatingDoctor: "Врач-куратор не назначен",
		loyaltyBonusBalance: 0,
		loyaltyTierRu: "Базовый",
		cashbackEarnedRub: 0,
		invoices: [],
		appointments: [],
		treatmentPlans: [],
		warranties: [],
		consents: [],
		familyMembers: [],
		teeth: [],
	};
}

export function calculateCabinetSummary(data: PatientPersonalCabinetData): PatientCabinetSummary {
	const totalInvoices = data.invoices.length;
	const unpaidInvoices = data.invoices.filter((inv) => inv.status === "unpaid" || inv.status === "partially_paid");
	const totalUnpaidKop = unpaidInvoices.reduce((sum, inv) => sum + Math.round((inv.remainingAmountRub || 0) * 100), 0);
	const totalPaidKop = data.invoices.reduce((sum, inv) => sum + Math.round((inv.paidAmountRub || 0) * 100), 0);
	const totalUnpaidAmountRub = totalUnpaidKop / 100;
	const totalPaidAmountRub = totalPaidKop / 100;

	const nowIso = new Date().toISOString();
	const upcomingAppointments = data.appointments.filter(
		(apt) => (apt.status === "scheduled" || apt.status === "confirmed") && apt.dateIso >= nowIso.slice(0, 10),
	);
	const nextAppointment = upcomingAppointments.sort((a, b) => a.dateIso.localeCompare(b.dateIso))[0];

	const activePlans = data.treatmentPlans.filter((p) => p.status === "in_progress");
	const pendingConsents = data.consents.filter((c) => c.status === "pending_signature");
	const activeWarranties = data.warranties.filter((w) => w.status === "active" || w.status === "at_risk");

	let nearestCheckupDate: string | undefined;
	let nearestCheckupDays: number | undefined;

	for (const w of activeWarranties) {
		const checkupCalc = calculateCheckupDaysRemaining(w.nextCheckupDueDateIso);
		if (nearestCheckupDays === undefined || checkupCalc.daysRemaining < nearestCheckupDays) {
			nearestCheckupDays = checkupCalc.daysRemaining;
			nearestCheckupDate = w.nextCheckupDueDateIso;
		}
	}

	return {
		totalInvoicesCount: totalInvoices,
		unpaidInvoicesCount: unpaidInvoices.length,
		totalUnpaidAmountRub,
		totalPaidAmountRub,
		upcomingAppointmentsCount: upcomingAppointments.length,
		nextAppointment,
		activePlansCount: activePlans.length,
		pendingConsentsCount: pendingConsents.length,
		activeWarrantiesCount: activeWarranties.length,
		nextCheckupDueDateIso: nearestCheckupDate,
		nextCheckupDaysRemaining: nearestCheckupDays,
		loyaltyBonusBalance: data.loyaltyBonusBalance,
		cashbackEarnedRub: data.cashbackEarnedRub,
	};
}

export function filterInvoices(
	invoices: readonly PatientInvoiceItem[],
	filter: "all" | "unpaid" | "paid",
): readonly PatientInvoiceItem[] {
	if (filter === "unpaid") {
		return invoices.filter((inv) => inv.status === "unpaid" || inv.status === "partially_paid");
	}
	if (filter === "paid") {
		return invoices.filter((inv) => inv.status === "paid");
	}
	return invoices;
}

export function filterAppointments(
	appointments: readonly PatientAppointment[],
	filter: "upcoming" | "past" | "all",
): readonly PatientAppointment[] {
	if (filter === "upcoming") {
		return appointments.filter(
			(apt) => apt.status === "scheduled" || apt.status === "confirmed" || apt.status === "reschedule_requested",
		);
	}
	if (filter === "past") {
		return appointments.filter((apt) => apt.status === "completed" || apt.status === "cancelled");
	}
	return appointments;
}
