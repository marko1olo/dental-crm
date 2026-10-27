/**
 * apps/web/src/components/billing/installments/InstallmentsActionBar.tsx
 *
 * Action buttons footer for PatientInstallmentsModal.
 * Strictly <= 120 lines per Mandate 8b.
 */

import React from "react";
import { Plus, MessageSquare, QrCode, CreditCard } from "lucide-react";
import { showToast } from "../../GlobalToast.js";
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
	const handleQuickPayClick = () => {
		if (isPlanCompleted) {
			showToast("План рассрочки полностью закрыт (100%)", "info");
			return;
		}
		onInitiateQuickPay();
	};

	return (
		<div className="patient-installments-action-bar">
			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={() => setActiveSubView(activeSubView === "create_preset" ? "schedule" : "create_preset")}
					className="min-h-[44px] sm:min-h-[32px] sm:h-8 px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-xs font-semibold flex items-center gap-1.5 cursor-pointer text-[var(--ink)]"
					data-testid="btn-open-create-preset"
				>
					<Plus className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
					<span>Новый договор</span>
				</button>

				<button
					type="button"
					onClick={() => setActiveSubView(activeSubView === "reminder" ? "schedule" : "reminder")}
					className="min-h-[44px] sm:min-h-[32px] sm:h-8 px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-xs font-semibold flex items-center gap-1.5 cursor-pointer text-[var(--ink)]"
					data-testid="btn-open-reminder"
				>
					<MessageSquare className="w-3.5 h-3.5 text-[var(--muted,#64748b)]" />
					<span>Напомнить пациенту</span>
				</button>

				{onOpenBankInstallment && (
					<button
						type="button"
						onClick={onOpenBankInstallment}
						className="min-h-[44px] sm:min-h-[32px] sm:h-8 px-3 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
						data-testid="btn-open-bank-installment"
						title="Оформить банковскую рассрочку (Сбер / Т-Банк)"
					>
						<QrCode className="w-3.5 h-3.5 text-[var(--muted,#64748b)]" />
						<span>Банковская рассрочка (QR)</span>
					</button>
				)}
			</div>

			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={handleQuickPayClick}
					className="min-h-[44px] sm:min-h-[36px] sm:h-9 px-4 rounded-lg bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-strong,#0f766e)] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
					data-testid="btn-quick-pay-next"
				>
					<CreditCard className="w-3.5 h-3.5" />
					<span>Принять очередной взнос</span>
				</button>
			</div>
		</div>
	);
};
