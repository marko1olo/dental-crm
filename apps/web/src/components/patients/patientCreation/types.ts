/**
 * types.ts — Layer 0: Типы данных и интерфейсы для модального окна создания пациента (Фича №35).
 *
 * КОНТЕКСТ & МАНДАТ:
 * - Строгая типизация шагов мастера регистрации.
 * - 0 побочных рантайм-эффектов (Layer 0 DAG).
 */

import type {
	Patient,
	PatientAdministrativeProfile,
} from "@dental/shared";
import type React from "react";
import type { PatientAdministrativeProfileDraft, PatientCoreDraft } from "../../../AppConstants";
import type { PotentialDuplicateItem } from "../../schedule/patientSearchEngine";
import type {
	PatientFieldRequirements,
	PatientDraftValidationResult as ValidationResult,
} from "../patientFieldRequirementsConfig";

export interface PatientCreationModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly createPatient: () => void | Promise<void | Patient | null>;
	readonly updatePatientCoreDraft?: (
		field: keyof PatientCoreDraft,
		value: string,
	) => void;
	/** Опциональное переопределение требований клиники */
	readonly customRequirements?: PatientFieldRequirements;
	/** Опционально: начальная дата рождения пациента */
	readonly initialBirthDate?: string;
	/** Опционально: начальный флаг режима ребёнка */
	readonly initialIsChild?: boolean;
}

export interface PatientPassportAddressStepProps {
	readonly fieldRequirements: PatientFieldRequirements;
	readonly validationErrors: Record<string, string>;
	readonly isMinorUnder14: boolean;
	readonly showDocFields: boolean;
	readonly onToggleDocFields: () => void;
	readonly snils: string;
	readonly onSnilsChange: (snils: string) => void;
	readonly insurancePolicyNumber: string;
	readonly onInsurancePolicyNumberChange: (policy: string) => void;
	readonly identityDocument: string;
	readonly onIdentityDocumentChange: (passport: string) => void;
}

export interface PatientContactsRepresentativeStepProps {
	readonly newPatientName: string;
	readonly onNameChange: (val: string) => void;
	readonly onQuickCreateKeyDown: (
		event: React.KeyboardEvent<HTMLInputElement>,
	) => void;
	readonly nameInputRef: React.RefObject<HTMLInputElement | null>;
	readonly validationErrors: Record<string, string>;
	readonly potentialDuplicates: readonly PotentialDuplicateItem[];
	readonly onSelectExistingPatient: (id: string) => void;
	readonly effectivePhone: string;
	readonly onPhoneChange: (val: string) => void;
	readonly effectiveBirthDate: string;
	readonly onBirthDateChange: (val: string) => void;
	readonly isChild: boolean;
	readonly onToggleChild: () => void;
	readonly parentRole: string;
	readonly onParentRoleChange: (role: string) => void;
	readonly parentName: string;
	readonly onParentNameChange: (name: string) => void;
	readonly parentPhone: string;
	readonly onParentPhoneChange: (phone: string) => void;
	readonly onCopyChildPhone: () => void;
	readonly advertisingSource: string;
	readonly onAdvertisingSourceChange: (source: string) => void;
	readonly fieldRequirements: PatientFieldRequirements;
	readonly isAnonymous: boolean;
	readonly updatePatientCoreDraft?: ((
		field: keyof PatientCoreDraft,
		value: string,
	) => void) | undefined;
}

export interface PatientMedicalFlagsStepProps {
	readonly isEmergencyOrPrimary: boolean;
	readonly onToggleEmergency: () => void;
	readonly isAnonymous: boolean;
	readonly onToggleAnonymous: () => void;
	readonly isSomaticNorm: boolean;
	readonly onToggleSomaticNorm: () => void;
}

export interface UsePatientCreationFormOptions {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly createPatient: () => void | Promise<void | Patient | null>;
	readonly updatePatientCoreDraft?: ((
		field: keyof PatientCoreDraft,
		value: string,
	) => void) | undefined;
	readonly customRequirements?: PatientFieldRequirements | undefined;
	readonly initialBirthDate?: string | undefined;
	readonly initialIsChild?: boolean | undefined;
}

export interface UsePatientCreationFormResult {
	readonly fieldRequirements: PatientFieldRequirements;
	readonly advertisingSource: string;
	readonly setAdvertisingSource: React.Dispatch<React.SetStateAction<string>>;
	readonly showDocFields: boolean;
	readonly setShowDocFields: React.Dispatch<React.SetStateAction<boolean>>;
	readonly isEmergencyOrPrimary: boolean;
	readonly setIsEmergencyOrPrimary: React.Dispatch<React.SetStateAction<boolean>>;
	readonly isSomaticNorm: boolean;
	readonly setIsSomaticNorm: React.Dispatch<React.SetStateAction<boolean>>;
	readonly isMinorUnder14: boolean;
	readonly isChild: boolean;
	readonly setIsChildManual: React.Dispatch<React.SetStateAction<boolean>>;
	readonly parentRole: string;
	readonly setParentRole: React.Dispatch<React.SetStateAction<string>>;
	readonly parentName: string;
	readonly setParentName: React.Dispatch<React.SetStateAction<string>>;
	readonly parentPhone: string;
	readonly setParentPhone: React.Dispatch<React.SetStateAction<string>>;
	readonly nameInputRef: React.RefObject<HTMLInputElement | null>;
	readonly potentialDuplicates: PotentialDuplicateItem[];
	readonly validationResult: ValidationResult;
	readonly patientCreateReady: boolean;
	readonly patientCreateGuidance: string | null;
	readonly quickActionReady: boolean;
	readonly handlePrintBlankContract: () => void;
	readonly handleCreate: () => Promise<void>;
	readonly handleCreateAndBook: () => Promise<void>;
	readonly handleCreateAndOpenVisit: () => Promise<void>;
	readonly handleQuickCreateKeyDown: (
		event: React.KeyboardEvent<HTMLInputElement>,
	) => void;
	readonly handleToggleAnonymous: () => void;
	readonly newPatientName: string;
	readonly setNewPatientName: (name: string) => void;
	readonly newPatientPhone: string;
	readonly setNewPatientPhone: (phone: string) => void;
	readonly effectivePhone: string;
	readonly effectiveBirthDate: string;
	readonly setNewPatientBirthDate: (birthDate: string) => void;
	readonly isPatientCreating: boolean;
	readonly setSelectedPatientId: (id: string | null) => void;
	readonly patientAdministrativeProfileDraft: PatientAdministrativeProfileDraft;
	readonly setPatientAdministrativeProfileDraft: (
		val: PatientAdministrativeProfileDraft | ((prev: PatientAdministrativeProfileDraft) => PatientAdministrativeProfileDraft),
	) => void;
}
