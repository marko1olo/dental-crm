import { useState, useMemo, useEffect } from "react";
import { useOptionalAppLogicContext } from "../../../contexts/AppLogicContext";
import { useVisitStore } from "../../../store/visitStore";
import type { VisitSpecialtyFocusProps } from "../VisitSpecialtyFocus";
import { SPECIALTY_DICTIONARY, computePatientAgeYears, formatInvoiceServices } from "./specialtyFocusHelpers";

export function useSpecialtyFocusState(props: VisitSpecialtyFocusProps = {}) {
	const { isDrawerOpen: propIsDrawerOpen, onToggleDrawer: propOnToggleDrawer, activePatient: propActivePatient, activeDoctor: propActiveDoctor, selectedSpecialty: propSelectedSpecialty, setSelectedSpecialty: propSetSelectedSpecialty } = props;
	const storeSpecialty = useVisitStore((s) => s.selectedSpecialty);
	const storeSetSpecialty = useVisitStore((s) => s.setSelectedSpecialty);
	const context = useOptionalAppLogicContext() ?? ({} as Partial<NonNullable<ReturnType<typeof useOptionalAppLogicContext>>>);
	const activeDoctor = propActiveDoctor ?? context.activeDoctor;
	const activeChair = context.activeChair;
	const activePatient = propActivePatient ?? context.activePatient;
	const selectedSpecialty = String(propSelectedSpecialty || (context.selectedSpecialty && context.selectedSpecialty !== "" ? context.selectedSpecialty : undefined) || storeSpecialty || "therapy");
	const setSelectedSpecialty: (spec: string) => void = (spec: string) => {
		if (propSetSelectedSpecialty) {
			propSetSelectedSpecialty(spec);
		} else if (typeof context.setSelectedSpecialty === "function") {
			(context.setSelectedSpecialty as (s: unknown) => void)(spec);
		} else if (storeSetSpecialty) {
			storeSetSpecialty(spec as Parameters<typeof storeSetSpecialty>[0]);
		}
	};
	const setSelectedProtocolId: ((id: string | null) => void) | undefined =
		typeof context.setSelectedProtocolId === "function" ? (context.setSelectedProtocolId as (id: string | null) => void) : undefined;
	const specialtyLabels = (context.specialtyLabels as Record<string, string> | undefined) || {};
	const visibleVisitSpecialtyFocusOptions = context.visibleVisitSpecialtyFocusOptions || [];

	const [localIsProtocolDrawerOpen, setLocalIsProtocolDrawerOpen] = useState(false);
	const isProtocolDrawerOpen = propIsDrawerOpen !== undefined ? propIsDrawerOpen : localIsProtocolDrawerOpen;
	const setIsProtocolDrawerOpen = (valOrFn: boolean | ((prev: boolean) => boolean)) => {
		const next = typeof valOrFn === "function" ? valOrFn(isProtocolDrawerOpen) : valOrFn;
		if (propOnToggleDrawer) propOnToggleDrawer(next);
		else setLocalIsProtocolDrawerOpen(next);
	};
	const activeVisitAny = context?.dashboard?.activeVisit as { diagnosisTooth?: unknown; toothNumber?: unknown } | null | undefined;
	const diagTooth = Number(activeVisitAny?.diagnosisTooth ?? activeVisitAny?.toothNumber);
	const [activeTooth, setActiveTooth] = useState<number | null>(() => {
		return diagTooth > 0 ? diagTooth : 16;
	});
	const [activeSurfaces, setActiveSurfaces] = useState<string[]>(["O"]);
	const [franklRating, setFranklRating] = useState<1 | 2 | 3 | 4>(3);

	const patientAgeYears = useMemo(() => computePatientAgeYears(activePatient ?? undefined), [activePatient?.birthDate]);
	const isChildDentition = (patientAgeYears !== undefined && patientAgeYears < 18) || selectedSpecialty === "pediatric" || selectedSpecialty === "children";

	useEffect(() => {
		if (isChildDentition) {
			if (patientAgeYears !== undefined && patientAgeYears < 6) {
				if (!activeTooth || activeTooth < 51 || activeTooth > 85) setActiveTooth(54);
			} else if (!activeTooth) setActiveTooth(diagTooth > 0 ? diagTooth : 54);
		} else if (!activeTooth) setActiveTooth(diagTooth > 0 ? diagTooth : 16);
	}, [isChildDentition, patientAgeYears, diagTooth]);

	const isSurgery = ["surgery", "хирургия", "surgeon", "implantologist"].includes(selectedSpecialty);
	const isTherapy = ["therapy", "терапия", "caries"].includes(selectedSpecialty) || (!isSurgery && !isChildDentition);

	const handleApplyProtocolText = (text: string) => {
		if (typeof context?.appendToTranscript === "function") context.appendToTranscript(`\n\n${text}`);
		try {
			window.dispatchEvent(new CustomEvent("dente-apply-soap-protocol", { detail: { soap: { treatmentDescription: text }, mode: "smart_append" } }));
		} catch { /* ignore */ }
	};

	const handleAddToInvoice = (services: unknown) => {
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

	const currentSpecialtyLabel = (selectedSpecialty && ((SPECIALTY_DICTIONARY as Record<string, string>)[selectedSpecialty] || specialtyLabels[selectedSpecialty])) || selectedSpecialty || "Терапия";
	const focusOptions = Array.isArray(visibleVisitSpecialtyFocusOptions) ? visibleVisitSpecialtyFocusOptions : [];
	const activeWidgetTitle = isChildDentition ? "Детский протокол" : isSurgery ? "Хирургический протокол" : "Терапевтический протокол";

	return {
		context, activeDoctor, activeChair, activePatient, selectedSpecialty, setSelectedSpecialty, setSelectedProtocolId,
		isProtocolDrawerOpen, setIsProtocolDrawerOpen, activeTooth, setActiveTooth, activeSurfaces, setActiveSurfaces,
		franklRating, setFranklRating, patientAgeYears, isChildDentition, isSurgery, isTherapy,
		handleApplyProtocolText, handleAddToInvoice, currentSpecialtyLabel, focusOptions, activeWidgetTitle,
	};
}
