import { useEffect, useRef, useState } from "react";
import type { Dashboard } from "@dental/shared";
import { useAppStore } from "../../store/appStore";
import { usePatientLogic } from "../domains/usePatientLogic";
import { usePatientIntakeLogic } from "../domains/usePatientIntakeLogic";
import { logger } from "../../utils/logger";
import type { PatientSelectionStateSlice } from "./types";
import type { VisitNoteForm } from "../../AppHelpers";

interface UsePatientSelectionStateProps {
	dashboard: Dashboard | null;
	setDashboard: (dashboard: Dashboard | null) => void;
	auth: any;
	setError: (err: string | null) => void;
	clinicProfileDraft: any;
	activeOrganizationId: string | null;
}

export function usePatientSelectionState({
	dashboard,
	setDashboard,
	auth,
	setError,
	clinicProfileDraft,
	activeOrganizationId,
}: UsePatientSelectionStateProps): PatientSelectionStateSlice {
	const { query, setQuery } = useAppStore();
	const recordedPatientViewRef = useRef<string | null>(null);
	const [_recentPatientViewsVersion, setRecentPatientViewsVersion] = useState<number>(0);

	const patient = usePatientLogic({
		dashboard,
		query,
		setError,
		auth,
		setDashboard,
		setQuery,
	});

	const patientIntakeLogic = usePatientIntakeLogic({
		dashboard,
		setError,
		documentPatient: patient.documentPatient,
		documentPatientMatchesActiveVisit: false,
		documentLocalPersistenceOrganizationId: activeOrganizationId ?? "",
		clinicProfileDraft,
		activeDoctor: null,
		activeAppointment: null,
		visitNoteForm: {} as VisitNoteForm,
		clinicalToothRowsValue: () => [],
	});

	const {
		selectedPatientId,
		setSelectedPatientId,
		activePatient,
		activeVisitPatient,
		selectedPatient,
		activePatientCallablePhone,
		activePatientHasCallablePhone,
		activePatientInsight,
		updatePatientCoreDraft,
		updatePatientAdministrativeProfileDraft,
		savePatientCore,
		createPatient,
	} = patient;

	useEffect(() => {
		if (!selectedPatientId || !dashboard) return;
		if (recordedPatientViewRef.current === selectedPatientId) return;
		recordedPatientViewRef.current = selectedPatientId;
		void fetch("/api/hr/recent-patients", {
			method: "POST",
			headers: auth.denteClinicalMutationHeaders({
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({ patientId: selectedPatientId }),
		})
			.then((response) => {
				if (response.ok) setRecentPatientViewsVersion((version) => version + 1);
			})
			.catch((err) => {
				logger.error("[Dente] Failed to record recent patient view", err);
			});
	}, [selectedPatientId, dashboard, auth]);

	return {
		query,
		setQuery,
		selectedPatientId,
		setSelectedPatientId,
		selectedPatient,
		activePatient,
		activeVisitPatient,
		activePatientCallablePhone,
		activePatientHasCallablePhone,
		activePatientInsight,
		savePatientCore,
		createPatient,
		updatePatientCoreDraft,
		updatePatientAdministrativeProfileDraft,
		patient,
		patientIntakeLogic,
	};
}
