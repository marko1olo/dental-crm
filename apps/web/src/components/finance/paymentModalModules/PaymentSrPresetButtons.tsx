import React from "react";
import { Banknote, CreditCard, Users } from "lucide-react";
import type { PaymentLogicResult } from "./types.js";

export interface PaymentSrPresetButtonsProps {
	readonly discountsHook: PaymentLogicResult["discountsHook"];
	readonly tendersHook: PaymentLogicResult["tendersHook"];
	readonly patientDepositRub?: number | undefined;
}

export const PaymentSrPresetButtons: React.FC<PaymentSrPresetButtonsProps> = ({
	discountsHook,
	tendersHook,
	patientDepositRub = 0,
}) => {
	return (
		<div className="sr-only">
			<button
				type="button"
				onClick={tendersHook.applyThreeWayCashCardAdvancePreset}
				className="discount-preset-chip discount-preset-combo"
				data-testid="preset-three-way-split"
				title="Комбинированная оплата: Нал + Карта + Аванс"
			>
				<Users size={12} className="text-teal-600 dark:text-teal-400" />
				<span>Нал + Карта + Аванс</span>
			</button>
			<button
				type="button"
				onClick={() => {
					tendersHook.setActiveMethod("cash");
					tendersHook.setReceivedCashRub(discountsHook.totalDueRub);
				}}
				className="discount-preset-chip"
				data-testid="preset-exact-cash"
				title="Вся сумма наличными ровно"
			>
				<Banknote size={12} className="text-teal-600 dark:text-teal-400" />
				<span>Всё налом</span>
			</button>
			<button
				type="button"
				onClick={() => {
					tendersHook.setActiveMethod("card_terminal");
				}}
				className="discount-preset-chip"
				data-testid="preset-full-card"
				title="Вся сумма картой через терминал"
			>
				<CreditCard size={12} className="text-teal-600 dark:text-teal-400" />
				<span>Всё картой</span>
			</button>
			<button
				type="button"
				onClick={() => {
					const half = Math.round(discountsHook.totalDueRub / 2);
					tendersHook.setSplitCashRub(half);
					tendersHook.setSplitCardRub(discountsHook.totalDueRub - half);
					tendersHook.setActiveMethod("split");
				}}
				className="discount-preset-chip"
				data-testid="preset-50-50-cash-card"
				title="50% наличными, 50% картой"
			>
				<span>50/50 Нал + Карта</span>
			</button>
			<button
				type="button"
				onClick={() => {
					const depositToUse = Math.min(discountsHook.totalDueRub, patientDepositRub);
					tendersHook.setSplitDepositRub(depositToUse);
					tendersHook.setSplitCardRub(discountsHook.totalDueRub - depositToUse);
					tendersHook.setActiveMethod("split");
				}}
				className="discount-preset-chip"
				data-testid="preset-spend-all-deposit-bonus"
				title="Списать весь доступный депозит"
			>
				<span>Списать весь аванс</span>
			</button>
		</div>
	);
};
