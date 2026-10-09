/**
 * DENTE CRM — Mobile Patient Finance Tab (Финансы и счета)
 * (Apple HIG & Anti-Desktop-Squeeze Mandate)
 *
 * Layer 4: Patient Balance Hero Card, Invoices List, POS Tender Trigger.
 */

import type { Patient } from "@dental/shared";
import { Receipt } from "lucide-react";
import React from "react";
import { useAppStore } from "../../../store/appStore";
import { usePatientStore } from "../../../store/patientStore";
import { showToast } from "../../GlobalToast";

export interface MobilePatientFinanceTabProps {
	patient: Patient;
	patientInvoices: any[];
	balanceRub: number;
	money: (amountRub: number) => string;
	onOpenCashier?: (() => void) | undefined;
}

export const MobilePatientFinanceTab: React.FC<MobilePatientFinanceTabProps> = ({
	patient,
	patientInvoices,
	balanceRub,
	money,
	onOpenCashier,
}) => {
	const fullName = patient.fullName || "Пациент";

	const handleOpenCashier = () => {
		if (onOpenCashier) {
			onOpenCashier();
			return;
		}
		usePatientStore.getState().setSelectedPatientId(patient.id);
		useAppStore.getState().setCurrentView("finance");
		showToast(`Переход в кассу для ${fullName}`, "info");
	};

	return (
		<div className="flex flex-col gap-3" data-testid="mobile-panel-finance">
			{/* Balance Hero Card */}
			<div className="p-4 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs flex flex-col gap-2">
				<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
					Текущий баланс пациента:
				</span>
				<div className="flex items-baseline justify-between">
					<span
						className={`text-2xl font-black font-mono ${
							balanceRub > 0
								? "text-emerald-600 dark:text-emerald-400"
								: balanceRub < 0
									? "text-rose-600 dark:text-rose-400"
									: "text-[var(--ink)]"
						}`}
						data-testid="mobile-patient-balance-value"
					>
						{balanceRub > 0 ? `+${money(balanceRub)}` : money(balanceRub)}
					</span>
					<span className="text-xs text-[var(--muted)] font-medium">
						{balanceRub > 0 ? "Аванс / Депозит" : balanceRub < 0 ? "Задолженность" : "Оплачено полностью"}
					</span>
				</div>

				<div className="pt-2 flex gap-2">
					<button
						type="button"
						onClick={handleOpenCashier}
						className="flex-1 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-all"
						data-testid="mobile-btn-open-cashier"
					>
						<Receipt size={15} />
						<span>Касса и оплата</span>
					</button>
				</div>
			</div>

			{/* Invoices List */}
			<div className="flex flex-col gap-2">
				<h3 className="text-xs font-black uppercase tracking-wider text-[var(--muted)] m-0">
					История счетов и платежей ({patientInvoices.length})
				</h3>

				{patientInvoices.length === 0 ? (
					<div className="p-6 text-center rounded-2xl bg-[var(--paper)] border border-[var(--line)] text-xs text-[var(--muted)]">
						У пациента нет выставленных счетов. Все оказанные услуги закрыты.
					</div>
				) : (
					patientInvoices.map((inv: any) => (
						<div
							key={inv.id}
							className="p-3 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between text-xs"
						>
							<div>
								<div className="font-bold text-[var(--ink)]">Счёт № {inv.number || inv.id?.slice(0, 8)}</div>
								<div className="text-[11px] text-[var(--muted)]">
									{new Date(inv.createdAt || Date.now()).toLocaleDateString("ru-RU")}
								</div>
							</div>
							<div className="text-right">
								<div className="font-mono font-bold text-[var(--ink)]">{money(inv.amount || 0)}</div>
								<span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold">
									Оплачен
								</span>
							</div>
						</div>
					))
				)}
			</div>
		</div>
	);
};
