import React from "react";
import { Coins } from "lucide-react";
import { formatMoneyRu } from "../fiscalModalRefundLogic";

export interface TenderDepositPanelProps {
	readonly depositAmount: number;
	readonly totalSumRub: number;
	readonly patientDepositRub: number;
	readonly setCardAmount: (v: number) => void;
	readonly setCashAmount: (v: number) => void;
	readonly setPaymentMode: (v: "cash" | "card" | "sbp" | "deposit" | "split") => void;
}

export const TenderDepositPanel: React.FC<TenderDepositPanelProps> = ({
	depositAmount,
	totalSumRub,
	patientDepositRub,
	setCardAmount,
	setCashAmount,
	setPaymentMode,
}) => {
	const shortage = totalSumRub - depositAmount;

	return (
		<div className="p-4 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-amber-500/30 space-y-3" data-testid="panel-deposit-focused">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2.5">
					<div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
						<Coins size={20} />
					</div>
					<div>
						<span className="font-bold text-sm block text-[var(--ink,#0f172a)]">Зачет аванса / Баланс семьи</span>
						<span className="text-xs text-[var(--muted,#64748b)]">Доступно: {formatMoneyRu(patientDepositRub)}</span>
					</div>
				</div>
				<div className="text-right">
					<span className="text-xs text-[var(--muted,#64748b)] block">К списанию:</span>
					<span className="text-lg font-black font-mono text-amber-700 dark:text-amber-300">
						{formatMoneyRu(depositAmount)}
					</span>
				</div>
			</div>

			{patientDepositRub < totalSumRub && (
				<div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs flex items-center justify-between flex-wrap gap-2">
					<span className="text-amber-900 dark:text-amber-200 font-medium">
						Остаток к доплате: <strong>{formatMoneyRu(shortage)}</strong>
					</span>
					<div className="flex items-center gap-1.5">
						<button
							type="button"
							onClick={() => {
								setCardAmount(shortage);
								setPaymentMode("split");
							}}
							className="primary-button h-7 px-2.5 rounded-lg text-xs cursor-pointer active:scale-95"
						>
							+ Доплатить картой
						</button>
						<button
							type="button"
							onClick={() => {
								setCashAmount(shortage);
								setPaymentMode("split");
							}}
							className="secondary-button h-7 px-2.5 rounded-lg text-xs cursor-pointer active:scale-95"
						>
							+ Доплатить налом
						</button>
					</div>
				</div>
			)}
		</div>
	);
};
