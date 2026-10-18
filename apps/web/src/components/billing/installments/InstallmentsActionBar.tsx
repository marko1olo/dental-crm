/**
 * apps/web/src/components/billing/installments/InstallmentsActionBar.tsx
 *
 * Action buttons footer for PatientInstallmentsModal.
 * Strictly <= 120 lines per Mandate 8b.
 */

import React from "react";
import { Plus, MessageSquare, QrCode, CreditCard } from "lucide-react";
import type { InstallmentsSubView } from "./installmentsTypes.js";

interface InstallmentsActionBarProps {
	readonly activeSubView: InstallmentsSubView;
	readonly setActiveSubView: (v: InstallmentsSubView) => void;
	readonly isPlanCompleted: boolean;
	readonly onInitiateQuickPay: () => void;
	readonly onOpenBankInstallment?: (() => void) | undefined;
}

export const InstallmentsActionBar: React.FC<InstallmentsActionBarProps> = ({
	activeSubView,
	setActiveSubView,
	isPlanCompleted,
	onInitiateQuickPay,
	onOpenBankInstallment,
}) => {
	return (
		<div className="patient-installments-action-bar">
			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={() => setActiveSubView(activeSubView === "create_preset" ? "schedule" : "create_preset")}
					className="h-8 px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-xs font-semibold flex items-center gap-1.5 cursor-pointer text-[var(--ink)]"
					data-testid="btn-open-create-preset"
				>
					<Plus className="w-3.5 h-3.5 text-teal-600" />
					<span>Новый договор</span>
				</button>

				<button
					type="button"
					onClick={() => setActiveSubView(activeSubView === "reminder" ? "schedule" : "reminder")}
					className="h-8 px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-xs font-semibold flex items-center gap-1.5 cursor-pointer text-[var(--ink)]"
					data-testid="btn-open-reminder"
				>
					<MessageSquare className="w-3.5 h-3.5 text-teal-600" />
					<span>Напомнить пациенту</span>
				</button>

				{onOpenBankInstallment && (
					<button
						type="button"
						onClick={onOpenBankInstallment}
						className="h-8 px-3 rounded-lg border border-purple-500/40 bg-purple-50 dark:bg-purple-950/30 text-purple-800 dark:text-purple-200 hover:bg-purple-100 dark:hover:bg-purple-900/40 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
						data-testid="btn-open-bank-installment"
						title="Оформить банковскую рассрочку (Сбер / Т-Банк)"
					>
						<QrCode className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
						<span>Банковская рассрочка (QR)</span>
					</button>
				)}
			</div>

			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={onInitiateQuickPay}
					disabled={isPlanCompleted}
					className="h-8 px-4 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
					data-testid="btn-quick-pay-next"
				>
					<CreditCard className="w-3.5 h-3.5" />
					<span>Принять очередной взнос</span>
				</button>
			</div>
		</div>
	);
};
