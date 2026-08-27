import { fuzzyMatchPhone, normalizePhoneDigits } from "./formatters.js";
import type {
	PatientFinancialSummary,
	PatientLastVisitSummary,
	PatientNextVisitSummary,
	PatientSomaticAlert,
	PatientUpcomingAppointmentSummary,
} from "./types.js";

export interface TelephonyPatientLike {
	id: string;
	fullName: string;
	phone?: string | null | undefined;
	balanceRub?: number | string | null | undefined;
	notes?: string | null | undefined;
	administrativeProfile?: {
		legalRepresentativePhone?: string | null | undefined;
		insurancePolicyNumber?: string | null | undefined;
	} | null | undefined;
}

export interface TelephonyPatientInsightLike {
	patientId: string;
	balanceDueRub?: number | string | null | undefined;
	clinicalFlags?: string[] | null | undefined;
	riskLevel?: "low" | "medium" | "high" | null | undefined;
	riskReasons?: string[] | null | undefined;
}

export interface TelephonyInsuranceContractLike {
	companyName: string;
	isActive?: boolean | null | undefined;
}

export interface TelephonyAppointmentLike {
	id: string;
	patientId: string;
	startsAt: string;
	endsAt: string;
	status: "planned" | "confirmed" | "completed" | "cancelled";
	doctorUserId?: string | null | undefined;
	reason?: string | null | undefined;
	comment?: string | null | undefined;
}

export interface TelephonyStaffMemberLike {
	id: string;
	fullName: string;
	specialties?: string[] | null | undefined;
}

/**
 * Searches and resolves a patient by phone number against a list of patients using fuzzy matching.
 * Checks primary phone and legal representative phone.
 */
export function resolvePatientFromPhone<T extends TelephonyPatientLike>(
	patientsList: T[] | undefined | null,
	phone: string | null | undefined,
): T | null {
	if (!patientsList || !phone) return null;
	const cleanSearch = normalizePhoneDigits(phone);
	if (cleanSearch.length < 7) return null;

	for (const patient of patientsList) {
		// 1. Match primary patient phone
		if (patient.phone && fuzzyMatchPhone(patient.phone, phone)) {
			return patient;
		}

		// 2. Match legal representative phone in administrative profile
		const repPhone = patient.administrativeProfile?.legalRepresentativePhone;
		if (repPhone && fuzzyMatchPhone(repPhone, phone)) {
			return patient;
		}
	}
	return null;
}

/**
 * Computes structured financial metrics for a patient.
 */
