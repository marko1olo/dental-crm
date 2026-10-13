import type { Dashboard, Patient } from "@dental/shared";
import type {
	PatientAdministrativeProfileDraft,
	PatientCoreDraft,
} from "../../../AppConstants";

/** Заготовка приёма из гидратации базы: приёмов нет, объект есть. */
export const NIL_VISIT_UUID = "00000000-0000-0000-0000-000000000000";

/**
 * Цифры телефона в виде, пригодном для сравнения.
 *
 * Телефоны хранятся как «+7 916 200-10-20», а регистратор читает номер с экрана
 * телефона или из мессенджера и вставляет его как «79162001020» либо
 * «89162001020». Одна и та же строка «8» в начале и «+7» в начале — один и тот
 * же российский номер, поэтому одиннадцатизначный номер с ведущей 8 или 7
 * приводится к 7.
 */
export function patientPhoneDigits(value: string | null | undefined): string {
	const digits = (value ?? "").replace(/\D/g, "");
	if (
		digits.length === 11 &&
		(digits.startsWith("8") || digits.startsWith("7"))
	) {
		return `7${digits.slice(1)}`;
	}
	return digits;
}

/**
 * Сколько цифр в запросе нужно, чтобы считать его поиском по номеру.
 *
 * Не одна: телефоны хранятся с «+7», поэтому запрос из одной цифры «7» совпадал
 * почти со всем списком. Трёх цифр хватает на привычный приём «ищу по последним
 * цифрам номера» и уже отсекает совпадение по коду страны.
 */
export const PATIENT_PHONE_QUERY_MIN_DIGITS = 3;

export type PatientSaveState = "idle" | "saving" | "saved" | "error";

export interface UsePatientLogicProps {
	dashboard: Dashboard | null | undefined;
	query: string;
	setError: (error: string | null) => void;
	auth: any;
	setDashboard: React.Dispatch<React.SetStateAction<Dashboard | null>>;
	setQuery: (query: string) => void;
}

export interface UsePatientSearchAndFilterProps {
	dashboard: Dashboard | null | undefined;
	query: string;
	selectedPatientId: string | null;
}

export interface UsePatientSearchAndFilterReturn {
	activePatient: Patient | null;
	activeVisitPatient: Patient | null;
	selectedPatient: Patient | null;
	documentPatient: Patient | null;
	documentPatientMatchesActiveVisit: boolean;
	paymentPatientContextReady: boolean;
	paymentPatientContextMessage: string;
	patientInsightById: Map<string, Dashboard["patientInsights"][number]>;
	activePatientInsight: Dashboard["patientInsights"][number] | null;
	activePatientCallablePhone: string;
	activePatientHasCallablePhone: boolean;
	filteredPatients: Patient[];
}

export interface UsePatientMutationsProps {
	dashboard: Dashboard | null | undefined;
	setDashboard: React.Dispatch<React.SetStateAction<Dashboard | null>>;
	setError: (error: string | null) => void;
	auth: any;
	selectedPatient: Patient | null;
	setSelectedPatientId: (id: string | null) => void;
	setQuery: (query: string) => void;
}

export interface UsePatientMutationsReturn {
	patientCoreDraftRef: React.MutableRefObject<PatientCoreDraft>;
	patientAdministrativeProfileDraftRef: React.MutableRefObject<PatientAdministrativeProfileDraft>;
	patientAdministrativeProfileValidationMessage: string | null;
	updatePatientCoreDraft: <K extends keyof PatientCoreDraft>(
		key: K,
		value: PatientCoreDraft[K],
	) => void;
	updatePatientAdministrativeProfileDraft: <
		K extends keyof PatientAdministrativeProfileDraft,
	>(
		key: K,
		value: PatientAdministrativeProfileDraft[K],
	) => void;
	savePatientCore: () => Promise<boolean>;
	savePatientAdministrativeProfile: () => Promise<boolean>;
	createPatient: (options?: { allowDuplicate?: boolean }) => Promise<Patient | null>;
}

