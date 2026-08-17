import type { Appointment, InsuranceContract, Patient, PatientInsight, StaffMember } from "@dental/shared";
import { create } from "zustand";

export type TelephonyProvider = "mango" | "uis" | "asterisk" | "zadarma" | "unknown";
export type TelephonyCallStatus = "ringing" | "answered" | "ended" | "rejected";

export interface IncomingCallPayload {
	callId?: string | undefined;
	phone: string;
	patientId: string | null;
	patientName: string;
	provider?: TelephonyProvider | undefined;
	timestamp: string;
	status?: TelephonyCallStatus | undefined;
	durationSeconds?: number | undefined;
	clinicPhone?: string | undefined;
}

export interface CallHistoryItem extends IncomingCallPayload {
	id: string;
	status: TelephonyCallStatus;
	actionTaken?: "accepted" | "rejected" | "booked" | "dismissed" | "missed" | undefined;
}

export interface TelephonyStore {
	activeCall: IncomingCallPayload | null;
	callHistory: CallHistoryItem[];
	isSimulatorOpen: boolean;
	isMuted: boolean;

	// Actions
	triggerIncomingCall: (call: IncomingCallPayload) => void;
	acceptCall: () => void;
	rejectCall: () => void;
	dismissCall: () => void;
	openSimulator: () => void;
	closeSimulator: () => void;
	toggleMute: () => void;
	clearHistory: () => void;
}

/**
 * Normalizes phone string to clean numeric digits.
 */
export function normalizePhoneDigits(phone: string | null | undefined): string {
	if (!phone) return "";
	return phone.replace(/\D/g, "");
}

/**
 * Formats a phone number for clinical UI presentation.
 * Example: "79991234567" -> "+7 (999) 123-45-67"
 */
export function formatPhoneDisplay(phone: string | null | undefined): string {
	if (!phone) return "—";
	const digits = normalizePhoneDigits(phone);
	if (digits.length === 11) {
		const country = digits.startsWith("8") ? "+7" : `+${digits[0]}`;
		const area = digits.slice(1, 4);
		const p1 = digits.slice(4, 7);
		const p2 = digits.slice(7, 9);
		const p3 = digits.slice(9, 11);
		return `${country} (${area}) ${p1}-${p2}-${p3}`;
	}
	if (digits.length === 10) {
		const area = digits.slice(0, 3);
		const p1 = digits.slice(3, 6);
		const p2 = digits.slice(6, 8);
		const p3 = digits.slice(8, 10);
		return `+7 (${area}) ${p1}-${p2}-${p3}`;
	}
	return phone.trim();
}

/**
 * Extracts 2-letter uppercase initials from full name.
 * Example: "Иванов Иван Иванович" -> "ИИ"
 */
export function formatPatientInitials(fullName: string | null | undefined): string {
	if (!fullName || !fullName.trim()) return "??";
	const parts = fullName.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return "??";
	if (parts.length === 1) {
		const single = parts[0] ?? "";
		return single.slice(0, 2).toUpperCase();
	}
	const first = parts[0] ?? "";
	const second = parts[1] ?? "";
	if (first[0] && second[0]) {
		return (first[0] + second[0]).toUpperCase();
	}
	return (first.slice(0, 2) || "??").toUpperCase();
}

/**
 * Deterministic color palette generation for patient avatar.
 */
export function getAvatarColor(name: string | null | undefined): {
	bg: string;
	text: string;
	border: string;
} {
	const palettes = [
		{ bg: "rgba(15, 118, 110, 0.15)", text: "#0f766e", border: "#14b8a6" }, // Teal
		{ bg: "rgba(2, 132, 199, 0.15)", text: "#0284c7", border: "#38bdf8" }, // Sky
		{ bg: "rgba(99, 102, 241, 0.15)", text: "#6366f1", border: "#818cf8" }, // Indigo
		{ bg: "rgba(168, 85, 247, 0.15)", text: "#a855f7", border: "#c084fc" }, // Purple
		{ bg: "rgba(236, 72, 153, 0.15)", text: "#ec4899", border: "#f472b6" }, // Pink
		{ bg: "rgba(245, 158, 11, 0.15)", text: "#d97706", border: "#fbbf24" }, // Amber
		{ bg: "rgba(16, 185, 129, 0.15)", text: "#059669", border: "#34d399" }, // Emerald
	];

	if (!name) return palettes[0]!;
	let hash = 0;
	for (let i = 0; i < name.length; i++) {
		hash = (hash << 5) - hash + name.charCodeAt(i);
		hash |= 0;
	}
	const index = Math.abs(hash) % palettes.length;
	return palettes[index] ?? palettes[0]!;
}

