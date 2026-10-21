import type { Appointment, Dashboard } from "@dental/shared";
import type { DoctorSpecialtyTheme } from "./appointmentCardHelpers";
import {
	GridAppointmentHudCommunication,
	GridAppointmentHudDetails,
	GridAppointmentHudHeader,
	GridAppointmentHudStatusActions,
	GridAppointmentHudTimeAdjusters,
} from "./gridAppointmentHoverHudModules";

export * from "./gridAppointmentHoverHudModules";

export interface GridAppointmentHoverHudProps {
	appointment: Appointment;
	pName: string;
	pBalance: number | null;
	patObj?: any;
	docObj?: any;
	docTheme: DoctorSpecialtyTheme | null;
	pAllergyAlert: string | null;
	chair: { id: string; name: string };
	aStart: string;
	aEnd: string;
	appointmentLabels: Record<Appointment["status"], string>;
	isNearRightEdge: boolean;
	isNearBottom: boolean;
	dashboard: Dashboard;
	staffLookupMap: Map<string, any>;
	onKeepHovered: (apptId: string) => void;
	onMouseLeave: () => void;
	onQuickStatusChange?: ((id: string, status: any) => void) | undefined;
	onAdjustDuration: (appt: Appointment, deltaMinutes: number) => void;
	onShiftLateness: (appt: Appointment, deltaMinutes: number) => void;
	onFreeSlotToWaitlist?: ((appt: Appointment) => void) | undefined;
}

export function GridAppointmentHoverHud(props: GridAppointmentHoverHudProps) {
	const {
		appointment: a,
		pName,
		pBalance,
		patObj,
		docObj,
		pAllergyAlert,
		chair,
		aStart,
		aEnd,
		isNearRightEdge,
		isNearBottom,
		dashboard,
		onKeepHovered,
		onMouseLeave,
		onQuickStatusChange,
		onAdjustDuration,
		onShiftLateness,
		onFreeSlotToWaitlist,
	} = props;

	return (
		<div
			className={`appointment-patient-hover-preview absolute ${isNearRightEdge ? "right-0 left-auto" : "left-0"} ${isNearBottom ? "bottom-full mb-1.5 top-auto" : "top-full mt-1.5"} w-[330px] max-w-[330px] p-4 rounded-2xl backdrop-blur-md bg-[var(--paper-strong)]/95 border border-[var(--line)] shadow-2xl space-y-3 animate-in fade-in zoom-in-95 duration-150 text-xs text-[var(--ink)] z-[100] pointer-events-auto`}
			style={{ contain: "layout style" }}
			data-testid="schedule-grid-patient-hover-preview"
			onMouseEnter={() => onKeepHovered(a.id)}
			onMouseLeave={onMouseLeave}
		>
			<GridAppointmentHudHeader
				pName={pName}
				pBalance={pBalance}
				patObj={patObj}
				pAllergyAlert={pAllergyAlert}
			/>

			<GridAppointmentHudDetails
				appointment={a}
				docObj={docObj}
				chair={chair}
				aStart={aStart}
				aEnd={aEnd}
				dashboard={dashboard}
			/>

			<GridAppointmentHudStatusActions
				appointment={a}
				onQuickStatusChange={onQuickStatusChange}
			/>

			<GridAppointmentHudTimeAdjusters
				appointment={a}
				onAdjustDuration={onAdjustDuration}
				onShiftLateness={onShiftLateness}
			/>

			<GridAppointmentHudCommunication
				appointment={a}
				patObj={patObj}
				docObj={docObj}
				chair={chair}
				aStart={aStart}
				dashboard={dashboard}
				onFreeSlotToWaitlist={onFreeSlotToWaitlist}
			/>
		</div>
	);
}
