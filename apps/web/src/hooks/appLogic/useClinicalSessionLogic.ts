import React, { useState } from "react";
import type { Dashboard } from "@dental/shared";
import { useClinicalVisitLogic } from "../domains/useClinicalVisitLogic";
import { useVisitLogic } from "../domains/useVisitLogic";
import {
	toothRows,
	visitDraftMissingFieldLabel,
	visitDraftQualityLabels,
	visitDraftSignalLabel,
	visitNoteFieldDefinitions,
	visitSaveReceiptText,
} from "../../AppHelpers";
import type { ClinicalSessionLogicSlice } from "./types";

interface UseClinicalSessionLogicProps {
	dashboard: Dashboard | null;
	query: string;
	setError: (err: string | null) => void;
	auth: any;
	setDashboard: (dashboard: Dashboard | null) => void;
	setQuery: (query: string) => void;
	selectedPatientId: string;
	documentPatient: any;
	activePatient: any;
	activeAppointment: any;
	activeDoctor: any;
	activeChair: any;
	paymentPatientContextReady: boolean;
	paymentPatientContextMessage: string;
	loadDashboard: () => Promise<void>;
	clinicProfileDraft: any;
	patientCoreDraft: any;
	documentPatientMatchesActiveVisit: boolean;
	activeOrganizationId: string | null;
	importSourceKind: any;
	setImportSourceKind: (val: any) => void;
	importText: string;
	setImportText: (val: string) => void;
	setImportPreview: (val: any) => void;
	setImportCommit: (val: any) => void;
}

export function useClinicalSessionLogic({
	dashboard,
	query,
	setError,
	auth,
	setDashboard,
	setQuery,
	selectedPatientId,
	documentPatient,
	activePatient,
	activeAppointment,
	activeDoctor,
	activeChair,
	paymentPatientContextReady,
	paymentPatientContextMessage,
	loadDashboard,
	clinicProfileDraft,
	patientCoreDraft,
	documentPatientMatchesActiveVisit,
	activeOrganizationId,
	importSourceKind,
	setImportSourceKind,
	importText,
	setImportText,
	setImportPreview,
	setImportCommit,
}: UseClinicalSessionLogicProps): ClinicalSessionLogicSlice {
	const clinicalVisitLogic = useClinicalVisitLogic();
	const {
		odontogramUseSurfaces,
		setOdontogramUseSurfaces,
		odontogramViewMode,
		setOdontogramViewMode,
	} = clinicalVisitLogic;

	const visitLogic: any = useVisitLogic({
		dashboard,
		query,
		setError,
		auth,
		setDashboard: setDashboard as any,
		setQuery: setQuery as any,
		selectedPatientId,
		documentPatient,
		activePatient,
		activeAppointment,
		activeDoctor,
		activeChair,
		paymentPatientContextReady,
		paymentPatientContextMessage,
		loadDashboard,
		clinicProfileDraft,
		patientCoreDraft,
		documentPatientMatchesActiveVisit,
		activeOrganizationId,
		importSourceKind,
		setImportSourceKind,
		importText,
		setImportText,
		setImportPreview,
		setImportCommit,
	} as any);

	const {
		visitNoteForm,
		updateVisitNoteField,
		visitToothStateByCode,
		setToothState,
		visitDraftUserEditedRef,
		visitCloseChecklist,
		visitWarnings,
		visitDraftBuildMissingSteps,
		visitDraftReadyToBuild,
		visitNoteAcceptMissingSteps,
		visitNoteActionLabel,
		visitNoteReadyToAccept,
		visitNoteStatusLabel,
		acceptDraftToVisit,
		scrollToVisitArea,
	} = visitLogic;

	const [clinicalToothRowsText, setClinicalToothRowsText] = useState<string>("");

	function renderClinicalToothRowsEditor() {
		return React.createElement(
			"label",
			null,
			React.createElement(
				"span",
				null,
				"Клинические строки по зубам и сегментам",
			),
			React.createElement("textarea", {
				value: clinicalToothRowsText,
				onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) =>
					setClinicalToothRowsText(event.target.value),
				rows: 5,
			}),
			React.createElement(
				"small",
				null,
				"Формат строки: зуб/сегмент | поверхности | статус | диагноз/находка | показание | действие | прогноз | пародонт | имплант/ортопедия | ортодонтия",
			),
		);
	}

	return {
		...visitLogic,
		clinicalVisitLogic,
		odontogramUseSurfaces,
		setOdontogramUseSurfaces,
		odontogramViewMode,
		setOdontogramViewMode,
		toothRows,
		toothStateByCode: visitToothStateByCode,
		setToothState,
		renderClinicalToothRowsEditor,
		visitNoteForm,
		updateVisitNoteField,
		visitWarnings,
		visitCloseChecklist,
		visitDraftBuildMissingSteps,
		visitDraftMissingFieldLabel,
		visitDraftQualityLabels,
		visitDraftReadyToBuild,
		visitDraftSignalLabel,
		visitDraftUserEditedRef,
		visitNoteAcceptMissingSteps,
		visitNoteActionLabel,
		visitNoteFieldDefinitions,
		visitNoteReadyToAccept,
		visitNoteStatusLabel,
		visitSaveReceiptText,
		acceptDraftToVisit,
		scrollToVisitArea,
	};
}
