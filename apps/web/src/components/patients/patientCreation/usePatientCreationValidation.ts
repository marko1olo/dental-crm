import { calculateAge } from "@dental/shared";
import { useEffect, useMemo, useState } from "react";
import { findPotentialDuplicates, type PotentialDuplicateItem } from "../../schedule/patientSearchEngine";
import { type PatientFieldRequirements, validatePatientDraftWithRequirements } from "../patientFieldRequirementsConfig";

export interface UsePatientCreationValidationParams {
	readonly newPatientName: string;
	readonly newPatientPhone: string;
	readonly newPatientBirthDate: string;
	readonly initialBirthDate?: string | undefined;
	readonly advertisingSource: string;
	readonly patientAdministrativeProfileDraft: any;
	readonly fieldRequirements: PatientFieldRequirements;
	readonly isEmergencyOrPrimary: boolean;
	readonly isChildManual: boolean;
	readonly isOpen: boolean;
	readonly isPatientCreating: boolean;
	readonly patients: any[];
}

export function usePatientCreationValidation({
	newPatientName,
	newPatientPhone,
	newPatientBirthDate,
	initialBirthDate,
	advertisingSource,
	patientAdministrativeProfileDraft,
	fieldRequirements,
	isEmergencyOrPrimary,
	isChildManual,
	isOpen,
	isPatientCreating,
	patients,
}: UsePatientCreationValidationParams) {
	const [duplicateConflict, setDuplicateConflict] = useState<{
		message: string;
		existingPatientId?: string;
		isNameOnlyDuplicate?: boolean;
	} | null>(null);

	const potentialDuplicates: PotentialDuplicateItem[] = useMemo(() => {
		return findPotentialDuplicates(patients, {
			fullName: newPatientName,
			phone: newPatientPhone,
			thresholdScore: 35,
			limit: 3,
		});
	}, [patients, newPatientName, newPatientPhone]);

	useEffect(() => {
		setDuplicateConflict(null);
	}, [newPatientName, newPatientPhone, isOpen]);

	const effectivePhone = newPatientPhone;
	const effectiveBirthDate = initialBirthDate ?? newPatientBirthDate;

	const patientAge = useMemo(() => {
		if (!effectiveBirthDate?.trim()) return null;
		const parsed = new Date(effectiveBirthDate);
		return Number.isNaN(parsed.getTime()) ? null : calculateAge(effectiveBirthDate);
	}, [effectiveBirthDate]);

	const isMinorUnder14 = patientAge !== null && patientAge < 14;
	const isMinorUnder18 = patientAge !== null && patientAge < 18;
	const isChild = isMinorUnder18 || isChildManual;

	const validationResult = validatePatientDraftWithRequirements(
		{
			fullName: newPatientName,
			phone: newPatientPhone,
			advertisingSource,
			snils: patientAdministrativeProfileDraft.snils,
			birthDate: effectiveBirthDate,
			identityDocument: patientAdministrativeProfileDraft.identityDocument,
			isAnonymous: patientAdministrativeProfileDraft.isAnonymous,
			isEmergencyOrPrimary,
		},
		fieldRequirements,
	);

	const patientCreateReady = validationResult.isValid && !isPatientCreating;
	const patientCreateGuidance = validationResult.guidanceMessage;

	const quickIntakeValidationResult = useMemo(() => {
		return validatePatientDraftWithRequirements(
			{
				fullName: newPatientName,
				phone: newPatientPhone,
				isAnonymous: patientAdministrativeProfileDraft.isAnonymous,
				isEmergencyOrPrimary: true,
			},
			{
				...fieldRequirements,
				requirePhone: !patientAdministrativeProfileDraft.isAnonymous,
				requireAdvertisingSource: false,
				requireSnils: false,
				requireBirthDate: false,
				requireIdentityDocument: false,
			},
		);
	}, [newPatientName, newPatientPhone, patientAdministrativeProfileDraft.isAnonymous, fieldRequirements]);

	const quickActionReady = quickIntakeValidationResult.isValid && !isPatientCreating;

	return {
		duplicateConflict, setDuplicateConflict, potentialDuplicates, effectivePhone, effectiveBirthDate,
		patientAge, isMinorUnder14, isMinorUnder18, isChild, validationResult,
		patientCreateReady, patientCreateGuidance, quickIntakeValidationResult, quickActionReady,
	};
}
