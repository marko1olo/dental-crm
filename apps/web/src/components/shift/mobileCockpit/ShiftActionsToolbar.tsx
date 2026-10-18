import React from "react";
import type { MobileShiftCockpitProps, MobileShiftConsumableItem } from "./types";
import { MobileShiftBottomBar } from "./MobileShiftBottomBar";
import { MobileShiftCashInSheet } from "./MobileShiftCashInSheet";
import { MobileShiftCashOutSheet } from "./MobileShiftCashOutSheet";
import { MobileShiftConsumablesSheet } from "./MobileShiftConsumablesSheet";

export interface ShiftActionsToolbarProps extends MobileShiftCockpitProps {
	isCashInSheetOpen: boolean;
	setIsCashInSheetOpen: (val: boolean) => void;
	isCashOutSheetOpen: boolean;
	setIsCashOutSheetOpen: (val: boolean) => void;
	isConsumablesSheetOpen?: boolean;
	setIsConsumablesSheetOpen?: (val: boolean) => void;
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
	consumables: MobileShiftConsumableItem[];
	handleAdjustConsumable?: (id: string, delta: number) => void;
}

export const ShiftActionsToolbar: React.FC<ShiftActionsToolbarProps> = ({
	isShiftOpen,
	onToggleShift,
	isCashInSheetOpen,
	setIsCashInSheetOpen,
	isCashOutSheetOpen,
	setIsCashOutSheetOpen,
	isConsumablesSheetOpen = false,
	setIsConsumablesSheetOpen,
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
	cashInDrawerRub = 15000,
	cardSumRub = 22500,
	sbpSumRub = 5000,
	consumables,
	handleAdjustConsumable = () => {},
}) => (
	<>
		<MobileShiftBottomBar
			isShiftOpen={isShiftOpen}
			onToggleShift={onToggleShift}
			onOpenCashOpsSheet={() => setIsCashInSheetOpen(true)}
			onOpenCashInSheet={() => setIsCashInSheetOpen(true)}
			onOpenCashOutSheet={() => setIsCashOutSheetOpen(true)}
			onOpenConsumablesSheet={() => setIsConsumablesSheetOpen?.(true)}
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

		<MobileShiftConsumablesSheet
			isOpen={isConsumablesSheetOpen}
			onClose={() => setIsConsumablesSheetOpen?.(false)}
			consumables={consumables}
			handleAdjustConsumable={handleAdjustConsumable}
		/>
	</>
);
