import { Coins } from "lucide-react";
import type React from "react";
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
			className="p-4 sm:p-5 rounded-2xl bg-[var(--teal-surface,rgba(13,148,136,0.06))] border border-[var(--teal,#0d9488)]/25 flex flex-col gap-4 shadow-sm"
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

			{/* Direct Denomination Buttons (Без сдачи, 1 000, 2 000, 5 000, 10 000) */}
			<div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
				<button
					type="button"
					onClick={() => setCashTenderedRub(effectiveDueRub)}
					className="min-h-[48px] min-w-0 px-2.5 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-sm font-black text-[var(--ink,#0f172a)] hover:border-[var(--teal,#0d9488)] hover:bg-[var(--teal-surface,rgba(13,148,136,0.08))] hover:text-[var(--teal,#0d9488)] cursor-pointer transition-all active:scale-95 truncate shadow-xs flex items-center justify-center"
					data-testid="btn-cash-exact"
					title="Внесено ровно без сдачи"
				>
					Без сдачи
				</button>
				{[1000, 2000, 5000, 10000].map((rub) => (
					<button
						key={rub}
						type="button"
						onClick={() => setCashTenderedRub(rub)}
						className="min-h-[48px] min-w-0 px-2.5 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-sm font-black font-mono text-[var(--ink,#0f172a)] hover:border-[var(--teal,#0d9488)] hover:bg-[var(--teal-surface,rgba(13,148,136,0.08))] hover:text-[var(--teal,#0d9488)] cursor-pointer transition-all active:scale-95 truncate shadow-xs flex items-center justify-center"
						data-testid={`btn-cash-${rub}`}
					>
						{rub.toLocaleString("ru-RU")} ₽
					</button>
				))}
			</div>

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
