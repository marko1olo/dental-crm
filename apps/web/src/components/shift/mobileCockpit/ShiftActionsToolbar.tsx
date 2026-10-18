import React from "react";
import type { MobileShiftCockpitProps, MobileShiftConsumableItem } from "./types";
import { MobileShiftBottomBar } from "./MobileShiftBottomBar";
import { MobileShiftCashInSheet } from "./MobileShiftCashInSheet";
import { MobileShiftCashOutSheet } from "./MobileShiftCashOutSheet";
import { MobileShiftHandoverSheet } from "./MobileShiftHandoverSheet";

export interface ShiftActionsToolbarProps extends MobileShiftCockpitProps {
	isCashInSheetOpen: boolean;
	setIsCashInSheetOpen: (val: boolean) => void;
	isCashOutSheetOpen: boolean;
	setIsCashOutSheetOpen: (val: boolean) => void;
	isHandoverSheetOpen: boolean;
	setIsHandoverSheetOpen: (val: boolean) => void;
	cashInAmount: number;
	setCashInAmount: (val: number) => void;
	cashInReason: string;
	setCashInReason: (val: string) => void;
	isSubmittingCashIn: boolean;
	cashOutMode: "full" | "keep_float" | "z_only";
	setCashOutMode: (val: "full" | "keep_float" | "z_only") => void;
	isSubmittingCashOut: boolean;
	handleConfirmCashIn: () => void;
	handleConfirmCashOutAndZReport: () => void;
	handleConfirmHandoverShift: () => void;
	consumables: MobileShiftConsumableItem[];
}

export const ShiftActionsToolbar: React.FC<ShiftActionsToolbarProps> = ({
	isShiftOpen,
	onToggleShift,
	isCashInSheetOpen,
	setIsCashInSheetOpen,
	isCashOutSheetOpen,
	setIsCashOutSheetOpen,
	isHandoverSheetOpen,
	setIsHandoverSheetOpen,
	cashInAmount,
	setCashInAmount,
	cashInReason,
	setCashInReason,
	isSubmittingCashIn,
	cashOutMode,
	setCashOutMode,
	isSubmittingCashOut,
	handleConfirmCashIn,
	handleConfirmCashOutAndZReport,
	handleConfirmHandoverShift,
	cashInDrawerRub = 15000,
	cardSumRub = 22500,
	sbpSumRub = 5000,
	doctorName = "Д-р Смирнова Е.В.",
	completedCount = 4,
	totalAppointmentsCount = 6,
	totalRevenueRub = 42500,
	estimatedDoctorPayoutRub = 12750,
	consumables,
	nextDoctorName = "Д-р Васильев Д.А.",
}) => (
	<>
		<MobileShiftBottomBar
			isShiftOpen={isShiftOpen}
			onToggleShift={onToggleShift}
			onOpenCashInSheet={() => setIsCashInSheetOpen(true)}
			onOpenCashOutSheet={() => setIsCashOutSheetOpen(true)}
			onOpenHandoverSheet={() => setIsHandoverSheetOpen(true)}
		/>

		<MobileShiftCashInSheet
			isOpen={isCashInSheetOpen}
			onClose={() => setIsCashInSheetOpen(false)}
			cashInAmount={cashInAmount}
			setCashInAmount={setCashInAmount}
			cashInReason={cashInReason}
			setCashInReason={setCashInReason}
			isSubmittingCashIn={isSubmittingCashIn}
			handleConfirmCashIn={handleConfirmCashIn}
		/>

		<MobileShiftCashOutSheet
			isOpen={isCashOutSheetOpen}
			onClose={() => setIsCashOutSheetOpen(false)}
			cashInDrawerRub={cashInDrawerRub}
			cardSumRub={cardSumRub}
			sbpSumRub={sbpSumRub}
			cashOutMode={cashOutMode}
			setCashOutMode={setCashOutMode}
			isSubmittingCashOut={isSubmittingCashOut}
			handleConfirmCashOutAndZReport={handleConfirmCashOutAndZReport}
		/>

		<MobileShiftHandoverSheet
			isOpen={isHandoverSheetOpen}
			onClose={() => setIsHandoverSheetOpen(false)}
			doctorName={doctorName}
			nextDoctorName={nextDoctorName}
			completedCount={completedCount}
			totalAppointmentsCount={totalAppointmentsCount}
			totalRevenueRub={totalRevenueRub}
			estimatedDoctorPayoutRub={estimatedDoctorPayoutRub}
			consumables={consumables}
			handleConfirmHandoverShift={handleConfirmHandoverShift}
		/>
	</>
);
