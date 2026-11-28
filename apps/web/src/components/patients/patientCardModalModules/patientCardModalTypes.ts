import type { PatientClinicalSafetyProfile } from "../safetyMath";
import { DEFAULT_SOMATIC_HEALTHY_NORM } from "../safetyMath";
import type { PatientGeneralInfo } from "../tabs/PatientGeneralInfoTab";
import type { Dashboard, Patient } from "@dental/shared";
import type { UsePatientCreationFormOptions } from "../patientCreation/types";
import type { PatientCoreDraft } from "../coreEditor/usePatientCoreDraftDebounce";
import type { PatientFieldRequirements } from "../patientFieldRequirementsConfig";
import type { ClinicalVisitItem } from "../patientHistory/types";
import type { PatientAdministrativeProfileDraft } from "../../../constants/onboardingConstants";
import { usePatientStore } from "../../../store/patientStore";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import { fetchWithHandling } from "../../../utils/networkUtils";
import { buildPatientAdministrativeProfilePayload } from "../../../utils/clinicProfileUtils";
import { showToast } from "../../GlobalToast";
import { clientLogger } from "../../../services/logging/clientLogger";
import {
	DENTE_REPRESENTATIVE_RELATIONSHIP_CATALOG,
	REPRESENTATIVE_RELATIONSHIP_CATALOG,
	isStatutoryLegalRepresentative,
	type RepresentativeRelationshipType,
	type RepresentativeRelationshipMeta,
} from "@dental/shared";

export const DEMO_SHOWCASE_MODAL_PATIENT: PatientGeneralInfo = {
	id: "01a00000-0000-0000-0000-000000000001",
	fullName: "Иванов Алексей Сергеевич",
	phone: "+7 (916) 123-45-67",
	birthDate: "1992-08-24",
	doctorClinicalNotes: "Дентофобия (страх бормашины). Аллергоанамнез не отягощен.",
	acquisitionSource: "Рекомендация знакомых / Сарафанное радио",
};

export const DEMO_SHOWCASE_MODAL_SAFETY: PatientClinicalSafetyProfile = {
	...DEFAULT_SOMATIC_HEALTHY_NORM,
	customChronicNotes: "Соматически здоров. Аллергоанамнез не отягощен. Перенесенные инфекционные заболевания отрицает. Физиологическая норма.",
};

export const PATIENT_LEGAL_REPRESENTATIVE_CATALOG = DENTE_REPRESENTATIVE_RELATIONSHIP_CATALOG;
export const CLINICAL_REPRESENTATIVE_CATALOG = DENTE_REPRESENTATIVE_RELATIONSHIP_CATALOG;
export const DENTE_REPRESENTATIVE_CATALOG = DENTE_REPRESENTATIVE_RELATIONSHIP_CATALOG;
export type LegalRepresentativeType = RepresentativeRelationshipType;
export type LegalRepresentativeTypeMeta = RepresentativeRelationshipMeta;
export type DenteRepresentativeType = RepresentativeRelationshipType;
export type DenteRepresentativeTypeMeta = RepresentativeRelationshipMeta;

export {
	DENTE_REPRESENTATIVE_RELATIONSHIP_CATALOG,
	REPRESENTATIVE_RELATIONSHIP_CATALOG,
	isStatutoryLegalRepresentative,
	type RepresentativeRelationshipType,
	type RepresentativeRelationshipMeta,
};

export function getRepresentativeLegalStatus(type: string | null | undefined): {
	isLegalRepresentative: boolean;
	labelRu: string;
	idsSigningAllowed: boolean;
	descriptionRu: string;
} {
	if (!type) {
		return { isLegalRepresentative: false, labelRu: "", idsSigningAllowed: false, descriptionRu: "Представитель не выбран" };
	}
	const match = REPRESENTATIVE_RELATIONSHIP_CATALOG.find((r) => r.nameRu === type || r.code === type);
	const isLegal = match?.isLegalRepresentative ?? false;
	return {
		isLegalRepresentative: isLegal,
		labelRu: match?.nameRu ?? type,
		idsSigningAllowed: isLegal,
		descriptionRu: isLegal
			? "Законный представитель: имеет право подписывать согласие на лечение за несовершеннолетнего"
			: "Член семьи: подписание согласий за несовершеннолетнего требует нотариальной доверенности",
	};
}

export type PatientCardTab = "general" | "formula" | "perio" | "anamnesis" | "visits" | "documents" | "radiology" | "family" | "finance" | "treatmentPlans" | "photos" | "reclamations" | "labOrders";
export type PatientModalMode = "view" | "edit" | "create";

