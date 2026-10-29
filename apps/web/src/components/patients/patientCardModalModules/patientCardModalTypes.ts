import type { PatientClinicalSafetyProfile } from "../safetyMath";
import { DEFAULT_SOMATIC_HEALTHY_NORM } from "../safetyMath";
import type { PatientGeneralInfo } from "../tabs/PatientGeneralInfoTab";
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

export {
	DENTE_REPRESENTATIVE_RELATIONSHIP_CATALOG,
	REPRESENTATIVE_RELATIONSHIP_CATALOG,
	/** @deprecated Mandate 8ap: Sovereign DENTE catalog is DENTE_REPRESENTATIVE_RELATIONSHIP_CATALOG */
	DENTE_REPRESENTATIVE_RELATIONSHIP_CATALOG as STOMX_REPRESENTATIVE_CATALOG,
	isStatutoryLegalRepresentative,
	type RepresentativeRelationshipType,
	type RepresentativeRelationshipMeta,
	type RepresentativeRelationshipType as StomxRepresentativeType,
	type RepresentativeRelationshipMeta as StomxRepresentativeTypeMeta,
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

export type PatientCardTab = "general" | "formula" | "perio" | "anamnesis" | "visits" | "documents" | "radiology" | "family" | "finance";
export type PatientModalMode = "view" | "edit" | "create";

export interface PatientCardModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly mode?: PatientModalMode | undefined;
	readonly initialTab?: PatientCardTab | undefined;
	readonly patient?: PatientGeneralInfo | any | null | undefined;
	readonly patientData?: PatientGeneralInfo | any | null | undefined;
	readonly patientId?: string | null | undefined;
	readonly initialSafetyProfile?: Partial<PatientClinicalSafetyProfile> | null | undefined;
	readonly safetyProfile?: PatientClinicalSafetyProfile | null | undefined;
	readonly onSavePatient?: ((patient: PatientGeneralInfo, safetyProfile: PatientClinicalSafetyProfile) => void | Promise<void>) | undefined;
	readonly onSave?: ((patient: any, safety: any) => void) | undefined;
	readonly onApplySomaticNorm?: (() => void) | undefined;
	readonly disabled?: boolean | undefined;
	readonly onNavigateToVisit?: ((visitId: string) => void) | undefined;
	readonly onNewAppointment?: ((patientId?: string) => void) | undefined;
	readonly dashboard?: any | undefined;
	readonly visits?: any[] | undefined;
	readonly className?: string | undefined;

	// Поддержка режима создания (PatientCreationModal compatibility)
	readonly createPatient?: ((options?: { allowDuplicate?: boolean }) => void | Promise<void | any>) | undefined;
	readonly updatePatientCoreDraft?: ((field: any, value: string) => void) | undefined;
	readonly customRequirements?: any | undefined;
	readonly initialBirthDate?: string | undefined;
	readonly initialIsChild?: boolean | undefined;
}
