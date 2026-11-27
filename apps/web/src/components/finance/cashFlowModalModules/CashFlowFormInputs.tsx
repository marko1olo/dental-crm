import React from "react";
import { type CashBoxSummary, type CashFlowMode, formatMoneyRu } from "./types";

interface CashFlowFormInputsProps {
	readonly cashFlowMode: CashFlowMode;
	readonly cashFlowAmount: string;
	readonly setCashFlowAmount: (val: string) => void;
	readonly cashInDrawerRub: number;
	readonly cashFlowBasis: string;
	readonly setCashFlowBasis: (val: string) => void;
	readonly cashFlowPerson: string;
	readonly setCashFlowPerson: (val: string) => void;
	readonly cashBoxes?: readonly CashBoxSummary[] | undefined;
	readonly fromCashBoxId?: string | undefined;
	readonly setFromCashBoxId?: ((val: string) => void) | undefined;
	readonly toCashBoxId?: string | undefined;
	readonly setToCashBoxId?: ((val: string) => void) | undefined;
}

export const CashFlowFormInputs: React.FC<CashFlowFormInputsProps> = ({
	cashFlowMode,
	cashFlowAmount,
	setCashFlowAmount,
	cashInDrawerRub,
	cashFlowBasis,
	setCashFlowBasis,
	cashFlowPerson,
	setCashFlowPerson,
	cashBoxes = [],
	fromCashBoxId = "",
	setFromCashBoxId,
	toCashBoxId = "",
	setToCashBoxId,
}) => {
	const isCashIn = cashFlowMode === "cash_in";
	const isTransfer = cashFlowMode === "transfer";
	const selectedSourceBox = cashBoxes.find((b) => b.id === fromCashBoxId);
	const effectiveAvailableRub = isTransfer
		? selectedSourceBox?.balanceRub ?? cashInDrawerRub
		: cashInDrawerRub;

	return (
		<div className="space-y-4">
			{isTransfer && (
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div className="min-w-0">
						<label
							htmlFor="cash-flow-from-box"
							className="block text-xs font-semibold text-[var(--ink)] mb-1.5"
						>
							Из кассы (откуда)
						</label>
						<select
							id="cash-flow-from-box"
							value={fromCashBoxId}
							onChange={(e) => setFromCashBoxId?.(e.target.value)}
							data-testid="select-cash-transfer-from"
							className="w-full min-w-0 h-11 sm:h-9 pl-3 pr-8 truncate rounded-lg border border-[var(--line)] bg-[var(--paper)] text-sm text-[var(--ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--primary)]/30"
						>
							{cashBoxes.length === 0 && (
								<option value="">Кассы загружаются…</option>
							)}
							{cashBoxes.map((box) => (
								<option key={box.id} value={box.id}>
									{box.name} ({formatMoneyRu(box.balanceRub)})
								</option>
							))}
						</select>
					</div>

					<div className="min-w-0">
						<label
							htmlFor="cash-flow-to-box"
							className="block text-xs font-semibold text-[var(--ink)] mb-1.5"
						>
							В кассу (куда)
						</label>
						<select
							id="cash-flow-to-box"
							value={toCashBoxId}
							onChange={(e) => setToCashBoxId?.(e.target.value)}
							data-testid="select-cash-transfer-to"
							className="w-full min-w-0 h-11 sm:h-9 pl-3 pr-8 truncate rounded-lg border border-[var(--line)] bg-[var(--paper)] text-sm text-[var(--ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--primary)]/30"
						>
							{cashBoxes.length === 0 && (
								<option value="">Кассы загружаются…</option>
							)}
							{cashBoxes.map((box) => (
								<option key={box.id} value={box.id}>
									{box.name} ({formatMoneyRu(box.balanceRub)})
								</option>
							))}
						</select>
					</div>
				</div>
			)}

			<div>
				<label
					htmlFor="cash-flow-amount-input"
					className="block text-xs font-semibold text-[var(--ink)] mb-1.5"
				>
					Сумма операции (₽)
				</label>
				<div className="relative">
					<input
						id="cash-flow-amount-input"
						type="number"
						step="0.01"
						min="0"
						placeholder="0.00"
						value={cashFlowAmount}
						onChange={(e) => setCashFlowAmount(e.target.value)}
						data-testid="input-cash-flow-amount"
						className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-lg font-semibold font-mono tabular-nums text-[var(--ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--primary)]/30"
					/>
					<span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-[var(--ink-muted)] pointer-events-none">
						₽
					</span>
				</div>

				<div className="flex items-center gap-1.5 mt-2 flex-wrap">
					{[500, 1000, 5000, 10000].map((amt) => (
						<button
							key={amt}
							type="button"
							onClick={() => setCashFlowAmount(String(amt))}
							className="min-h-[44px] sm:min-h-[32px] px-3 py-1 text-xs font-medium rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--paper)] transition-all cursor-pointer"
						>
							+{amt.toLocaleString("ru-RU")} ₽
						</button>
					))}
					{!isCashIn && effectiveAvailableRub > 0 && (
						<button
							type="button"
							onClick={() => setCashFlowAmount(String(effectiveAvailableRub))}
							className="min-h-[44px] sm:min-h-[32px] px-3 py-1 text-xs font-medium rounded-lg border border-[var(--line)] bg-[var(--warning-soft)] text-[var(--ink)] hover:opacity-90 transition-all cursor-pointer"
						>
							Вся сумма ({formatMoneyRu(effectiveAvailableRub)})
						</button>
					)}
				</div>
			</div>

			<div>
				<label
					htmlFor="cash-flow-basis-input"
					className="block text-xs font-semibold text-[var(--ink)] mb-1.5"
				>
					Основание операции / Назначение платежа
				</label>
				<input
					id="cash-flow-basis-input"
					type="text"
					placeholder={
						isTransfer
							? "Например: Перевод выручки на расчётный счёт"
							: "Например: Внесение разменной монеты на начало смены"
					}
					value={cashFlowBasis}
					onChange={(e) => setCashFlowBasis(e.target.value)}
					data-testid="input-cash-flow-basis"
					className="w-full h-11 sm:h-9 px-3.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-sm text-[var(--ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--primary)]/30"
				/>
			</div>

			{!isTransfer && (
				<div>
					<label
						htmlFor="cash-flow-person-input"
						className="block text-xs font-semibold text-[var(--ink)] mb-1.5"
					>
						{isCashIn
							? "ФИО плательщика / сотрудника (необязательно)"
							: "ФИО получателя / инкассатора (необязательно)"}
					</label>
					<input
						id="cash-flow-person-input"
						type="text"
						placeholder={isCashIn ? "ФИО вносителя" : "ФИО получателя"}
						value={cashFlowPerson}
						onChange={(e) => setCashFlowPerson(e.target.value)}
						data-testid="input-cash-flow-person"
						className="w-full h-11 sm:h-9 px-3.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-sm text-[var(--ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--primary)]/30"
					/>
				</div>
			)}
		</div>
	);
};
