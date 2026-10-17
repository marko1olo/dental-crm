import React from "react";
import type { AppointmentCardPrimaryActionsProps } from "./types";
import { CompletedActions } from "./CompletedActions";
import { CancelledNoShowActions } from "./CancelledNoShowActions";

export function PostVisitActions(props: AppointmentCardPrimaryActionsProps) {
	if (props.displayStatus === "completed") {
		return <CompletedActions {...props} />;
	}
	if (props.displayStatus === "cancelled" || props.displayStatus === "no_show") {
		return <CancelledNoShowActions {...props} />;
	}
	return null;
}
