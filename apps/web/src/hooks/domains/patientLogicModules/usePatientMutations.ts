import type { Dashboard } from "@dental/shared";
import React, { useCallback, useRef } from "react";
import type {
	UsePatientMutationsProps,
	UsePatientMutationsReturn,
} from "./patientLogicTypes";
import {
	usePatientCoreSave,
	usePatientAdministrativeSave,
} from "./mutations";

export * from "./mutations";

/**
 * Координатор-фасад мутаций пациента (Core + Administrative Profile).
 * Декомпозирован по Мандату 8b/8zi в тонкий координатор (< 100 строк)
 * и специализированные модули: usePatientCoreSave и usePatientAdministrativeSave.
 * Обеспечивает 1-кликовую автономию врача (Мандат 8e) и ноль бюрократических блокировок.
 */
export function usePatientMutations({
	dashboard,
	setDashboard,
	setError,
	auth,
	selectedPatient,
	setSelectedPatientId,
	setQuery,
}: UsePatientMutationsProps): UsePatientMutationsReturn {
	const savedByThisScreenUpdatedAtRef = useRef<string | null>(null);

	const normalizedSetDashboard = useCallback<
		React.Dispatch<React.SetStateAction<Dashboard | null>>
	>(
		(action) => {
			if (typeof action === "function") {
				(setDashboard as React.Dispatch<React.SetStateAction<Dashboard | null>>)(
					action,
				);
			} else {
				(setDashboard as (d: Dashboard | null) => void)(action);
			}
		},
		[setDashboard],
	);

	const {
		patientCoreDraftRef,
		updatePatientCoreDraft,
		savePatientCore,
		createPatient,
	} = usePatientCoreSave({
		dashboard,
		setDashboard: normalizedSetDashboard,
		setError,
		auth,
		selectedPatient,
		setSelectedPatientId,
		setQuery,
		savedByThisScreenUpdatedAtRef,
	});

	const {
		patientAdministrativeProfileDraftRef,
		patientAdministrativeProfileValidationMessage,
		updatePatientAdministrativeProfileDraft,
		savePatientAdministrativeProfile,
	} = usePatientAdministrativeSave({
		dashboard,
		setDashboard: normalizedSetDashboard,
		setError,
		auth,
		selectedPatient,
		savedByThisScreenUpdatedAtRef,
	});

	return {
		patientCoreDraftRef,
		patientAdministrativeProfileDraftRef,
		patientAdministrativeProfileValidationMessage,
		updatePatientCoreDraft,
		updatePatientAdministrativeProfileDraft,
		savePatientCore,
		savePatientAdministrativeProfile,
		createPatient,
	};
}