export interface PatientCardModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly isOverlayHosted?: boolean | undefined;
	readonly mode?: PatientModalMode | undefined;
	readonly initialMode?: "view" | "edit" | "create" | undefined;
	readonly initialPatientId?: string | null | undefined;
	readonly initialTab?: PatientCardTab | undefined;
	readonly patient?: PatientGeneralInfo | Patient | null | undefined;
	readonly patientData?: PatientGeneralInfo | Patient | null | undefined;
	readonly patientId?: string | null | undefined;
	readonly initialSafetyProfile?: Partial<PatientClinicalSafetyProfile> | null | undefined;
	readonly safetyProfile?: PatientClinicalSafetyProfile | null | undefined;
	readonly onSavePatient?: ((patient: PatientGeneralInfo, safetyProfile: PatientClinicalSafetyProfile) => void | Promise<void>) | undefined;
	readonly onSave?: ((patient: PatientGeneralInfo, safety: PatientClinicalSafetyProfile) => void) | undefined;
	readonly onApplySomaticNorm?: (() => void) | undefined;
	readonly disabled?: boolean | undefined;
	readonly onNavigateToVisit?: ((visitId: string) => void) | undefined;
	readonly onNewAppointment?: ((patientId?: string) => void) | undefined;
	readonly dashboard?: Dashboard | null | undefined;
	readonly visits?: ClinicalVisitItem[] | undefined;
	readonly className?: string | undefined;
	readonly doctorId?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly onOpenWarrantyPassport?: (() => void) | undefined;

	// Поддержка режима создания (PatientCreationModal compatibility)
	readonly createPatient?: ((options?: { allowDuplicate?: boolean }) => void | Promise<void | Patient | null>) | undefined;
	readonly updatePatientCoreDraft?: ((field: keyof PatientCoreDraft, value: string) => void) | undefined;
	readonly updatePatientAdministrativeProfileDraft?: ((field: keyof PatientAdministrativeProfileDraft, value: string | number[]) => void) | undefined;
	readonly customRequirements?: PatientFieldRequirements | undefined;
	readonly initialBirthDate?: string | undefined;
	readonly initialIsChild?: boolean | undefined;
}

export function toCanonicalPatient(patientData: Partial<PatientGeneralInfo>): Patient {
	const now = new Date().toISOString();
	return {
		id: patientData.id || "00000000-0000-0000-0000-000000000000",
		organizationId: "00000000-0000-0000-0000-000000000000",
		status: "active",
		fullName: patientData.fullName || "",
		phone: patientData.phone ?? null,
		birthDate: patientData.birthDate ?? null,
		gender: patientData.gender === "female" ? "female" : patientData.gender === "other" ? "other" : "male",
		email: patientData.email ?? null,
		notes: patientData.notes ?? patientData.doctorClinicalNotes ?? null,
		balanceRub: typeof patientData.balanceRub === "number" ? patientData.balanceRub : (typeof patientData.patientBalanceRub === "number" ? patientData.patientBalanceRub : 0),
		balanceKopecks: patientData.balanceKopecks ?? 0,
		familyGroupId: patientData.familyGroupId ?? null,
		administrativeProfile: null,
		createdAt: patientData.createdAt ? String(patientData.createdAt) : now,
		updatedAt: patientData.updatedAt ? String(patientData.updatedAt) : now,
	};
}

export async function createPatientCanonicalApiFallback(
	options?: { allowDuplicate?: boolean },
): Promise<Patient | null> {
	const storeState = usePatientStore.getState();
	const fullName = (storeState.newPatientName || storeState.patientCoreDraft.fullName || "").trim();
	if (!fullName) {
		showToast("Укажите ФИО пациента перед созданием карточки.", "warning");
		return null;
	}
	const cleanPhone = storeState.newPatientPhone?.trim() || storeState.patientCoreDraft.phone?.trim() || null;
	const cleanBirthDate = storeState.newPatientBirthDate?.trim() || storeState.patientCoreDraft.birthDate?.trim() || null;
	const isAnon = storeState.patientAdministrativeProfileDraft.isAnonymous === true;
	const anonymousCode = isAnon
		? (storeState.patientAdministrativeProfileDraft.anonymousCode || null)
		: null;
	const administrativeProfile = buildPatientAdministrativeProfilePayload({
		...storeState.patientAdministrativeProfileDraft,
		isAnonymous: isAnon,
		anonymousCode,
	});
	const cleanNotes = storeState.patientCoreDraft.notes?.trim() || null;
	const payload = {
		fullName,
		phone: cleanPhone,
		birthDate: cleanBirthDate,
		notes: cleanNotes,
		isAnonymous: isAnon,
		anonymousCode,
		administrativeProfile,
		allowDuplicate: Boolean(options?.allowDuplicate),
	};

	const response = await fetchWithHandling("/api/patients", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...denteAdminSecretRequestHeaders(),
		},
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		let errorJson: { message?: string } | null = null;
		try {
			errorJson = (await response.json()) as { message?: string } | null;
		} catch (parseErr) {
			clientLogger.warn("[patientCardModalTypes] Failed to parse conflict error JSON:", parseErr);
		}
		const errorMsg = errorJson?.message || "Ошибка создания пациента";
		const conflictError = new Error(errorMsg) as Error & {
			status?: number;
			duplicateData?: unknown;
		};
		conflictError.status = response.status;
		conflictError.duplicateData = errorJson;
		throw conflictError;
	}

	const patient = (await response.json()) as Patient;
	storeState.setNewPatientName("");
	storeState.setNewPatientPhone("");
	storeState.setNewPatientBirthDate("");
	storeState.setSelectedPatientId(patient.id);
	showToast("Карточка пациента создана", "success", 3000);
	return patient;
}

export function createPatientCreationOptions(
	props: PatientCardModalProps,
	isOpen: boolean,
	onClose: () => void,
): UsePatientCreationFormOptions {
	return {
		isOpen,
		onClose,
		createPatient: props.createPatient ?? createPatientCanonicalApiFallback,
		updatePatientCoreDraft: props.updatePatientCoreDraft,
		customRequirements: props.customRequirements,
		initialBirthDate: props.initialBirthDate,
		initialIsChild: props.initialIsChild,
	};
}
