import React from "react";
import type { AppointmentCardPrimaryActionsProps } from "./types";
import { PlannedConfirmedActions } from "./PlannedConfirmedActions";
import { ArrivedInTreatmentActions } from "./ArrivedInTreatmentActions";

export function ActiveVisitActions(props: AppointmentCardPrimaryActionsProps) {
	if (props.displayStatus === "planned" || props.displayStatus === "confirmed") {
		return <PlannedConfirmedActions {...props} />;
	}
	if (props.displayStatus === "arrived" || props.displayStatus === "in_treatment") {
		return <ArrivedInTreatmentActions {...props} />;
	}
	return null;
}
