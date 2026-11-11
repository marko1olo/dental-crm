import React from "react";
import type { VisitDoctorEntity, VisitPatientEntity } from "./view/VisitViewProps";
import { useSpecialtyFocusState } from "./specialtyFocusModules/useSpecialtyFocusState";
import { SpecialtyFocusBar } from "./specialtyFocusModules/SpecialtyFocusBar";
import { SpecialtyProtocolDrawer } from "./specialtyFocusModules/SpecialtyProtocolDrawer";

export interface VisitSpecialtyFocusProps {
	compact?: boolean;
	isDrawerOpen?: boolean;
	onToggleDrawer?: (open: boolean) => void;
	renderBarOnly?: boolean;
	renderDrawerOnly?: boolean;
	activePatient?: VisitPatientEntity | null | undefined;
	activeDoctor?: VisitDoctorEntity | null | undefined;
	selectedSpecialty?: string | undefined;
	setSelectedSpecialty?: ((spec: string) => void) | undefined;
	[key: string]: unknown;
}

export function VisitSpecialtyFocus(props: VisitSpecialtyFocusProps = {}) {
	const {
		compact = false,
		renderBarOnly = false,
		renderDrawerOnly = false,
	} = props;

	const state = useSpecialtyFocusState(props);

	const barSection = (
		<SpecialtyFocusBar
			compact={compact}
			isChildDentition={state.isChildDentition}
			isSurgery={state.isSurgery}
			activeTooth={state.activeTooth}
			isProtocolDrawerOpen={state.isProtocolDrawerOpen}
			setIsProtocolDrawerOpen={state.setIsProtocolDrawerOpen}
			currentSpecialtyLabel={state.currentSpecialtyLabel}
			activeDoctor={state.activeDoctor}
			activeChair={state.activeChair}
			focusOptions={state.focusOptions}
			selectedSpecialty={state.selectedSpecialty}
			setSelectedSpecialty={state.setSelectedSpecialty}
			setSelectedProtocolId={state.setSelectedProtocolId}
		/>
	);

	const drawerSection = (
		<SpecialtyProtocolDrawer
			isProtocolDrawerOpen={state.isProtocolDrawerOpen}
			setIsProtocolDrawerOpen={state.setIsProtocolDrawerOpen}
			activeWidgetTitle={state.activeWidgetTitle}
			activeTooth={state.activeTooth}
			isChildDentition={state.isChildDentition}
			isSurgery={state.isSurgery}
			activeSurfaces={state.activeSurfaces}
			setActiveSurfaces={state.setActiveSurfaces}
			handleApplyProtocolText={state.handleApplyProtocolText}
			handleAddToInvoice={state.handleAddToInvoice}
			franklRating={state.franklRating}
			setFranklRating={state.setFranklRating}
			activePatient={state.activePatient}
			activeDoctor={state.activeDoctor}
			patientAgeYears={state.patientAgeYears}
			context={state.context}
			setActiveTooth={state.setActiveTooth}
		/>
	);

	if (renderBarOnly) return barSection;
	if (renderDrawerOnly) return drawerSection;

	return (
		<div className="flex flex-col gap-1 shrink-0">
			{barSection}
			{drawerSection}
		</div>
	);
}
