/**
 * apps/web/src/components/billing/installments/InstallmentsQuickPaySubView.tsx
 *
 * Quick tranche payment panel for PatientInstallmentsModal.
 * Strictly <= 120 lines per Mandate 8b.
 */

import React from "react";
import { CreditCard, Check } from "lucide-react";
import { formatKopecksRu } from "@dental/shared";
import type { InstallmentPlan } from "../installmentsEngine.js";

interface InstallmentsQuickPaySubViewProps {
	readonly plan: InstallmentPlan;
	readonly selectedPaymentItemId: string | null;
	readonly setSelectedPaymentItemId: (id: string) => void;
	readonly customPayAmountRub: string;
	readonly setCustomPayAmountRub: (val: string) => void;
	readonly selectedPaymentMethod: "card" | "cash" | "sbp";
	readonly setSelectedPaymentMethod: (m: "card" | "cash" | "sbp") => void;
	readonly onCancel: () => void;
	readonly onExecutePayment: () => void;
}

export const InstallmentsQuickPaySubView: React.FC<InstallmentsQuickPaySubViewProps> = ({
	plan,
	selectedPaymentItemId,
	setSelectedPaymentItemId,
	customPayAmountRub,
	setCustomPayAmountRub,
	selectedPaymentMethod,
	setSelectedPaymentMethod,
	onCancel,
	onExecutePayment,
}) => {
	return (
		<div className="p-4 bg-[var(--paper-soft)] border-b border-[var(--line)]" data-testid="section-quick-pay">
			<div className="flex items-center justify-between mb-3">
				<span className="font-bold text-xs uppercase tracking-wider text-[var(--ink)] flex items-center gap-1.5">
					<CreditCard className="w-3.5 h-3.5 text-teal-600" />
					<span>Внести взнос по рассрочке</span>
				</span>
				<button type="button" onClick={onCancel} className="text-xs text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer">
					Отмена
				</button>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
				<div>
					<label className="text-[11px] font-semibold text-[var(--muted)] block mb-1">Целевой взнос</label>
					<select
						value={selectedPaymentItemId || ""}
						onChange={(e) => setSelectedPaymentItemId(e.target.value)}
						className="w-full h-8 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] px-2 outline-none focus:border-teal-500"
					>
						{plan.schedule.map((item) => (
							<option key={item.id} value={item.id} disabled={item.paidKopecks >= item.amountKopecks}>
								{item.title} — {formatKopecksRu(item.amountKopecks)} {item.paidKopecks >= item.amountKopecks ? "(Оплачен)" : ""}
							</option>
						))}
					</select>
				</div>

				<div>
					<label className="text-[11px] font-semibold text-[var(--muted)] block mb-1">Сумма к оплате (₽)</label>
					<input
						type="number"
						value={customPayAmountRub}
						onChange={(e) => setCustomPayAmountRub(e.target.value)}
						className="w-full h-8 text-xs font-mono font-bold rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] px-2 outline-none focus:border-teal-500"
					/>
				</div>

				<div>
					<label className="text-[11px] font-semibold text-[var(--muted)] block mb-1">Способ оплаты</label>
					<div className="flex gap-1">
						{(["card", "cash", "sbp"] as const).map((m) => (
							<button
								key={m}
								type="button"
								onClick={() => setSelectedPaymentMethod(m)}
								className={`flex-1 h-8 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
									selectedPaymentMethod === m
										? "bg-teal-600 text-white border-teal-600"
										: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)]"
								}`}
							>
								{m === "card" ? "Карта" : m === "cash" ? "Нал" : "СБП 0%"}
							</button>
						))}
					</div>
				</div>
			</div>

			<div className="mt-3 flex justify-end gap-2">
				<button
					type="button"
					onClick={onExecutePayment}
					className="h-8 px-4 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
					data-testid="btn-confirm-installment-payment"
				>
					<Check className="w-3.5 h-3.5" />
					<span>Пробить чек и закрыть взнос</span>
				</button>
			</div>
		</div>
	);
};
