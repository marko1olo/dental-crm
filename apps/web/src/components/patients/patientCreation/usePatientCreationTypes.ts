import type { Patient } from "@dental/shared";
import type React from "react";
import type { PatientAdministrativeProfileDraft, PatientCoreDraft } from "../../../AppConstants";
import type { PotentialDuplicateItem } from "../../schedule/patientSearchEngine";
import type {
	PatientFieldRequirements,
	PatientDraftValidationResult as ValidationResult,
} from "../patientFieldRequirementsConfig";

export interface UsePatientCreationFormOptions {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly createPatient: (options?: { allowDuplicate?: boolean }) => void | Promise<void | Patient | null>;
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
	readonly isMinorUnder18?: boolean;
	readonly isChild: boolean;
	readonly isChildManual: boolean;
	readonly setIsChildManual: React.Dispatch<React.SetStateAction<boolean>>;
	readonly parentRole: string;
	readonly setParentRole: React.Dispatch<React.SetStateAction<string>>;
	readonly parentName: string;
	readonly setParentName: React.Dispatch<React.SetStateAction<string>>;
	readonly parentPhone: string;
	readonly setParentPhone: React.Dispatch<React.SetStateAction<string>>;
	readonly nameInputRef: React.RefObject<HTMLInputElement | null>;
	readonly potentialDuplicates: PotentialDuplicateItem[];
	readonly duplicateConflict: { message: string; existingPatientId?: string; isNameOnlyDuplicate?: boolean } | null;
	readonly setDuplicateConflict?: React.Dispatch<React.SetStateAction<{ message: string; existingPatientId?: string; isNameOnlyDuplicate?: boolean } | null>>;
	readonly validationResult: ValidationResult;
	readonly patientCreateReady: boolean;
	readonly patientCreateGuidance: string | null;
	readonly quickIntakeValidationResult?: any;
	readonly quickActionReady: boolean;
	readonly handlePrintBlankContract: () => void;
	readonly handleCreate: (options?: { allowDuplicate?: boolean }) => Promise<void>;
	readonly handleCreateAndBook: (options?: { allowDuplicate?: boolean }) => Promise<void>;
	readonly handleCreateAndOpenVisit: (options?: { allowDuplicate?: boolean }) => Promise<void>;
	readonly handleCreateAsNewDuplicate: () => Promise<void>;
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
