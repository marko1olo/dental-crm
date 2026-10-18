/**
 * apps/web/src/components/billing/installments/InstallmentsHeader.tsx
 *
 * Header and last receipt notice for PatientInstallmentsModal.
 * Strictly <= 120 lines per Mandate 8b.
 */

import React from "react";
import { Wallet, X, CheckCircle2, Clock, AlertTriangle, ShieldCheck, Receipt } from "lucide-react";
import type { InstallmentPlan, FiscalReceipt54FzResult } from "../installmentsEngine.js";

interface InstallmentsHeaderProps {
	readonly plan: InstallmentPlan;
	readonly patientName: string;
	readonly lastReceipt: FiscalReceipt54FzResult | null;
	readonly onClose: () => void;
	readonly onDismissReceipt: () => void;
}

export const InstallmentsHeader: React.FC<InstallmentsHeaderProps> = ({
	plan,
	patientName,
	lastReceipt,
	onClose,
	onDismissReceipt,
}) => {
	const statusBadgeConfig = {
		on_schedule: { label: "По графику", className: "patient-installments-badge-on-schedule", icon: CheckCircle2 },
		due: { label: "Очередной платеж ожидает оплаты", className: "patient-installments-badge-due", icon: Clock },
		overdue: { label: "Просрочен", className: "patient-installments-badge-overdue", icon: AlertTriangle },
		completed: { label: "Полностью выплачен", className: "patient-installments-badge-completed", icon: ShieldCheck },
	}[plan.status];

	const StatusIcon = statusBadgeConfig.icon;

	return (
		<>
			<div className="patient-installments-header">
				<div className="flex flex-col gap-0.5 min-w-0">
					<div className="flex items-center gap-2 flex-wrap">
						<span className="font-bold text-sm text-[var(--ink)] flex items-center gap-1.5" id="modal-title">
							<Wallet className="w-4 h-4 text-teal-600 shrink-0" />
							<span>Внутренняя рассрочка клиники (0%)</span>
						</span>
						<span className="text-xs text-[var(--muted)]">•</span>
						<span className="text-xs font-semibold text-[var(--muted)] truncate max-w-[200px]">
							{plan.contractNumber}
						</span>
						<span
							className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${statusBadgeConfig.className}`}
							data-testid="plan-status-badge"
						>
							<StatusIcon className="w-3 h-3 shrink-0" />
							<span>{statusBadgeConfig.label}</span>
						</span>
					</div>
					<div className="text-xs text-[var(--muted)] truncate">
						Пациент: <strong className="text-[var(--ink)]">{patientName}</strong> • {plan.treatmentTitle}
					</div>
				</div>

				<button
					type="button"
					onClick={onClose}
					className="w-8 h-8 rounded-lg border border-[var(--line)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer transition-colors shrink-0"
					aria-label="Закрыть модальное окно рассрочки"
					data-testid="btn-close-installments-modal"
				>
					<X className="w-4 h-4" />
				</button>
			</div>

			{lastReceipt && (
				<div className="mx-4 mt-3 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/40 flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-100 animate-fadeIn">
					<div className="flex items-center gap-2">
						<Receipt className="w-4 h-4 text-emerald-600 shrink-0" />
						<span>
							Чек: <strong>{lastReceipt.receiptNumber}</strong> на сумму <strong>{lastReceipt.formattedAmount}</strong> ({lastReceipt.paymentMethodRu}, {lastReceipt.calculationTypeNameRu}).
						</span>
					</div>
					<button
						type="button"
						onClick={onDismissReceipt}
						className="text-emerald-700 hover:text-emerald-950 text-[11px] underline cursor-pointer"
					>
						Скрыть
					</button>
				</div>
			)}
		</>
	);
};