export function calculatePatientFinancialStatus(
	patient: TelephonyPatientLike | null | undefined,
	insight?: TelephonyPatientInsightLike | null | undefined,
	insuranceContracts?: TelephonyInsuranceContractLike[] | null | undefined,
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
	const debtRub = balanceRub < 0 ? Math.abs(balanceRub) : insightDue > 0 ? insightDue : 0;
	const hasDebt = balanceRub < 0 || insightDue > 0;

	const formatRub = (amount: number) =>
		new Intl.NumberFormat("ru-RU", {
			style: "currency",
			currency: "RUB",
			maximumFractionDigits: 0,
		}).format(amount);

	const formattedBalance = balanceRub > 0 ? `+${formatRub(balanceRub)}` : formatRub(balanceRub);
	const formattedDebt = formatRub(debtRub);

	const policyNumber = patient.administrativeProfile?.insurancePolicyNumber || null;

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
 * Resolves the last completed/past visit and attending doctor for a patient.
 */
export function resolvePatientLastVisit(
	patientId: string | null | undefined,
	appointments: TelephonyAppointmentLike[] | null | undefined,
	staff: TelephonyStaffMemberLike[] | null | undefined,
	nowIso = new Date().toISOString(),
): PatientLastVisitSummary {
	if (!patientId || !appointments || appointments.length === 0) {
		return {
			lastVisitDate: null,
			formattedLastVisit: "Первичный приём (визитов нет)",
			doctorName: null,
			doctorSpecialty: null,
			appointmentReason: null,
			isNewPatient: true,
		};
	}

	const patientAppointments = appointments
		.filter((a) => a.patientId === patientId)
		.filter((a) => a.status === "completed" || a.startsAt <= nowIso)
		.sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());

	const latest = patientAppointments[0];
	if (!latest) {
		return {
			lastVisitDate: null,
			formattedLastVisit: "Первичный приём (визитов нет)",
			doctorName: null,
			doctorSpecialty: null,
			appointmentReason: null,
			isNewPatient: true,
		};
	}

	let doctorName: string | null = null;
	let doctorSpecialty: string | null = null;

	if (latest.doctorUserId && staff) {
		const doctor = staff.find((s) => s.id === latest.doctorUserId);
		if (doctor) {
			doctorName = doctor.fullName;
			if (doctor.specialties && doctor.specialties.length > 0) {
				doctorSpecialty = doctor.specialties[0] ?? null;
			}
		}
	}

	const dateObj = new Date(latest.startsAt);
	const formattedLastVisit = new Intl.DateTimeFormat("ru-RU", {
		day: "numeric",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(dateObj);

	return {
		lastVisitDate: latest.startsAt,
		formattedLastVisit,
		doctorName,
		doctorSpecialty,
		appointmentReason: latest.reason || latest.comment || null,
		isNewPatient: false,
	};
}

/**
 * Resolves upcoming future appointment for a patient (for 1-click confirmation trigger).
 */
export function resolvePatientUpcomingAppointment(
	patientId: string | null | undefined,
	appointments: TelephonyAppointmentLike[] | null | undefined,
	staff: TelephonyStaffMemberLike[] | null | undefined,
	nowIso = new Date().toISOString(),
): PatientUpcomingAppointmentSummary | null {
	if (!patientId || !appointments || appointments.length === 0) return null;

	const upcoming = appointments
		.filter((a) => a.patientId === patientId)
		.filter((a) => a.status === "planned" || a.status === "confirmed")
		.filter((a) => a.startsAt >= nowIso)
		.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

	const nextAppt = upcoming[0];
	if (!nextAppt) return null;

	let doctorName: string | null = null;
	if (nextAppt.doctorUserId && staff) {
		const doctor = staff.find((s) => s.id === nextAppt.doctorUserId);
		if (doctor) doctorName = doctor.fullName;
	}

	const dateObj = new Date(nextAppt.startsAt);
	const nowDate = new Date(nowIso);

	const isToday =
		dateObj.getFullYear() === nowDate.getFullYear() &&
		dateObj.getMonth() === nowDate.getMonth() &&
		dateObj.getDate() === nowDate.getDate();

	const tomorrowDate = new Date(nowDate);
	tomorrowDate.setDate(tomorrowDate.getDate() + 1);
	const isTomorrow =
		dateObj.getFullYear() === tomorrowDate.getFullYear() &&
		dateObj.getMonth() === tomorrowDate.getMonth() &&
		dateObj.getDate() === tomorrowDate.getDate();

	const formattedDate = new Intl.DateTimeFormat("ru-RU", {
		day: "numeric",
		month: "long",
		weekday: "short",
	}).format(dateObj);

	const formattedTime = new Intl.DateTimeFormat("ru-RU", {
		hour: "2-digit",
		minute: "2-digit",
	}).format(dateObj);

	return {
		appointmentId: nextAppt.id,
		startsAt: nextAppt.startsAt,
		endsAt: nextAppt.endsAt,
		formattedDate,
		formattedTime,
		doctorName,
		chairName: null,
		reason: nextAppt.reason || nextAppt.comment || null,
		status: nextAppt.status,
		isToday,
		isTomorrow,
	};
}

/**
 * Extracts and classifies structured somatic alerts, allergies, and contraindications for a patient.
 */
export function resolvePatientSomaticAlerts(
	patient: TelephonyPatientLike | null | undefined,
	insight?: TelephonyPatientInsightLike | null | undefined,
): PatientSomaticAlert[] {
	if (!patient && !insight) return [];

	const alerts: PatientSomaticAlert[] = [];
	const seenLabels = new Set<string>();

	const addAlert = (
		label: string,
		category: PatientSomaticAlert["category"],
		severity: PatientSomaticAlert["severity"],
		icon: string,
	) => {
		const norm = label.trim().toLowerCase();
		if (!norm || seenLabels.has(norm)) return;
		seenLabels.add(norm);
		alerts.push({
			id: `alert-${alerts.length + 1}`,
			label: label.trim(),
			category,
			severity,
			icon,
		});
	};

	// 1. Check notes for allergies, somatics, contraindications
	if (patient?.notes) {
		const rawNotes = patient.notes;
		const lower = rawNotes.toLowerCase();

		// Specific allergy detections
		if (
			lower.includes("лидокаин") ||
			lower.includes("анестети") ||
			lower.includes("ультракаин") ||
			lower.includes("новокаин") ||
			lower.includes("артикаин")
		) {
			addAlert("Аллергия на анестетики (лидокаин / артикаин)", "allergy", "high", "AlertTriangle");
		}
		if (
			lower.includes("пенициллин") ||
			lower.includes("антибиотик") ||
			lower.includes("амоксициллин")
		) {
			addAlert("Аллергия на пенициллиновый ряд", "allergy", "high", "AlertTriangle");
		}
		if (lower.includes("латекс")) {
			addAlert("Непереносимость латекса (безлатексные перчатки)", "allergy", "medium", "AlertCircle");
		}
		if (
			lower.includes("аллерги") &&
			!lower.includes("лидокаин") &&
			!lower.includes("пенициллин") &&
			!lower.includes("латекс")
		) {
			addAlert(rawNotes, "allergy", "high", "AlertTriangle");
		}

		// Specific somatic pathology detections
		if (lower.includes("беременн") || lower.includes("триместр")) {
			addAlert("Беременность (ограничения по рентгену и адреналину)", "chronic", "high", "ShieldAlert");
		}
		if (
			lower.includes("кардиостимулятор") ||
			lower.includes("пейсмейкер") ||
			lower.includes("электрокардиостимулятор")
		) {
			addAlert("Кардиостимулятор (запрет ультразвуковых скейлеров)", "chronic", "high", "ShieldAlert");
		}
		if (lower.includes("диабет") || lower.includes("сахарн")) {
			addAlert("Сахарный диабет (риск замедленного заживления)", "chronic", "medium", "AlertCircle");
		}
		if (lower.includes("гипертон") || lower.includes("давлен") || lower.includes("аг ")) {
			addAlert("Артериальная гипертензия", "chronic", "medium", "AlertCircle");
		}
		if (
			lower.includes("антикоагулянт") ||
			lower.includes("варфарин") ||
			lower.includes("ксарелто") ||
			lower.includes("кровотеч")
		) {
			addAlert("Прием антикоагулянтов (риск кровотечения)", "chronic", "high", "AlertTriangle");
		}
		if (lower.includes("гепатит") || lower.includes("вич") || lower.includes("вирусн")) {
			addAlert("Особый санитарно-эпидемиологический режим", "alert", "high", "ShieldAlert");
		}
		if (
			lower.includes("острая боль") ||
			lower.includes("пульпит") ||
			lower.includes("периодонтит") ||
			lower.includes("отек")
		) {
			addAlert("Острая боль / Экстренное состояние", "pain", "high", "Zap");
		}
	}

	// 2. Check clinical flags from PatientInsight
	if (insight?.clinicalFlags && Array.isArray(insight.clinicalFlags)) {
		for (const flag of insight.clinicalFlags) {
			const lower = flag.toLowerCase();
			const severity: PatientSomaticAlert["severity"] =
				lower.includes("аллерг") || lower.includes("кардио") || lower.includes("беремен")
					? "high"
					: "medium";
			const cat: PatientSomaticAlert["category"] = lower.includes("аллерг") ? "allergy" : "alert";
			addAlert(flag, cat, severity, "AlertTriangle");
		}
	}

	// 3. High risk level from PatientInsight
	if (insight?.riskLevel === "high") {
		if (insight.riskReasons && insight.riskReasons.length > 0) {
			for (const reason of insight.riskReasons) {
				addAlert(`Риск: ${reason}`, "risk", "high", "ShieldAlert");
			}
		} else {
			addAlert("Высокий клинический / организационный риск", "risk", "high", "ShieldAlert");
		}
	}

	return alerts;
}

/**
 * Resolves upcoming next visit date with full descriptive summary.
 */
export function resolvePatientNextVisit(
	patientId: string | null | undefined,
	appointments: TelephonyAppointmentLike[] | null | undefined,
	staff: TelephonyStaffMemberLike[] | null | undefined,
	nowIso = new Date().toISOString(),
): PatientNextVisitSummary {
	if (!patientId || !appointments || appointments.length === 0) {
		return {
			hasNextVisit: false,
			appointmentId: null,
			formattedDate: "—",
			formattedTime: "—",
			doctorName: null,
			doctorSpecialty: null,
			reason: null,
			isToday: false,
			isTomorrow: false,
			startsAt: null,
			fullTextRu: "Следующий визит не запланирован",
		};
	}

	const upcoming = appointments
		.filter((a) => a.patientId === patientId)
		.filter((a) => a.status === "planned" || a.status === "confirmed")
		.filter((a) => a.startsAt >= nowIso)
		.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

	const nextAppt = upcoming[0];
	if (!nextAppt) {
		return {
			hasNextVisit: false,
			appointmentId: null,
			formattedDate: "—",
			formattedTime: "—",
			doctorName: null,
			doctorSpecialty: null,
			reason: null,
			isToday: false,
			isTomorrow: false,
			startsAt: null,
			fullTextRu: "Следующий визит не запланирован",
		};
	}

	let doctorName: string | null = null;
	let doctorSpecialty: string | null = null;
	if (nextAppt.doctorUserId && staff) {
		const doctor = staff.find((s) => s.id === nextAppt.doctorUserId);
		if (doctor) {
			doctorName = doctor.fullName;
			if (doctor.specialties && doctor.specialties.length > 0) {
				doctorSpecialty = doctor.specialties[0] ?? null;
			}
		}
	}

	const dateObj = new Date(nextAppt.startsAt);
	const nowDate = new Date(nowIso);

	const isToday =
		dateObj.getFullYear() === nowDate.getFullYear() &&
		dateObj.getMonth() === nowDate.getMonth() &&
		dateObj.getDate() === nowDate.getDate();

	const tomorrowDate = new Date(nowDate);
	tomorrowDate.setDate(tomorrowDate.getDate() + 1);
	const isTomorrow =
		dateObj.getFullYear() === tomorrowDate.getFullYear() &&
		dateObj.getMonth() === tomorrowDate.getMonth() &&
		dateObj.getDate() === tomorrowDate.getDate();

	const formattedDate = new Intl.DateTimeFormat("ru-RU", {
		day: "numeric",
		month: "long",
		weekday: "short",
	}).format(dateObj);

	const formattedTime = new Intl.DateTimeFormat("ru-RU", {
		hour: "2-digit",
		minute: "2-digit",
	}).format(dateObj);

	const prefix = isToday ? "Сегодня" : isTomorrow ? "Завтра" : formattedDate;
	const docStr = doctorName ? ` (${doctorName})` : "";
	const reasonStr = nextAppt.reason ? ` — ${nextAppt.reason}` : "";
	const fullTextRu = `Следующий визит: ${prefix} в ${formattedTime}${docStr}${reasonStr}`;

	return {
		hasNextVisit: true,
		appointmentId: nextAppt.id,
		formattedDate,
		formattedTime,
		doctorName,
		doctorSpecialty,
		reason: nextAppt.reason || nextAppt.comment || null,
		isToday,
		isTomorrow,
		startsAt: nextAppt.startsAt,
		fullTextRu,
	};
}
