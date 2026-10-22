import React, { useEffect } from "react";
import type { VisitSoapNoteValues } from "./types";

interface ExternalSyncParams {
	readonly activeTooth: number | null;
	readonly setSelectedTooth: (tooth: number | null) => void;
	readonly initialValues?: Partial<VisitSoapNoteValues> | undefined;
	readonly setValues: React.Dispatch<React.SetStateAction<VisitSoapNoteValues>>;
	readonly valuesRef: React.MutableRefObject<VisitSoapNoteValues>;
	readonly setSaveStatus: React.Dispatch<React.SetStateAction<"idle" | "saving" | "saved">> | ((status: "idle" | "saving" | "saved") => void);
	readonly saveDraftToStorage: (vals: VisitSoapNoteValues) => void;
	readonly onSave?: ((vals: VisitSoapNoteValues) => void) | undefined;
	readonly onChange?: ((vals: VisitSoapNoteValues) => void) | undefined;
}

export function useVisitSoapExternalSync({
	activeTooth,
	setSelectedTooth,
	initialValues,
	setValues,
	valuesRef,
	setSaveStatus,
	saveDraftToStorage,
	onSave,
	onChange,
}: ExternalSyncParams) {
	useEffect(() => {
		if (activeTooth !== undefined && activeTooth !== null) {
			setSelectedTooth(activeTooth);
		}
	}, [activeTooth, setSelectedTooth]);

	useEffect(() => {
		if (initialValues) {
			setValues((prev) => {
				const isDifferent =
					(initialValues.complaint !== undefined && initialValues.complaint !== prev.complaint) ||
					(initialValues.anamnesis !== undefined && initialValues.anamnesis !== prev.anamnesis) ||
					(initialValues.objectiveStatus !== undefined && initialValues.objectiveStatus !== prev.objectiveStatus) ||
					(initialValues.diagnosis !== undefined && initialValues.diagnosis !== prev.diagnosis) ||
					(initialValues.treatmentPlan !== undefined && initialValues.treatmentPlan !== prev.treatmentPlan) ||
					(initialValues.recommendations !== undefined && initialValues.recommendations !== prev.recommendations) ||
					(initialValues.icd10 !== undefined && initialValues.icd10 !== prev.icd10);

				if (!isDifferent) return prev;

				const next: VisitSoapNoteValues = { ...prev };
				if (initialValues.complaint !== undefined) next.complaint = initialValues.complaint;
				if (initialValues.anamnesis !== undefined) next.anamnesis = initialValues.anamnesis;
				if (initialValues.objectiveStatus !== undefined) next.objectiveStatus = initialValues.objectiveStatus;
				if (initialValues.diagnosis !== undefined) next.diagnosis = initialValues.diagnosis;
				if (initialValues.treatmentPlan !== undefined) next.treatmentPlan = initialValues.treatmentPlan;
				if (initialValues.recommendations !== undefined) next.recommendations = initialValues.recommendations;
				if (initialValues.icd10 !== undefined) next.icd10 = initialValues.icd10;
				return next;
			});
		}
	}, [initialValues, setValues]);

	useEffect(() => {
		const handleExternalSoapProtocol = (e: Event) => {
			const customEvent = e as CustomEvent<any>;
			if (!customEvent?.detail) return;
			const detail = customEvent.detail;
			const incoming = detail.soap || detail;
			if (!incoming || typeof incoming !== "object") return;
			const statusLocalis = incoming.statusLocalis || incoming.objectiveStatus;
			const complaint = incoming.complaint || incoming.complaints;

			setValues((prev) => {
				const isSmartAppend = detail.mode === "smart_append";
				const appendField = (baseVal: string | undefined, incomingVal: string | undefined, sep = "\n\n") => {
					const base = (baseVal || "").trim();
					const inc = (incomingVal || "").trim();
					if (!inc) return base;
					if (!base) return inc;
					if (base.includes(inc)) return base;
					return `${base}${sep}${inc}`;
				};

				const next: VisitSoapNoteValues = isSmartAppend
					? {
							...prev,
							anamnesis: appendField(prev.anamnesis, incoming.anamnesis),
							objectiveStatus: appendField(prev.objectiveStatus, statusLocalis),
							complaint: appendField(prev.complaint, complaint),
							diagnosis: appendField(prev.diagnosis, incoming.diagnosis, "; "),
							treatmentPlan: appendField(prev.treatmentPlan, incoming.treatmentPlan),
							recommendations: appendField(prev.recommendations, incoming.recommendations),
							icd10: incoming.icd10 ?? incoming.diagnosisIcd10 ?? prev.icd10,
					  }
					: {
							...prev,
							anamnesis: incoming.anamnesis ?? prev.anamnesis,
							objectiveStatus: statusLocalis ?? prev.objectiveStatus,
							complaint: complaint ?? prev.complaint,
							diagnosis: incoming.diagnosis ?? prev.diagnosis,
							treatmentPlan: incoming.treatmentPlan ?? prev.treatmentPlan,
							recommendations: incoming.recommendations ?? prev.recommendations,
							icd10: incoming.icd10 ?? incoming.diagnosisIcd10 ?? prev.icd10,
					  };
				valuesRef.current = next;
				setSaveStatus("saved");
				saveDraftToStorage(next);
				onSave?.(next);
				onChange?.(next);
				return next;
			});
		};

		window.addEventListener("dente-apply-soap-protocol", handleExternalSoapProtocol);
		return () => {
			window.removeEventListener("dente-apply-soap-protocol", handleExternalSoapProtocol);
		};
	}, [saveDraftToStorage, setSaveStatus, valuesRef, onSave, onChange, setValues]);
}
