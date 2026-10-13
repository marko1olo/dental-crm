import type {
	Appointment,
	InsuranceContract,
	Patient,
	PatientInsight,
	StaffMember,
	TreatmentPlanItem,
	TreatmentPlanScenario,
} from "@dental/shared";
import type {
	PatientActiveTreatmentPlanSummary,
	PatientFinancialSummary,
} from "../telephonyTypes";
import type {
	TelephonyCallerCard,
} from "./telephonyClinicalTypes";
import { resolvePatientCategory } from "@dental/shared";
import { resolvePatientSomaticAlerts } from "./telephonyClinicalSomaticAlerts";
import {
	resolvePatientLastVisit,
	resolvePatientNextVisit,
	resolvePatientUpcomingAppointment,
} from "./telephonyClinicalVisitResolvers";

export * from "./telephonyMessagingEngine";
export * from "./telephonyClinicalSomaticAlerts";
export * from "./telephonyClinicalVisitResolvers";

/**
 * Computes structured financial metrics for a patient.
 */
export function calculatePatientFinancialStatus(
	patient: Patient | null | undefined,
	insight?: PatientInsight | null | undefined,
	insuranceContracts?: InsuranceContract[] | null | undefined,
): PatientFinancialSummary {
	if (!patient) {
		return {
			balanceRub: 0,
			formattedBalance: "0 ₽",
			hasDebt: false,
			debtRub: 0,
			formattedDebt: "0 ₽",
			hasInsurance: false,
			insuranceName: null,
			policyNumber: null,
		};
	}

	const balanceRub = Number(patient.balanceRub) || 0;
	const insightDue = Number(insight?.balanceDueRub) || 0;
	const debtRub =
		balanceRub < 0 ? Math.abs(balanceRub) : insightDue > 0 ? insightDue : 0;
	const hasDebt = balanceRub < 0 || insightDue > 0;

	const formatRub = (amount: number) =>
		new Intl.NumberFormat("ru-RU", {
			style: "currency",
			currency: "RUB",
			maximumFractionDigits: 0,
		}).format(amount);

	const formattedBalance =
		balanceRub > 0 ? `+${formatRub(balanceRub)}` : formatRub(balanceRub);
	const formattedDebt = formatRub(debtRub);

	const policyNumber =
		patient.administrativeProfile?.insurancePolicyNumber || null;

	let insuranceName: string | null = null;
	if (insuranceContracts && insuranceContracts.length > 0) {
		const activeContract = insuranceContracts.find((c) => c.isActive);
		if (activeContract) {
			insuranceName = activeContract.companyName;
		}
	}

	const hasInsurance = Boolean(policyNumber || insuranceName);

	return {
		balanceRub,
		formattedBalance,
		hasDebt,
		debtRub,
		formattedDebt,
		hasInsurance,
		insuranceName,
		policyNumber,
	};
}

/**
 * Resolves active treatment plan, progress, and financial totals for a patient.
 */
export function resolvePatientActiveTreatmentPlan(
	patientId: string | null | undefined,
	treatmentPlanItems?: TreatmentPlanItem[] | null | undefined,
	treatmentPlanScenarios?: TreatmentPlanScenario[] | null | undefined,
): PatientActiveTreatmentPlanSummary {
	if (!patientId || (!treatmentPlanItems && !treatmentPlanScenarios)) {
		return {
			hasActivePlan: false,
			planTitle: null,
			totalCostRub: 0,
			formattedTotalCost: "0 ₽",
			itemsCount: 0,
			completedCount: 0,
			pendingCount: 0,
			progressPercent: 0,
			nextService: null,
		};
	}

	const patientItems = (treatmentPlanItems || []).filter(
		(i) => i.patientId === patientId,
	);
	const patientScenarios = (treatmentPlanScenarios || []).filter(
		(s) => s.patientId === patientId,
	);

	if (patientItems.length === 0 && patientScenarios.length === 0) {
		return {
			hasActivePlan: false,
			planTitle: null,
			totalCostRub: 0,
			formattedTotalCost: "0 ₽",
			itemsCount: 0,
			completedCount: 0,
			pendingCount: 0,
			progressPercent: 0,
			nextService: null,
		};
	}

	const activeScenario = patientScenarios[0] || null;
	const totalCostRub =
		activeScenario && typeof activeScenario.totalRub === "number" && activeScenario.totalRub > 0
			? activeScenario.totalRub
			: patientItems.reduce((acc, it) => {
					const unit = Number(it.unitPriceRub) || 0;
					const discount = Number(it.discountRub) || 0;
					const qty = Number(it.quantity) || 1;
					const cost = Math.max(0, (unit - discount) * qty);
					return acc + cost;
				}, 0);

	const completedCount = patientItems.filter((i) => i.status === "completed").length;
	const pendingCount = patientItems.filter(
		(i) => (i.status as string) === "planned" || i.status === "proposed" || i.status === "in_progress" || i.status === "approved",
	).length;
	const totalCount = patientItems.length;
	const progressPercent =
		totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

	const firstPending = patientItems.find(
		(i) => (i.status as string) === "planned" || i.status === "proposed" || i.status === "in_progress" || i.status === "approved",
	);
	const nextService = firstPending ? firstPending.snapshotServiceName : null;

	const formattedTotalCost = new Intl.NumberFormat("ru-RU", {
		style: "currency",
		currency: "RUB",
		maximumFractionDigits: 0,
	}).format(totalCostRub);

	return {
		hasActivePlan: true,
		planTitle: activeScenario?.title || "Комплексный план лечения",
		totalCostRub,
		formattedTotalCost,
		itemsCount: totalCount,
		completedCount,
		pendingCount,
		progressPercent,
		nextService,
	};
}

/**
 * Builds a composite clinical caller card for an incoming call from phone and patient data.
 */
export function buildTelephonyCallerCard(params: {
	phone: string;
	patient: Patient | null | undefined;
	appointments?: Appointment[] | null | undefined;
	staff?: StaffMember[] | null | undefined;
	insight?: PatientInsight | null | undefined;
	insuranceContracts?: InsuranceContract[] | null | undefined;
	treatmentPlanItems?: TreatmentPlanItem[] | null | undefined;
	treatmentPlanScenarios?: TreatmentPlanScenario[] | null | undefined;
	nowIso?: string;
}): TelephonyCallerCard {
	const {
		phone,
		patient,
		appointments,
		staff,
		insight,
		insuranceContracts,
		treatmentPlanItems,
		treatmentPlanScenarios,
		nowIso = new Date().toISOString(),
	} = params;

	const patientId = patient?.id ?? null;
	const patientName = patient?.fullName ?? "Неизвестный номер";
	const category = resolvePatientCategory(patient);

	const financial = calculatePatientFinancialStatus(patient, insight, insuranceContracts);
	const lastVisit = resolvePatientLastVisit(patientId, appointments, staff, nowIso);
	const upcomingAppointment = resolvePatientUpcomingAppointment(patientId, appointments, staff, nowIso);
	const nextVisit = resolvePatientNextVisit(patientId, appointments, staff, nowIso);
	const activePlan = resolvePatientActiveTreatmentPlan(patientId, treatmentPlanItems, treatmentPlanScenarios);
	const somaticAlerts = resolvePatientSomaticAlerts(patient, insight);

	return {
		patientId,
		patientName,
		phone,
		category,
		financial,
		lastVisit,
		upcomingAppointment,
		nextVisit,
		activePlan,
		somaticAlerts,
	};
}
