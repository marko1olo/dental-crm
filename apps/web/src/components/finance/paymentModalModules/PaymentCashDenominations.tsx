import React from "react";
import { Coins } from "lucide-react";
import { CASH_ADD_BUTTONS, CASH_DENOMINATIONS } from "../modal/payment/paymentModalPrintHtml.js";

export interface PaymentCashDenominationsProps {
	readonly totalDueRub: number;
	readonly receivedCashRub: number;
	readonly setReceivedCashRub: React.Dispatch<React.SetStateAction<number>>;
}

export const PaymentCashDenominations: React.FC<PaymentCashDenominationsProps> = ({
	totalDueRub,
	receivedCashRub,
	setReceivedCashRub,
}) => {
	return (
		<div className="space-y-1 pt-0.5">
			<div className="flex items-center justify-between text-[11px] font-semibold text-[var(--muted,#64748b)]">
				<span>Быстрый ввод внесенной суммы:</span>
				<button
					type="button"
					onClick={() => setReceivedCashRub(0)}
					className="text-[11px] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] font-bold hover:underline cursor-pointer bg-transparent border-0 shadow-none p-0"
					data-testid="btn-cash-reset"
				>
					Сброс (0 ₽)
				</button>
			</div>

			{/* Ряд 1: Купюры номиналов */}
			<div className="cash-bill-grid">
				<button
					type="button"
					onClick={() => setReceivedCashRub(totalDueRub)}
					className={`cash-bill-chip ${receivedCashRub === totalDueRub ? "is-active" : ""}`}
					data-testid="btn-cash-exact"
					title="Внесено ровно сумма счета без сдачи"
				>
					Без сдачи
				</button>
				{CASH_DENOMINATIONS.map((denom) => (
					<button
						key={denom.amount}
						type="button"
						onClick={() => setReceivedCashRub(denom.amount)}
						className={`cash-bill-chip ${receivedCashRub === denom.amount ? "is-active" : ""}`}
						data-testid={denom.testId}
						title={`Внесено ${denom.label}`}
					>
						{denom.label}
					</button>
				))}
			</div>

			{/* Ряд 2: Быстрое добавление + Ровно */}
			<div className="cash-add-grid">
				{CASH_ADD_BUTTONS.map((addBtn) => (
					<button
						key={addBtn.amount}
						type="button"
						onClick={() => setReceivedCashRub((prev) => (Number.isFinite(prev) ? prev : 0) + addBtn.amount)}
						className="cash-add-chip"
						data-testid={addBtn.testId}
						title={`Добавить ${addBtn.label.replace("+", "")} к внесенной сумме`}
					>
						{addBtn.label}
					</button>
				))}
				<button
					type="button"
					onClick={() => setReceivedCashRub(totalDueRub)}
					className="cash-exact-chip"
					data-testid="btn-cash-exact-rounded"
					title="Внести ровно без сдачи"
				>
					<Coins size={13} />
					<span>Ровно</span>
				</button>
			</div>
		</div>
	);
};
