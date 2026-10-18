/**
 * apps/web/src/components/billing/depositModal/DepositTopupHeader.tsx
 *
 * Header for DepositTopupModal.
 * Strictly <= 120 lines per Mandate 8b.
 */

import React from "react";
import { Wallet, X } from "lucide-react";
import { formatDisplayCurrency } from "@dental/shared";

interface DepositTopupHeaderProps {
	readonly patientName: string;
	readonly currentDepositRub: number;
	readonly onClose: () => void;
}

export const DepositTopupHeader: React.FC<DepositTopupHeaderProps> = ({
	patientName,
	currentDepositRub,
	onClose,
}) => {
	return (
		<div className="flex items-center justify-between px-4 py-3 border-b border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] shrink-0">
			<div className="flex items-center gap-2.5">
				<div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0">
					<Wallet size={18} />
				</div>
				<div>
					<h2 id="deposit-modal-title" className="text-base font-extrabold text-[var(--ink,#0f172a)] m-0 leading-tight">
						Пополнение депозита пациента
					</h2>
					<div className="flex items-center gap-2 text-xs text-[var(--muted,#64748b)]">
						<span className="font-semibold text-[var(--ink,#0f172a)]">{patientName}</span>
						<span>· Текущий баланс: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{formatDisplayCurrency(currentDepositRub)}</strong></span>
					</div>
				</div>
			</div>

			<button
				type="button"
				onClick={onClose}
				className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f1f5f9)] transition-colors"
				aria-label="Закрыть"
				data-testid="btn-close-deposit-modal"
			>
				<X size={18} />
			</button>
		</div>
	);
};
