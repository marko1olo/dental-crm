import type { Appointment } from "@dental/shared";
import React from "react";
import { GridAppointmentInChairActions } from "./gridAppointmentQuickActions/GridAppointmentInChairActions";
import { GridAppointmentPlannedActions } from "./gridAppointmentQuickActions/GridAppointmentPlannedActions";

export interface GridAppointmentQuickActionsProps {
	appointment: Appointment;
	pName: string;
	patObj?: any;
	isHovered: boolean;
	onQuickStatusChange: (id: string, status: any) => void;
}

export function GridAppointmentQuickActions({
	appointment: a,
	pName,
	patObj,
	isHovered,
	onQuickStatusChange,
}: GridAppointmentQuickActionsProps) {
	return (
		<div
			className={`items-center gap-1 shrink-0 ${isHovered ? "flex" : "hidden"}`}
			data-testid={`dente-realtime-bar-${a.id}`}
		>
			<GridAppointmentPlannedActions
				appointment={a}
				pName={pName}
				patObj={patObj}
				onQuickStatusChange={onQuickStatusChange}
			/>
			<GridAppointmentInChairActions
				appointment={a}
				pName={pName}
				patObj={patObj}
				onQuickStatusChange={onQuickStatusChange}
			/>
		</div>
	);
}
