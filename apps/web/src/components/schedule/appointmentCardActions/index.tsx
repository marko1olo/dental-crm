import React from "react";
import type { AppointmentCardPrimaryActionsProps } from "./types";
import { ActiveVisitActions } from "./ActiveVisitActions";
import { PostVisitActions } from "./PostVisitActions";

export type { AppointmentCardPrimaryActionsProps } from "./types";

export function AppointmentCardPrimaryActions(props: AppointmentCardPrimaryActionsProps) {
	if (props.appointmentEditing) return null;

	if (
		props.displayStatus === "planned" ||
		props.displayStatus === "confirmed" ||
		props.displayStatus === "arrived" ||
		props.displayStatus === "in_treatment"
	) {
		return <ActiveVisitActions {...props} />;
	}

	if (
		props.displayStatus === "completed" ||
		props.displayStatus === "cancelled" ||
		props.displayStatus === "no_show"
	) {
		return <PostVisitActions {...props} />;
	}

	return null;
}
