import React, { useState } from "react";
import { ChairRentalShiftWidget } from "../ChairRentalShiftWidget";
import type {
	MobileShiftAppointmentSummary,
	MobileShiftCockpitProps,
	MobileShiftConsumableItem,
} from "./types";
import { MobileShiftSectionTabs } from "./MobileShiftSectionTabs";
import { MobileShiftQueueSection } from "./MobileShiftQueueSection";

export interface MobileShiftCockpitUIProps extends MobileShiftCockpitProps {
	consumables: MobileShiftConsumableItem[];
	handleAdjustConsumable: (id: string, delta: number) => void;
	activePatientFilter: "all" | "in_chair" | "waiting" | "payment";
	setActivePatientFilter: (f: "all" | "in_chair" | "waiting" | "payment") => void;
	filteredAppointments: readonly MobileShiftAppointmentSummary[];
}

export const MobileShiftCockpitUI: React.FC<MobileShiftCockpitUIProps> = ({
	doctorName = "Д-р Смирнова Е.В.",
	totalRevenueRub = 42500,
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
	const [mobileSection, setMobileSection] = useState<"queue" | "rental">(() => {
		try {
			const saved = window.localStorage.getItem("dente_mobile_shift_tab");
			if (saved === "queue" || saved === "rental") return saved;
		} catch {}
		return "rental";
	});
	const [rentalNetProfitRub, setRentalNetProfitRub] = useState<number>(30200);

	const handleSelectSection = (sec: "queue" | "rental") => {
		setMobileSection(sec);
		try {
			window.localStorage.setItem("dente_mobile_shift_tab", sec);
		} catch {}
	};

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
			<MobileShiftSectionTabs
				mobileSection={mobileSection}
				onSelectSection={handleSelectSection}
				totalAppointmentsCount={totalAppointmentsCount}
				rentalNetProfitRub={rentalNetProfitRub}
			/>

			{mobileSection === "rental" ? (
				<ChairRentalShiftWidget
					doctorFullName={doctorName}
					initialGrossRevenueRub={totalRevenueRub}
					onEconomicsChange={(econ) => setRentalNetProfitRub(econ.netProfitRub)}
				/>
			) : (
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
			)}
		</div>
	);
};
