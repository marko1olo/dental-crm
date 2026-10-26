import { kopecksToRubles } from "./patientWebappCrypto";
import type {
	PatientAppointmentItem,
	PatientInvoiceBillItem,
	PatientTreatmentPlanProfile,
	BeforeAfterComparisonPair,
} from "./patientWebappPlanTypes";
import type {
	SignableStatutoryDocument,
	PatientWebappAggregatedProfile,
} from "./patientWebappSigningTypes";

export { calculatePlanFinancials } from "./patientWebappFinancials";

export function assemblePatientWebappProfile(params: {
	patientId: string;
	clinicName?: string;
	clinicAddress?: string;
	clinicPhone?: string;
	clinicInn?: string;
	fullName: string;
	phone: string;
	birthDate: string;
	cardNumber: string;
	curatingDoctor?: string;
	appointments?: readonly PatientAppointmentItem[];
	treatmentPlan?: PatientTreatmentPlanProfile | null;
	invoices?: readonly PatientInvoiceBillItem[];
	beforeAfterGalleries?: readonly BeforeAfterComparisonPair[];
	signableDocuments?: readonly SignableStatutoryDocument[];
	loyaltyBonusBalance?: number;
	loyaltyCashbackRub?: number;
	currentDateIso?: string;
}): PatientWebappAggregatedProfile {
	const nowIso = params.currentDateIso || new Date().toISOString().slice(0, 10);
	const rawAppointments = params.appointments || [];

	const upcomingAppointments = rawAppointments
		.filter((a) => (a.status === "scheduled" || a.status === "confirmed") && a.dateIso >= nowIso)
		.sort((a, b) => a.dateIso.localeCompare(b.dateIso) || a.timeRu.localeCompare(b.timeRu));

	const pastAppointments = rawAppointments
		.filter((a) => a.status === "completed" || a.dateIso < nowIso)
		.sort((a, b) => b.dateIso.localeCompare(a.dateIso));

	const nextAppointment = upcomingAppointments[0];

	const rawInvoices = params.invoices || [];
	let totalDebtKopecks = 0;
	for (const inv of rawInvoices) {
		if (inv.status === "unpaid" || inv.status === "partially_paid") {
			totalDebtKopecks += Math.max(0, inv.remainingAmountKopecks);
		}
	}

	return {
		patientId: params.patientId,
		clinicId: "CLINIC-MAIN",
		clinicName: params.clinicName || 'ООО "Стоматологическая клиника ДЕНТЕ"',
		clinicAddress: params.clinicAddress || "г. Москва, ул. Стоматологическая, д. 10",
		clinicPhone: params.clinicPhone || "+7 (495) 789-01-23",
		clinicInn: params.clinicInn || "",
		fullName: params.fullName,
		phone: params.phone,
		birthDate: params.birthDate,
		cardNumber: params.cardNumber,
		curatingDoctor: params.curatingDoctor || "Д-р Смирнова Анна Сергеевна",
		loyaltyBonusBalance: params.loyaltyBonusBalance ?? 5000,
		loyaltyCashbackRub: params.loyaltyCashbackRub ?? 1250,
		upcomingAppointments,
		pastAppointments,
		activeTreatmentPlan: params.treatmentPlan || null,
		invoices: rawInvoices,
		beforeAfterGalleries: params.beforeAfterGalleries || [],
		signableDocuments: params.signableDocuments || [],
		totalDebtKopecks,
		totalDebtRub: kopecksToRubles(totalDebtKopecks),
		nextAppointment,
	};
}
