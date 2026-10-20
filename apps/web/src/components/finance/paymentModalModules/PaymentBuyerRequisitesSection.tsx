import React from "react";
import { ShieldCheck, User } from "lucide-react";
import type { PaymentLogicResult } from "./types.js";

export interface PaymentBuyerRequisitesSectionProps {
	readonly tendersHook: PaymentLogicResult["tendersHook"];
}

export const PaymentBuyerRequisitesSection: React.FC<PaymentBuyerRequisitesSectionProps> = ({
	tendersHook,
}) => {
	return (
		<div className="p-3.5 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] space-y-2 text-xs" data-testid="payer-type-section">
			<div className="flex gap-2">
				<button
					type="button"
					onClick={() => tendersHook.setPayerType("physical")}
					aria-pressed={tendersHook.payerType === "physical"}
					className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
						tendersHook.payerType === "physical"
							? "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border border-[var(--line,#cbd5e1)]"
							: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
					}`}
					data-testid="tab-payer-physical"
				>
					Физлицо (пациент)
				</button>
				<button
					type="button"
					onClick={() => tendersHook.setPayerType("legal_entity")}
					aria-pressed={tendersHook.payerType === "legal_entity"}
					className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
						tendersHook.payerType === "legal_entity"
							? "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border border-[var(--line,#cbd5e1)]"
							: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
					}`}
					data-testid="tab-payer-legal"
				>
					Юрлицо / Организация
				</button>
			</div>
			<div className="flex items-center justify-between flex-wrap gap-2">
				<div className="flex items-center gap-1.5 font-bold text-[var(--ink,#0f172a)]">
					<User size={14} className="text-teal-600" />
					<span>Реквизиты плательщика чека:</span>
				</div>
				<span
					className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 flex items-center"
					data-testid="inn-physical-not-required-badge"
					title="ИНН с пациентов-физлиц не требуется"
				>
					<ShieldCheck size={12} className="inline mr-1 text-emerald-600" />
					По 54-ФЗ для физлиц не требуется
				</span>
			</div>

			<div className="flex items-center gap-2">
				<input
					type="text"
					value={tendersHook.buyerInn}
					onChange={(e) => tendersHook.handleInnChange(e.target.value)}
					placeholder={
						tendersHook.payerType === "legal_entity"
							? "ИНН организации или ИП (10 или 12 цифр для юрлиц)"
							: "ИНН пациента (необязательно, для справки налогового вычета 13%)"
					}
					maxLength={12}
					className="h-8 w-full px-3 text-xs font-mono bg-[var(--paper,#ffffff)] border border-[var(--line,#cbd5e1)] rounded-lg text-[var(--ink,#0f172a)] outline-none focus:border-teal-500 shadow-2xs"
					data-testid="input-buyer-inn-physical"
				/>
			</div>
			{tendersHook.buyerInnError && (
				<div className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
					{tendersHook.buyerInnError}
				</div>
			)}
		</div>
	);
};
