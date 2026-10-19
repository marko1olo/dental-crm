import React from "react";
import { DoctorShiftCloseBreakdownCard } from "./DoctorShiftCloseBreakdownCard";
import { DoctorShiftCloseReconciliationCard } from "./DoctorShiftCloseReconciliationCard";

export interface DoctorShiftCloseCashSectionProps {
	readonly cashRub: number;
	readonly cardRub: number;
	readonly sbpRub: number;
	readonly depositRub: number;
	readonly effectiveTotalCashRub: number;
	readonly countedCashRub: number;
	readonly onSetCountedCashRub: (rub: number) => void;
	readonly cashboxName: string;
	readonly printZReport: boolean;
	readonly onSetPrintZReport: (val: boolean) => void;
	readonly printShiftSummary: boolean;
	readonly onSetPrintShiftSummary: (val: boolean) => void;
	readonly onExecuteEncashment?: (() => void) | undefined;
	readonly isEncashmentDone?: boolean | undefined;
}

export const DoctorShiftCloseCashSection: React.FC<DoctorShiftCloseCashSectionProps> = ({
	cashRub,
	cardRub,
	sbpRub,
	depositRub,
	effectiveTotalCashRub,
	countedCashRub,
	onSetCountedCashRub,
	cashboxName,
	printZReport,
	onSetPrintZReport,
	printShiftSummary,
	onSetPrintShiftSummary,
	onExecuteEncashment,
	isEncashmentDone,
}) => (
	<div className="space-y-3">
		<DoctorShiftCloseBreakdownCard
			cashRub={cashRub}
			cardRub={cardRub}
			sbpRub={sbpRub}
			depositRub={depositRub}
			effectiveTotalCashRub={effectiveTotalCashRub}
		/>

		<DoctorShiftCloseReconciliationCard
			cashRub={cashRub}
			countedCashRub={countedCashRub}
			onSetCountedCashRub={onSetCountedCashRub}
			cashboxName={cashboxName}
			printZReport={printZReport}
			onSetPrintZReport={onSetPrintZReport}
			printShiftSummary={printShiftSummary}
			onSetPrintShiftSummary={onSetPrintShiftSummary}
			onExecuteEncashment={onExecuteEncashment}
			isEncashmentDone={isEncashmentDone}
		/>
	</div>
);