/**
 * Searches and resolves a patient by phone number against a list of patients.
 */
export function resolvePatientFromPhone(
	patientsList: Patient[] | undefined | null,
	phone: string | null | undefined,
): Patient | null {
	if (!patientsList || !phone) return null;
	const cleanSearch = normalizePhoneDigits(phone);
	if (cleanSearch.length < 7) return null;
	const suffix10 = cleanSearch.slice(-10);

	for (const patient of patientsList) {
		const pDigits = normalizePhoneDigits(patient.phone);
		if (pDigits.endsWith(suffix10) || (patient.phone && patient.phone.includes(phone))) {
			return patient;
		}
	}
	return null;
}

/**
 * Computes structured financial metrics for a patient.
 */
export interface PatientFinancialSummary {
	balanceRub: number;
	formattedBalance: string;
	hasDebt: boolean;
	debtRub: number;
	formattedDebt: string;
	hasInsurance: boolean;
	insuranceName: string | null;
	policyNumber: string | null;
}

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
 * Resolves the last completed/past visit and attending doctor for a patient.
 */
export interface PatientLastVisitSummary {
	lastVisitDate: string | null;
	formattedLastVisit: string;
	doctorName: string | null;
	doctorSpecialty: string | null;
	appointmentReason: string | null;
	isNewPatient: boolean;
}

export function resolvePatientLastVisit(
	patientId: string | null | undefined,
	appointments: Appointment[] | null | undefined,
	staff: StaffMember[] | null | undefined,
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

export const useTelephonyStore = create<TelephonyStore>((set, get) => ({
	activeCall: null,
	callHistory: [],
	isSimulatorOpen: false,
	isMuted: false,

	triggerIncomingCall: (call) => {
		const id = `call-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
		const historyItem: CallHistoryItem = {
			...call,
			id,
			status: call.status ?? "ringing",
			actionTaken: undefined,
		};

		set((state) => ({
			activeCall: { ...call, status: call.status ?? "ringing" },
			callHistory: [historyItem, ...state.callHistory.slice(0, 49)],
		}));
	},

	acceptCall: () => {
		const { activeCall, callHistory } = get();
		if (!activeCall) return;

		const updatedHistory = callHistory.map((item, idx) => {
			if (idx === 0 && item.phone === activeCall.phone) {
				return { ...item, status: "answered" as const, actionTaken: "accepted" as const };
			}
			return item;
		});

		set({
			activeCall: null,
			callHistory: updatedHistory,
		});
	},

	rejectCall: () => {
		const { activeCall, callHistory } = get();
		if (!activeCall) return;

		const updatedHistory = callHistory.map((item, idx) => {
			if (idx === 0 && item.phone === activeCall.phone) {
				return { ...item, status: "rejected" as const, actionTaken: "rejected" as const };
			}
			return item;
		});

		set({
			activeCall: null,
			callHistory: updatedHistory,
		});
	},

	dismissCall: () => {
		const { activeCall, callHistory } = get();
		if (!activeCall) return;

		const updatedHistory = callHistory.map((item, idx) => {
			if (idx === 0 && item.phone === activeCall.phone) {
				return { ...item, actionTaken: "dismissed" as const };
			}
			return item;
		});

		set({
			activeCall: null,
			callHistory: updatedHistory,
		});
	},

	openSimulator: () => set({ isSimulatorOpen: true }),
	closeSimulator: () => set({ isSimulatorOpen: false }),
	toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
	clearHistory: () => set({ callHistory: [] }),
}));
