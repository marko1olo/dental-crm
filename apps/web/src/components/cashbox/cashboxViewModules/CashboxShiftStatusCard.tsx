/**
 * apps/web/src/components/cashbox/cashboxViewModules/CashboxShiftStatusCard.tsx
 *
 * Layer 4: Presentation Subcomponent for Cashbox Shift Status.
 * Manages CashShiftWidget integration and summary indicators.
 */

import React from "react";
import { CashShiftWidget } from "../../finance/CashShiftWidget.js";
import type { CashBoxSummary } from "./types.js";

export interface CashboxShiftStatusCardProps {
	readonly isShiftOpen: boolean;
	readonly cashierName?: string | undefined;
	readonly cashierInn?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly clinicInn?: string | undefined;
	readonly cashBoxes?: readonly CashBoxSummary[] | undefined;
	readonly onOpenShift: () => Promise<void>;
	readonly onCloseShift: () => Promise<void>;
	readonly onPrintXReport: () => Promise<void>;
	readonly onCashIn: (amountRub: number, basis: string) => Promise<void>;
	readonly onCashOut: (amountRub: number, basis: string, recipientFio?: string | undefined) => Promise<void>;
}

export function CashboxShiftStatusCard({
	isShiftOpen,
	cashierName,
	cashierInn,
	clinicName,
	clinicInn,
	cashBoxes,
	onOpenShift,
	onCloseShift,
	onPrintXReport,
	onCashIn,
	onCashOut,
}: CashboxShiftStatusCardProps): React.JSX.Element {
	return (
		<section aria-label="Управление кассовой сменой">
			<CashShiftWidget
				compact={true}
				initialIsOpen={isShiftOpen}
				cashierName={cashierName}
				cashierInn={cashierInn}
				clinicName={clinicName}
				clinicInn={clinicInn}
				onOpenShift={onOpenShift}
				onCloseShift={onCloseShift}
				onPrintXReport={onPrintXReport}
				onCashIn={onCashIn}
				onCashOut={onCashOut}
			/>
			{Array.isArray(cashBoxes) && cashBoxes.length > 0 && (
				<div className="mt-2 flex items-center gap-2 flex-wrap text-xs text-[var(--muted)] px-1">
					<span className="font-semibold text-[var(--ink)]">Кассы клиники:</span>
					{cashBoxes.map((box) => (
						<span
							key={box.id}
							className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)]"
						>
							<span className="font-medium text-[var(--ink)]">{box.name}:</span>
							<span className="font-bold font-mono text-[var(--ink)]">
								{box.balanceRub.toLocaleString("ru-RU")} ₽
							</span>
						</span>
					))}
				</div>
			)}
		</section>
	);
}
