/**
 * types.ts — Типы данных и интерфейсы для модального окна создания пациента.
 */

import type { Patient } from "@dental/shared";
import type React from "react";
import type { PatientCoreDraft } from "../../../AppConstants";
import type { PotentialDuplicateItem } from "../../schedule/patientSearchEngine";
import type { PatientFieldRequirements } from "../patientFieldRequirementsConfig";

export * from "./usePatientCreationTypes";

export interface PatientCreationModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly createPatient: (options?: { allowDuplicate?: boolean }) => void | Promise<void | Patient | null>;
	readonly updatePatientCoreDraft?: (
		field: keyof PatientCoreDraft,
		value: string,
	) => void;
	readonly customRequirements?: PatientFieldRequirements;
	readonly initialBirthDate?: string;
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
	readonly registrationAddress?: string | undefined;
	readonly onRegistrationAddressChange?: ((address: string) => void) | undefined;
}

export interface PatientContactsRepresentativeStepProps {
	readonly newPatientName: string;
	readonly onNameChange: (val: string) => void;
	readonly onQuickCreateKeyDown?: (
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
	readonly setParentName: (name: string) => void;
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
	readonly duplicateConflict?: { message: string; existingPatientId?: string; isNameOnlyDuplicate?: boolean } | null;
	readonly onCreateAsNewDuplicate?: () => void;
}

export interface PatientMedicalFlagsStepProps {
	readonly isEmergencyOrPrimary: boolean;
	readonly onToggleEmergency: () => void;
	readonly isAnonymous: boolean;
	readonly onToggleAnonymous: () => void;
	readonly isSomaticNorm: boolean;
	readonly onToggleSomaticNorm: () => void;
}

import type { UsePatientCreationFormResult } from "./usePatientCreationTypes";

export interface PatientCreationModalBodyProps {
	readonly form: UsePatientCreationFormResult;
	readonly updatePatientCoreDraft?: (
		(field: keyof PatientCoreDraft, value: string) => void
	) | undefined;
	readonly onClose: () => void;
}
