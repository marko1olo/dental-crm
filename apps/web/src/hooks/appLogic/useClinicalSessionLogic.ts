import React, { useState } from "react";
import type { Appointment, Dashboard, Patient, StaffMember } from "@dental/shared";
import { useClinicalVisitLogic } from "../domains/useClinicalVisitLogic";
import { useVisitLogic } from "../domains/useVisitLogic";
import type { UseVisitLogicParams, UseVisitLogicReturn } from "../domains/visit/types";
import {
	toothRows,
	visitDraftMissingFieldLabel,
	visitDraftQualityLabels,
	visitDraftSignalLabel,
	visitNoteFieldDefinitions,
	visitSaveReceiptText,
} from "../../AppHelpers";
import type { ClinicalSessionLogicSlice } from "./types";

export interface UseClinicalSessionLogicProps {
	dashboard?: Dashboard | null;
	query?: string;
	setError: (err: string | null) => void;
	auth: unknown;
	setDashboard?: ((dashboard: Dashboard | null) => void) | React.Dispatch<React.SetStateAction<Dashboard | null>>;
	setQuery?: (query: string) => void;
	selectedPatientId?: string;
	documentPatient?: Patient | null;
	activePatient?: unknown;
	activeAppointment?: Appointment | null;
	activeDoctor?: StaffMember | null;
	activeChair?: unknown;
	paymentPatientContextReady?: boolean;
	paymentPatientContextMessage?: string;
	loadDashboard?: () => Promise<void>;
	clinicProfileDraft?: unknown;
	patientCoreDraft?: unknown;
	documentPatientMatchesActiveVisit?: boolean;
	activeOrganizationId?: string | null;
	importSourceKind?: unknown;
	setImportSourceKind?: (val: unknown) => void;
	importText?: string;
	setImportText?: React.Dispatch<React.SetStateAction<string>> | ((val: string) => void);
	setImportPreview?: (val: unknown) => void;
	setImportCommit?: (val: unknown) => void;
}

export function useClinicalSessionLogic(props: UseClinicalSessionLogicProps): ClinicalSessionLogicSlice {
	const clinicalVisitLogic = useClinicalVisitLogic();
	const {
		odontogramUseSurfaces,
		setOdontogramUseSurfaces,
		odontogramViewMode,
		setOdontogramViewMode,
	} = clinicalVisitLogic;

	const visitParams: UseVisitLogicParams = {
		setError: props.setError,
		auth: props.auth,
		setDashboard: (props.setDashboard as React.Dispatch<React.SetStateAction<Dashboard | null>>) ?? (() => {}),
		dashboard: props.dashboard ?? null,
		query: props.query ?? "",
		setQuery: props.setQuery ?? (() => {}),
		selectedPatientId: props.selectedPatientId ?? "",
		paymentPatientContextReady: props.paymentPatientContextReady ?? false,
		paymentPatientContextMessage: props.paymentPatientContextMessage ?? "",
		loadDashboard: props.loadDashboard ?? (async () => {}),
		documentPatientMatchesActiveVisit: props.documentPatientMatchesActiveVisit ?? false,
		activeOrganizationId: props.activeOrganizationId ?? null,
		...(props.documentPatient ? { documentPatient: props.documentPatient } : {}),
		...(props.activePatient ? { activePatient: props.activePatient } : {}),
		...(props.activeAppointment ? { activeAppointment: props.activeAppointment } : {}),
		...(props.activeDoctor ? { activeDoctor: props.activeDoctor } : {}),
		...(props.activeChair ? { activeChair: props.activeChair } : {}),
		...(props.clinicProfileDraft ? { clinicProfileDraft: props.clinicProfileDraft } : {}),
		...(props.patientCoreDraft ? { patientCoreDraft: props.patientCoreDraft } : {}),
		...(props.importSourceKind ? { importSourceKind: props.importSourceKind } : {}),
		...(props.setImportSourceKind ? { setImportSourceKind: props.setImportSourceKind } : {}),
		...(props.importText ? { importText: props.importText } : {}),
		...(props.setImportText ? { setImportText: props.setImportText as React.Dispatch<React.SetStateAction<string>> } : {}),
		...(props.setImportPreview ? { setImportPreview: props.setImportPreview } : {}),
		...(props.setImportCommit ? { setImportCommit: props.setImportCommit } : {}),
	};

	const visitLogic: UseVisitLogicReturn = useVisitLogic(visitParams);

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
