import React from "react";
import type { GridAppointmentMenuProps } from "./gridAppointmentMenu/types";
import { GridAppointmentClinicalActions } from "./gridAppointmentMenu/GridAppointmentClinicalActions";
import { GridAppointmentPatientActions } from "./gridAppointmentMenu/GridAppointmentPatientActions";
import { GridAppointmentStatusSubmenu } from "./gridAppointmentMenu/GridAppointmentStatusSubmenu";
import { GridAppointmentCommunicationSubmenu } from "./gridAppointmentMenu/GridAppointmentCommunicationSubmenu";
import { GridAppointmentRescheduleDuration } from "./gridAppointmentMenu/GridAppointmentRescheduleDuration";
import { GridAppointmentReassignSection } from "./gridAppointmentMenu/GridAppointmentReassignSection";

export type { GridAppointmentMenuProps };

export function GridAppointmentMenu(props: GridAppointmentMenuProps) {
	const {
		appointment: a,
		pName,
		patObj,
		docObj,
		effectiveChairs,
		doctors,
		dashboard,
		isMenuOpen,
		onAppointmentClick,
		onCloseMenu,
		onQuickStatusChange,
		onAdjustDuration,
		onShiftLateness,
		onReassignChair,
		onReassignDoctor,
		onFreeSlotToWaitlist,
	} = props;

	return (
		<div
			className={`${isMenuOpen ? "block" : "hidden"} absolute right-0 top-full mt-1 z-50 p-1.5 rounded-2xl bg-[var(--paper)] border-2 border-[var(--teal,var(--brand-primary))] shadow-2xl min-w-[220px] max-w-[270px] space-y-1 text-xs text-[var(--ink)] animate-in fade-in zoom-in-95 duration-100`}
			style={{
				top: "100%",
				right: 0,
				marginTop: "6px",
				zIndex: 100,
				background: "var(--paper)",
				border: "1.5px solid var(--teal, #0d9488)",
				borderRadius: "14px",
				boxShadow: "0 12px 32px rgba(0, 0, 0, 0.18)",
				padding: "8px",
			}}
			onClick={(e) => e.stopPropagation()}
		>
			<GridAppointmentClinicalActions
				appointment={a}
				pName={pName}
				patObj={patObj}
				dashboard={dashboard}
				onCloseMenu={onCloseMenu}
			/>
			<GridAppointmentPatientActions
				appointment={a}
				pName={pName}
				patObj={patObj}
				onAppointmentClick={onAppointmentClick}
				onCloseMenu={onCloseMenu}
			/>
			<GridAppointmentStatusSubmenu
				appointment={a}
				onQuickStatusChange={onQuickStatusChange}
				onCloseMenu={onCloseMenu}
			/>
			<GridAppointmentCommunicationSubmenu
				appointment={a}
				pName={pName}
				patObj={patObj}
				docObj={docObj}
				dashboard={dashboard}
				onCloseMenu={onCloseMenu}
				onFreeSlotToWaitlist={onFreeSlotToWaitlist}
			/>
			<GridAppointmentRescheduleDuration
				appointment={a}
				onCloseMenu={onCloseMenu}
				onAdjustDuration={onAdjustDuration}
				onShiftLateness={onShiftLateness}
			/>
			<GridAppointmentReassignSection
				appointment={a}
				effectiveChairs={effectiveChairs}
				doctors={doctors}
				onReassignChair={onReassignChair}
				onReassignDoctor={onReassignDoctor}
			/>
		</div>
	);
}
