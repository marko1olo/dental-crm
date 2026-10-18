import React from "react";
import type {
	MobileShiftAppointmentSummary,
	MobileShiftCockpitProps,
	MobileShiftConsumableItem,
} from "./types";
import { MobileShiftQueueSection } from "./MobileShiftQueueSection";

export interface MobileShiftCockpitUIProps extends MobileShiftCockpitProps {
	consumables: MobileShiftConsumableItem[];
	handleAdjustConsumable: (id: string, delta: number) => void;
	activePatientFilter: "all" | "in_chair" | "waiting" | "payment";
	setActivePatientFilter: (f: "all" | "in_chair" | "waiting" | "payment") => void;
	filteredAppointments: readonly MobileShiftAppointmentSummary[];
}

export const MobileShiftCockpitUI: React.FC<MobileShiftCockpitUIProps> = ({
	totalAppointmentsCount = 6,
	completedCount = 4,
	inChairCount = 1,
	activePatientFilter,
	setActivePatientFilter,
	filteredAppointments,
	onSelectAppointment,
	onOpenPatientEmk,
	onOpenCashCheckout,
}) => {
	return (
		<div
			className="mobile-shift-ui-container"
			style={{
				width: "100%",
				display: "flex",
				flexDirection: "column",
				gap: "12px",
				paddingBottom: "calc(88px + env(safe-area-inset-bottom, 16px))",
				boxSizing: "border-box",
			}}
		>
			<MobileShiftQueueSection
				totalAppointmentsCount={totalAppointmentsCount}
				completedCount={completedCount}
				inChairCount={inChairCount}
				activePatientFilter={activePatientFilter}
				setActivePatientFilter={setActivePatientFilter}
				filteredAppointments={filteredAppointments}
				onSelectAppointment={onSelectAppointment}
				onOpenPatientEmk={onOpenPatientEmk}
				onOpenCashCheckout={onOpenCashCheckout}
			/>
		</div>
	);
};
