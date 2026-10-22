import type { PatientClinicalSafetyProfile } from "../safetyMath";
import { DEFAULT_SOMATIC_HEALTHY_NORM } from "../safetyMath";
import type { PatientGeneralInfo } from "../tabs/PatientGeneralInfoTab";
import {
	REPRESENTATIVE_RELATIONSHIP_CATALOG,
	isStatutoryLegalRepresentative,
	type RepresentativeRelationshipType,
	type RepresentativeRelationshipMeta,
	type StomxRepresentativeType,
	type StomxRepresentativeTypeMeta,
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
	REPRESENTATIVE_RELATIONSHIP_CATALOG,
	REPRESENTATIVE_RELATIONSHIP_CATALOG as STOMX_REPRESENTATIVE_CATALOG,
	isStatutoryLegalRepresentative,
	type RepresentativeRelationshipType,
	type RepresentativeRelationshipMeta,
	type StomxRepresentativeType,
	type StomxRepresentativeTypeMeta,
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
			? "Законный представитель: имеет право подписывать информированное согласие (ИДС) за несовершеннолетнего"
			: "Член семьи: подписание согласий за несовершеннолетнего требует нотариальной доверенности",
	};
}

export type PatientCardTab = "general" | "formula" | "perio" | "anamnesis" | "visits" | "documents" | "radiology" | "family" | "finance";

export interface PatientCardModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialTab?: PatientCardTab | undefined;
	readonly patient?: PatientGeneralInfo | null | undefined;
	readonly patientData?: PatientGeneralInfo | null | undefined;
	readonly initialSafetyProfile?: Partial<PatientClinicalSafetyProfile> | null | undefined;
	readonly safetyProfile?: PatientClinicalSafetyProfile | null | undefined;
	readonly onSavePatient?: ((patient: PatientGeneralInfo, safetyProfile: PatientClinicalSafetyProfile) => void | Promise<void>) | undefined;
	readonly onApplySomaticNorm?: (() => void) | undefined;
	readonly disabled?: boolean | undefined;
	readonly onNavigateToVisit?: ((visitId: string) => void) | undefined;
	readonly onNewAppointment?: ((patientId?: string) => void) | undefined;
	readonly dashboard?: any | undefined;
	readonly visits?: any[] | undefined;
}
