import React, { useState, useRef, useEffect, useCallback } from "react";

export type PatientCoreDraft = {
	fullName: string;
	birthDate: string;
	phone: string;
	email: string;
	notes: string;
};

export function usePatientCoreDraftDebounce(
	patientCoreDraft: PatientCoreDraft,
	updatePatientCoreDraft: (field: keyof PatientCoreDraft, value: string) => void,
) {
	const [localDraft, setLocalDraft] = useState<PatientCoreDraft>(patientCoreDraft);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const latestLocalRef = useRef<PatientCoreDraft>(localDraft);
	latestLocalRef.current = localDraft;

	useEffect(() => {
		if (!timerRef.current) {
			setLocalDraft(patientCoreDraft);
		}
	}, [patientCoreDraft]);

	const commitField = useCallback(
		(field: keyof PatientCoreDraft, value: string) => {
			if (timerRef.current) {
				clearTimeout(timerRef.current);
				timerRef.current = null;
			}
			updatePatientCoreDraft(field, value);
		},
		[updatePatientCoreDraft],
	);

	const handleFieldChange = useCallback(
		(field: keyof PatientCoreDraft, value: string) => {
			setLocalDraft((prev) => ({ ...prev, [field]: value }));
			if (timerRef.current) {
				clearTimeout(timerRef.current);
			}
			timerRef.current = setTimeout(() => {
				updatePatientCoreDraft(field, value);
				timerRef.current = null;
			}, 300);
		},
		[updatePatientCoreDraft],
	);

	const handleBlur = useCallback(
		(field: keyof PatientCoreDraft) => {
			if (timerRef.current) {
				clearTimeout(timerRef.current);
				timerRef.current = null;
				updatePatientCoreDraft(field, latestLocalRef.current[field]);
			}
		},
		[updatePatientCoreDraft],
	);

	// Zero-keystroke-loss: flush pending edits before unmount
	useEffect(() => {
		return () => {
			if (timerRef.current) {
				clearTimeout(timerRef.current);
				timerRef.current = null;
				const current = latestLocalRef.current;
				for (const key of Object.keys(current) as Array<keyof PatientCoreDraft>) {
					if (current[key] !== patientCoreDraft[key]) {
						updatePatientCoreDraft(key, current[key]);
					}
				}
			}
		};
	}, [updatePatientCoreDraft, patientCoreDraft]);

	return {
		localDraft,
		setLocalDraft,
		latestLocalRef,
		commitField,
		handleFieldChange,
		handleBlur,
	};
}
