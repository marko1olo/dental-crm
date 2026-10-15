import { useState, useMemo, useEffect } from "react";
import { useOptionalAppLogicContext } from "../../../contexts/AppLogicContext";
import { useVisitStore } from "../../../store/visitStore";
import type { VisitSpecialtyFocusProps } from "../VisitSpecialtyFocus";
import { SPECIALTY_DICTIONARY, computePatientAgeYears, formatInvoiceServices } from "./specialtyFocusHelpers";

export function useSpecialtyFocusState(props: VisitSpecialtyFocusProps = {}) {
	const { isDrawerOpen: propIsDrawerOpen, onToggleDrawer: propOnToggleDrawer, activePatient: propActivePatient, activeDoctor: propActiveDoctor, selectedSpecialty: propSelectedSpecialty, setSelectedSpecialty: propSetSelectedSpecialty } = props;
	const storeSpecialty = useVisitStore((s) => s.selectedSpecialty);
	const storeSetSpecialty = useVisitStore((s) => s.setSelectedSpecialty);
	const context = (useOptionalAppLogicContext() || {}) as any;
	const activeDoctor = propActiveDoctor ?? context.activeDoctor;
	const activeChair = context.activeChair;
	const activePatient = propActivePatient ?? context.activePatient;
	const selectedSpecialty = propSelectedSpecialty || (context.selectedSpecialty && context.selectedSpecialty !== "" ? context.selectedSpecialty : undefined) || storeSpecialty || "therapy";
	const setSelectedSpecialty = propSetSelectedSpecialty ?? context.setSelectedSpecialty ?? storeSetSpecialty;
	const setSelectedProtocolId = context.setSelectedProtocolId;
	const specialtyLabels = context.specialtyLabels || {};
	const visibleVisitSpecialtyFocusOptions = context.visibleVisitSpecialtyFocusOptions || [];

	const [localIsProtocolDrawerOpen, setLocalIsProtocolDrawerOpen] = useState(false);
	const isProtocolDrawerOpen = propIsDrawerOpen !== undefined ? propIsDrawerOpen : localIsProtocolDrawerOpen;
	const setIsProtocolDrawerOpen = (valOrFn: any) => {
		const next = typeof valOrFn === "function" ? valOrFn(isProtocolDrawerOpen) : valOrFn;
		if (propOnToggleDrawer) propOnToggleDrawer(next);
		else setLocalIsProtocolDrawerOpen(next);
	};
	const [activeTooth, setActiveTooth] = useState<number | null>(() => {
		const diagTooth = Number(context?.dashboard?.activeVisit?.diagnosisTooth);
		return diagTooth > 0 ? diagTooth : 16;
	});
	const [activeSurfaces, setActiveSurfaces] = useState<string[]>(["O"]);
	const [franklRating, setFranklRating] = useState<1 | 2 | 3 | 4>(3);

	const patientAgeYears = useMemo(() => computePatientAgeYears(activePatient), [activePatient?.birthDate, activePatient?.age]);
	const isChildDentition = (patientAgeYears !== undefined && patientAgeYears < 18) || selectedSpecialty === "pediatric" || selectedSpecialty === "children";

	useEffect(() => {
		const diagTooth = Number(context?.dashboard?.activeVisit?.diagnosisTooth);
		if (isChildDentition) {
			if (patientAgeYears !== undefined && patientAgeYears < 6) {
				if (!activeTooth || activeTooth < 51 || activeTooth > 85) setActiveTooth(54);
			} else if (!activeTooth) setActiveTooth(diagTooth > 0 ? diagTooth : 54);
		} else if (!activeTooth) setActiveTooth(diagTooth > 0 ? diagTooth : 16);
	}, [isChildDentition, patientAgeYears, context?.dashboard?.activeVisit?.diagnosisTooth]);

	const isSurgery = ["surgery", "хирургия", "surgeon", "implantologist"].includes(selectedSpecialty);
	const isTherapy = ["therapy", "терапия", "caries"].includes(selectedSpecialty) || (!isSurgery && !isChildDentition);

	const handleApplyProtocolText = (text: string) => {
		if (typeof context?.appendToTranscript === "function") context.appendToTranscript(`\n\n${text}`);
		try {
			window.dispatchEvent(new CustomEvent("dente-apply-soap-protocol", { detail: { soap: { treatmentDescription: text }, mode: "smart_append" } }));
		} catch { /* ignore */ }
	};

	const handleAddToInvoice = (services: any) => {
		try {
			if (typeof window === "undefined") return;
			const formatted = formatInvoiceServices(services, activeTooth);
			if (formatted.length > 0) {
				window.dispatchEvent(new CustomEvent("dente-add-services-to-invoice", {
					detail: { toothNumber: activeTooth ? Number(activeTooth) || activeTooth : undefined, toothCode: activeTooth ? String(activeTooth) : undefined, services: formatted },
				}));
			}
		} catch { /* ignore */ }
	};

	const currentSpecialtyLabel = (selectedSpecialty && (SPECIALTY_DICTIONARY[selectedSpecialty] || specialtyLabels[selectedSpecialty])) || SPECIALTY_DICTIONARY[selectedSpecialty] || selectedSpecialty || "Терапия";
	const focusOptions = Array.isArray(visibleVisitSpecialtyFocusOptions) ? visibleVisitSpecialtyFocusOptions : [];
	const activeWidgetTitle = isChildDentition ? "Детский протокол" : isSurgery ? "Хирургический протокол" : "Терапевтический протокол";

	return {
		context, activeDoctor, activeChair, activePatient, selectedSpecialty, setSelectedSpecialty, setSelectedProtocolId,
		isProtocolDrawerOpen, setIsProtocolDrawerOpen, activeTooth, setActiveTooth, activeSurfaces, setActiveSurfaces,
		franklRating, setFranklRating, patientAgeYears, isChildDentition, isSurgery, isTherapy,
		handleApplyProtocolText, handleAddToInvoice, currentSpecialtyLabel, focusOptions, activeWidgetTitle,
	};
}
