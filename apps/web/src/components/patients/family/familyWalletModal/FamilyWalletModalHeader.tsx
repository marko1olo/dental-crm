/**
 * apps/web/src/components/patients/family/familyWalletModal/FamilyWalletModalHeader.tsx
 * Header for Family Wallet Modal with Lucide icons.
 * Mandate 8b: strictly <= 120 lines.
 */

import { Users, X } from "lucide-react";
import React from "react";
import type { FamilyGroupDetails } from "./types";

export interface FamilyWalletModalHeaderProps {
	readonly familyData: FamilyGroupDetails | null;
	readonly patientName?: string | null | undefined;
	readonly onClose: () => void;
}

export const FamilyWalletModalHeader: React.FC<FamilyWalletModalHeaderProps> =
	React.memo(function FamilyWalletModalHeader({
		familyData,
		patientName,
		onClose,
	}) {
		const title = familyData?.name?.trim() || "Семейный кошелек";
		const subtitle = patientName
			? `Пациент: ${patientName}`
			: "Общий семейный счет и баланс родственников";

		return (
			<div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--glass-border)] bg-[var(--paper-strong)] gap-3 shrink-0">
				<div className="flex items-center gap-3 min-w-0">
					<div className="w-10 h-10 rounded-xl bg-[var(--teal,var(--brand-primary))] text-white flex items-center justify-center shrink-0 shadow-xs">
						<Users className="w-5 h-5" />
					</div>
					<div className="min-w-0">
						<h2
							id="family-wallet-modal-title"
							className="text-base font-bold text-[var(--ink)] m-0 truncate"
						>
							{title}
						</h2>
						<p className="text-xs text-[var(--muted)] m-0 truncate">
							{subtitle}
						</p>
					</div>
				</div>

				<button
					type="button"
					data-testid="family-wallet-close-btn"
					onClick={onClose}
					className="border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] min-h-[44px] sm:min-h-[36px] h-9 w-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-2xs"
					aria-label="Закрыть окно"
				>
					<X className="w-4 h-4" />
				</button>
			</div>
		);
	});
