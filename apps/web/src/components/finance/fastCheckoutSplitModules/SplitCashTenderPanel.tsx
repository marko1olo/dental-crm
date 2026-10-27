import { Coins } from "lucide-react";
import React from "react";
import { SplitCashBillButtons } from "./SplitCashBillButtons";
import {
	SplitCashChangeDisplay,
	type SplitCashChangeDisplayProps,
} from "./SplitCashChangeDisplay";

export type SplitCashTenderPanelProps = SplitCashChangeDisplayProps & {
	readonly cashAmountRub: number;
	readonly targetBillRub: number;
	readonly setCashTenderedRub: React.Dispatch<React.SetStateAction<number>>;
};

export const SplitCashTenderPanel: React.FC<SplitCashTenderPanelProps> = ({
	cashAmountRub,
	targetBillRub,
	cashTenderedRub,
	setCashTenderedRub,
	cashChange,
}) => {
	const effectiveDueRub = cashAmountRub > 0 ? cashAmountRub : targetBillRub;

	return (
		<div
			className="p-4 sm:p-5 rounded-2xl bg-[var(--teal-surface,rgba(13,148,136,0.06))] border border-[var(--teal,#0d9488)]/25 flex flex-col gap-3 shadow-sm"
			data-testid="cash-tender-panel"
		>
			<div className="flex items-center justify-between flex-wrap gap-1">
				<span className="text-sm font-extrabold text-[var(--ink,#0f172a)] flex items-center gap-2">
					<Coins
						size={20}
						className="text-[var(--teal,#0d9488)] dark:text-[var(--teal,#2dd4bf)]"
					/>
					<span>Расчет сдачи с наличных:</span>
				</span>
				<span className="text-sm font-extrabold font-mono text-[var(--teal,#0d9488)] dark:text-[var(--teal,#2dd4bf)]">
					К оплате:{" "}
					{effectiveDueRub.toLocaleString("ru-RU", {
						minimumFractionDigits: 2,
					})}{" "}
					₽
				</span>
			</div>

			{/* Unified SSOT Denominations & Bill Controls */}
			<SplitCashBillButtons
				effectiveDueRub={effectiveDueRub}
				setCashTenderedRub={setCashTenderedRub}
			/>

			<SplitCashChangeDisplay
				cashTenderedRub={cashTenderedRub}
				cashChange={cashChange}
			/>
		</div>
	);
};
