import React from "react";
import { Wallet, Zap } from "lucide-react";
import type { PaymentLogicResult } from "./types.js";

export interface PaymentDepositBannerProps {
	readonly totalDueRub: number;
	readonly patientDepositRub: number;
	readonly execHook: PaymentLogicResult["execHook"];
}

export const PaymentDepositBanner: React.FC<PaymentDepositBannerProps> = ({
	totalDueRub,
	patientDepositRub,
	execHook,
}) => {
	return (
		<div
			className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between gap-2.5 flex-wrap animate-in fade-in"
			data-testid="banner-quick-deposit-debit"
		>
			<div className="flex items-center gap-2">
				<Wallet
					size={16}
					className="text-indigo-600 dark:text-indigo-400 shrink-0"
				/>
				<div className="text-xs">
					<span className="font-bold text-indigo-950 dark:text-indigo-200">
						На депозите пациента:{" "}
					</span>
					<span className="font-mono font-black text-indigo-700 dark:text-indigo-300">
						{patientDepositRub.toLocaleString("ru-RU")} ₽
					</span>
				</div>
			</div>
			<button
				type="button"
				disabled={execHook.isSubmittingDeposit}
				onClick={() => execHook.handleDepositOrPartialCombo("deposit")}
				style={{
					padding: "5px 12px",
					backgroundColor: "#0d9488",
					color: "#ffffff",
					borderRadius: "8px",
					fontSize: "12px",
				}}
				className="min-h-[32px] px-3 py-1 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white cursor-pointer transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
				data-testid="btn-quick-debit-deposit-chip"
			>
				<Zap size={14} />
				<span>
					{patientDepositRub >= totalDueRub
						? `Списать ${totalDueRub.toLocaleString("ru-RU")} ₽ с депозита`
						: `Зачесть ${patientDepositRub.toLocaleString("ru-RU")} ₽ + остаток`}
				</span>
			</button>
		</div>
	);
};
