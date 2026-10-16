import React, { useMemo } from "react";
import type { FullForm043uPayload } from "@dental/shared";
import { safeLocalStorageSetItem } from "../../../../lib/safeLocalStorage";

export function useMedicalCardDraftAutosave(
	form043DraftKey: string,
	initialPayload: any,
	state: any,
	rev: any,
	effectiveDisabled: boolean,
	onChange?: (payload: FullForm043uPayload) => void,
) {
	const payloadToSave: FullForm043uPayload = useMemo(() => ({
		...initialPayload,
		formNumber: "043/у",
		clinicLegalName: initialPayload?.clinicLegalName || "ООО «Денте»",
		medicalCardNumber: initialPayload?.medicalCardNumber || "043-DRAFT",
		cardOpenedDate: initialPayload?.cardOpenedDate || new Date().toISOString().slice(0, 10),
		patientFullName: initialPayload?.patientFullName || "Пациент",
		patientBirthDate: initialPayload?.patientBirthDate || "1990-01-01",
		patientSex: initialPayload?.patientSex || "male",
		attendingDoctorFullName: initialPayload?.attendingDoctorFullName || "Врач-стоматолог",
		attendingDoctorSpecialty: initialPayload?.attendingDoctorSpecialty || "Врач-стоматолог-терапевт",
		allergologicalHistory: state.allergologicalHistory,
		concomitantDiseases: state.concomitantDiseases,
		currentMedications: state.currentMedications,
		pregnancyLactationStatus: state.pregnancyLactationStatus,
		pastDentalInterventions: state.pastDentalInterventions,
		chiefComplaint: state.chiefComplaint,
		historyOfPresentIllness: state.historyOfPresentIllness,
		odontogramTeeth: Object.values(state.odontogram),
		dmftIndex: state.dmftResult,
		cpitnIndex: state.cpitn,
		hygieneIndexOhiS: state.hygieneIndexOhiS,
		biteType: state.biteType,
		biteDescription: state.biteDescription,
		oralMucosaStatus: state.oralMucosa,
		xrayFindingsDescription: state.xrayFindingsDescription,
		generalTreatmentPlan: state.generalTreatmentPlan,
		soapDiaries: initialPayload?.soapDiaries || [],
		initialOdontogramTeeth: initialPayload?.initialOdontogramTeeth || initialPayload?.odontogramTeeth || [],
		sanitizedOdontogramTeeth: initialPayload?.sanitizedOdontogramTeeth || initialPayload?.odontogramTeeth || [],
		...(rev.revisionCount > 0 || rev.isRevising ? { revisionCount: rev.revisionCount + (rev.isRevising ? 1 : 0), revisionReason: rev.revisionReason.trim() || "Исправленному верить" } : {}),
	}), [initialPayload, state, rev.revisionCount, rev.isRevising, rev.revisionReason]);

	const latestPayloadRef = React.useRef<FullForm043uPayload>(payloadToSave);
	const isInitialMountRef = React.useRef(true);
	latestPayloadRef.current = payloadToSave;

	React.useEffect(() => {
		if (effectiveDisabled) return;
		const flushDraft = () => {
			try { safeLocalStorageSetItem(form043DraftKey, JSON.stringify(latestPayloadRef.current)); } catch {}
			if (onChange) onChange(latestPayloadRef.current);
		};
		if (isInitialMountRef.current) {
			isInitialMountRef.current = false;
			flushDraft();
			return;
		}
		const timer = setTimeout(flushDraft, 400);
		return () => clearTimeout(timer);
	}, [payloadToSave, effectiveDisabled, form043DraftKey, onChange]);

	React.useEffect(() => {
		return () => {
			if (latestPayloadRef.current) {
				try { safeLocalStorageSetItem(form043DraftKey, JSON.stringify(latestPayloadRef.current)); } catch {}
			}
		};
	}, [form043DraftKey]);

	React.useEffect(() => {
		if (effectiveDisabled) return;
		const handleBeforeUnload = (e: BeforeUnloadEvent) => {
			const hasModifiedTeeth = Object.values(state.odontogram as Record<string, any>).some(
				(t: any) => t.statusCode !== "healthy" || (t.surfaces && t.surfaces.length > 0),
			);
			if (hasModifiedTeeth) {
				if (latestPayloadRef.current) {
					try { safeLocalStorageSetItem(form043DraftKey, JSON.stringify(latestPayloadRef.current)); } catch {}
				}
				e.preventDefault();
				e.returnValue = "В медицинской карте есть несохраненные данные зубной формулы. Закрыть вкладку?";
				return e.returnValue;
			}
		};
		window.addEventListener("beforeunload", handleBeforeUnload);
		return () => window.removeEventListener("beforeunload", handleBeforeUnload);
	}, [state.odontogram, effectiveDisabled, form043DraftKey]);

	return { latestPayloadRef, payloadToSave };
}
