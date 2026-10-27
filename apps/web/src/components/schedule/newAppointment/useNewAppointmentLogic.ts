/**
 * useNewAppointmentLogic.ts — Main logic orchestrator hook for new appointment modal.
 */

import { useMemo, useRef, useState } from "react";
import type { AppointmentScheduleDraft } from "../../../AppConstants";
import { appointmentScheduleMissingFields } from "../../../AppHelpers";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";
import type { SmartParsedPayload } from "../../../SmartParsePreview";
import { matchesPatientSearch } from "../../../utils/patientSearchUtils";
import type { NewAppointmentFormProps, SmartActionNote } from "./types";
import { useNewAppointmentAutoFill } from "./useNewAppointmentAutoFill";
import { useNewAppointmentPatientStatus } from "./useNewAppointmentPatientStatus";
import { useNewAppointmentCollision } from "./useNewAppointmentCollision";
import { useNewAppointmentSubmit } from "./useNewAppointmentSubmit";

export function useNewAppointmentLogic(props: NewAppointmentFormProps) {
	const {
		dashboard, newAppointmentDraft, newAppointmentSaveState, newAppointmentError,
		updateNewAppointmentDraft, createAppointmentFromDraft, toDateTimeLocalValue,
		fromDateTimeLocalValue, showCreateForm, isSmartAiOpen = false, chairDoctorAssignments,
	} = props;

	const [smartInputText, setSmartInputText] = useState("");
	const [showSmartPreview, setShowSmartPreview] = useState(false);
	const [smartParsedData, setSmartParsedData] = useState<SmartParsedPayload | null>(null);
	const [showHints, setShowHints] = useState(false);
	const [patientSearchQuery, setPatientSearchQuery] = useState("");
	const [smartActionNote, setSmartActionNote] = useState<SmartActionNote | null>(null);

	const { auth } = useAppLogicContext();
	const authRef = useRef(auth);
	authRef.current = auth;

	const filteredPatients = useMemo(() => {
		const list = (dashboard.patients ?? []).filter((p) => p.status === "active");
		const q = patientSearchQuery.trim();
		return q ? list.filter((p) => matchesPatientSearch(p, q)) : list;
	}, [dashboard.patients, patientSearchQuery]);

	useNewAppointmentAutoFill({
		dashboard, newAppointmentDraft, updateNewAppointmentDraft, chairDoctorAssignments,
	});

	const { blacklistStatus, activeLabOrders } = useNewAppointmentPatientStatus({
		patientId: newAppointmentDraft?.patientId, authRef,
	});

	const {
		collision, currentDurationMinutes, applyDuration, handleApplyReasonPreset, clinicTimezone,
	} = useNewAppointmentCollision({
		dashboard, newAppointmentDraft, updateNewAppointmentDraft,
		toDateTimeLocalValue, fromDateTimeLocalValue, chairDoctorAssignments,
	});

	const clinicMode = dashboard.clinicSettings?.profile?.mode;
	const isSoloMode = clinicMode === "solo_doctor" || clinicMode === "one_chair" ||
		(dashboard.clinicSettings?.staff ?? []).filter((m) => m.active && (m.role === "doctor" || m.role === "owner")).length <= 1;

	const newAppointmentMissingSteps = appointmentScheduleMissingFields(
		newAppointmentDraft as AppointmentScheduleDraft, clinicMode, dashboard.clinicSettings?.staff,
		{ chairs: dashboard.clinicSettings?.chairs, patients: dashboard.patients },
	);

	const criticalMissingSteps = useMemo(() => {
		const activeDocs = (dashboard.clinicSettings?.staff ?? []).filter(
			(m) => m.active && (m.role === "doctor" || m.role === "owner"),
		);
		return newAppointmentMissingSteps.filter((step) => {
			if (step.includes("кресло")) return false;
			if (step.includes("врач") && (activeDocs.length > 0 || isSoloMode)) return false;
			return true;
		});
	}, [newAppointmentMissingSteps, dashboard.clinicSettings?.staff, isSoloMode]);

	const { handleQuickCreatePatientFromQuery, handleCreateAppointment } = useNewAppointmentSubmit({
		dashboard, newAppointmentDraft, updateNewAppointmentDraft, createAppointmentFromDraft,
		patientSearchQuery, authRef, chairDoctorAssignments, collision,
	});

	const createFailureText = newAppointmentError || (newAppointmentSaveState === "error"
		? "Запись не создана: сервер отказал и причины не назвал. Проверьте, что программа клиники запущена и есть сеть, затем повторите."
		: null);

	return {
		smartInputText, setSmartInputText, showSmartPreview, setShowSmartPreview,
		smartParsedData, setSmartParsedData, showHints, setShowHints,
		patientSearchQuery, setPatientSearchQuery, filteredPatients,
		smartActionNote, setSmartActionNote, blacklistStatus, activeLabOrders,
		clinicMode, clinicTimezone, criticalMissingSteps, collision,
		currentDurationMinutes, applyDuration, handleApplyReasonPreset,
		newAppointmentReadyToCreate: criticalMissingSteps.length === 0,
		handleQuickCreatePatientFromQuery, handleCreateAppointment,
		createFailureText,
		isFormVisible: showCreateForm || isSmartAiOpen || smartInputText.trim().length > 0,
	};
}
