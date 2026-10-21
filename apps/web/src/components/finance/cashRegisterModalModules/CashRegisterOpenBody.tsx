import type React from "react";
import {
	CashDrawerReconciliationPanel,
	CashShiftKpiCards,
	FiscalReceiptTapeViewer,
} from "../fiscal/CashShiftReconciliationComponents.js";
import type { FiscalTapeWidth } from "../fiscal/fiscal54fzEngine.js";

export interface CashRegisterOpenBodyProps {
	readonly activeTab: "reconciliation" | "drawer" | "tape";
	readonly netRevenueRub: number;
	readonly cashInDrawerRub: number;
	readonly cardSumRub: number;
	readonly sbpSumRub: number;
	readonly advanceOffsetRub: number;
	readonly acquiringFeeRub: number;
	readonly netBankDepositRub: number;
	readonly shiftNumber: number;
	readonly countedCashInput: string;
	readonly setCountedCashInput: (val: string) => void;
	readonly differenceRub: number | null;
	readonly receiptTapeText: string;
	readonly tapeWidth: FiscalTapeWidth;
	readonly setTapeWidth: (val: FiscalTapeWidth) => void;
	readonly isCopied: boolean;
	readonly onCopyTape: () => void;
	readonly onPrintTape: () => void;
}

export const CashRegisterOpenBody: React.FC<CashRegisterOpenBodyProps> = ({
	activeTab,
	netRevenueRub,
	cashInDrawerRub,
	cardSumRub,
	sbpSumRub,
	advanceOffsetRub,
	acquiringFeeRub,
	netBankDepositRub,
	shiftNumber,
	countedCashInput,
	setCountedCashInput,
	differenceRub,
	receiptTapeText,
	tapeWidth,
	setTapeWidth,
	isCopied,
	onCopyTape,
	onPrintTape,
}) => (
	<div className="space-y-5">
		{activeTab === "reconciliation" && (
			<div className="space-y-5">
				<CashShiftKpiCards
					netRevenueRub={netRevenueRub}
					cashInDrawerRub={cashInDrawerRub}
					cardSumRub={cardSumRub}
					sbpSumRub={sbpSumRub}
					advanceOffsetRub={advanceOffsetRub}
				/>
				<div className="p-4 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-wrap items-center justify-between gap-3 text-xs">
					<div className="space-y-0.5">
						<div className="font-bold text-[var(--ink)]">
							Сверка безналичного эквайринга с банком
						</div>
						<div className="text-[var(--muted)]">
							Комиссия банка (1.5%):{" "}
							<strong>
								{acquiringFeeRub.toLocaleString("ru-RU", {
									minimumFractionDigits: 2,
								})}{" "}
								₽
							</strong>
						</div>
					</div>
					<div className="text-right">
						<div className="text-[var(--muted)] font-semibold">
							Поступит на р/с:
						</div>
						<div className="text-base font-extrabold font-mono text-blue-700 dark:text-blue-300">
							{netBankDepositRub.toLocaleString("ru-RU", {
								minimumFractionDigits: 2,
							})}{" "}
							₽
						</div>
					</div>
				</div>
			</div>
		)}

		{activeTab === "drawer" && (
			<CashDrawerReconciliationPanel
				shiftNumber={shiftNumber}
				expectedCashRub={cashInDrawerRub}
				countedCashInput={countedCashInput}
				onCountedCashChange={setCountedCashInput}
				differenceRub={differenceRub}
				onMatchClick={() => setCountedCashInput(cashInDrawerRub.toString())}
				variant="standard"
			/>
		)}

		{activeTab === "tape" && (
			<FiscalReceiptTapeViewer
				receiptTapeText={receiptTapeText}
				tapeWidth={tapeWidth}
				onTapeWidthChange={setTapeWidth}
				onCopy={onCopyTape}
				onPrint={onPrintTape}
				isCopied={isCopied}
			/>
		)}
	</div>
);
