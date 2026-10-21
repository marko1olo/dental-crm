/**
 * usePatientCreationForm.ts — Хук управления состоянием формы создания пациента.
 */

import type {
	UsePatientCreationFormOptions,
	UsePatientCreationFormResult,
} from "./types";
import { usePatientCreationActions } from "./usePatientCreationActions";
import { usePatientCreationState } from "./usePatientCreationState";
import { usePatientCreationValidation } from "./usePatientCreationValidation";

export function usePatientCreationForm(options: UsePatientCreationFormOptions): UsePatientCreationFormResult {
	const state = usePatientCreationState(options);

	const validation = usePatientCreationValidation({
		newPatientName: state.newPatientName,
		newPatientPhone: state.newPatientPhone,
		newPatientBirthDate: state.newPatientBirthDate,
		initialBirthDate: state.initialBirthDate,
		advertisingSource: state.advertisingSource,
		patientAdministrativeProfileDraft: state.patientAdministrativeProfileDraft,
		fieldRequirements: state.fieldRequirements,
		isEmergencyOrPrimary: state.isEmergencyOrPrimary,
		isChildManual: state.isChildManual,
		isOpen: options.isOpen,
		isPatientCreating: state.isPatientCreating,
		patients: state.patients,
	});

	const actions = usePatientCreationActions({
		isPatientCreating: state.isPatientCreating,
		newPatientName: state.newPatientName,
		newPatientPhone: state.newPatientPhone,
		newPatientBirthDate: state.newPatientBirthDate,
		advertisingSource: state.advertisingSource,
		isEmergencyOrPrimary: state.isEmergencyOrPrimary,
		isSomaticNorm: state.isSomaticNorm,
		isChild: validation.isChild,
		parentRole: state.parentRole,
		parentName: state.parentName,
		parentPhone: state.parentPhone,
		createPatient: options.createPatient as any,
		onClose: options.onClose,
		setDuplicateConflict: validation.setDuplicateConflict,
		validationResult: validation.validationResult,
		appLogic: state.appLogic,
		setNewPatientName: state.setNewPatientName,
		setNewPatientPhone: state.setNewPatientPhone,
		setNewPatientBirthDate: state.setNewPatientBirthDate,
		patientAdministrativeProfileDraft: state.patientAdministrativeProfileDraft,
		setPatientAdministrativeProfileDraft: state.setPatientAdministrativeProfileDraft,
	});

	return {
		fieldRequirements: state.fieldRequirements,
		advertisingSource: state.advertisingSource,
		setAdvertisingSource: state.setAdvertisingSource,
		showDocFields: state.showDocFields,
		setShowDocFields: state.setShowDocFields,
		isEmergencyOrPrimary: state.isEmergencyOrPrimary,
		setIsEmergencyOrPrimary: state.setIsEmergencyOrPrimary,
		isSomaticNorm: state.isSomaticNorm,
		setIsSomaticNorm: state.setIsSomaticNorm,
		isMinorUnder14: validation.isMinorUnder14,
		isMinorUnder18: validation.isMinorUnder18,
		isChild: validation.isChild,
		isChildManual: state.isChildManual,
		setIsChildManual: state.setIsChildManual,
		parentRole: state.parentRole,
		setParentRole: state.setParentRole,
		parentName: state.parentName,
		setParentName: state.setParentName,
		parentPhone: state.parentPhone,
		setParentPhone: state.setParentPhone,
		nameInputRef: state.nameInputRef,
		potentialDuplicates: validation.potentialDuplicates,
		duplicateConflict: validation.duplicateConflict,
		handleCreateAsNewDuplicate: actions.handleCreateAsNewDuplicate,
		validationResult: validation.validationResult,
		patientCreateReady: validation.patientCreateReady,
		patientCreateGuidance: validation.patientCreateGuidance,
		quickIntakeValidationResult: validation.quickIntakeValidationResult,
		quickActionReady: validation.quickActionReady,
		handlePrintBlankContract: actions.handlePrintBlankContract,
		handleCreate: actions.handleCreate,
		handleCreateAndBook: actions.handleCreateAndBook,
		handleCreateAndOpenVisit: actions.handleCreateAndOpenVisit,
		handleQuickCreateKeyDown: actions.handleQuickCreateKeyDown,
		handleToggleAnonymous: actions.handleToggleAnonymous,
		newPatientName: state.newPatientName,
		setNewPatientName: state.setNewPatientName,
		newPatientPhone: state.newPatientPhone,
		effectivePhone: validation.effectivePhone,
		setNewPatientPhone: state.setNewPatientPhone,
		effectiveBirthDate: validation.effectiveBirthDate,
		setNewPatientBirthDate: state.setNewPatientBirthDate,
		isPatientCreating: state.isPatientCreating,
		setSelectedPatientId: state.setSelectedPatientId,
		patientAdministrativeProfileDraft: state.patientAdministrativeProfileDraft,
		setPatientAdministrativeProfileDraft: state.setPatientAdministrativeProfileDraft,
	};
}
