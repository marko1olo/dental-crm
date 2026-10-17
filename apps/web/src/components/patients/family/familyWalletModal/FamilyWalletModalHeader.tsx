/**
 * apps/web/src/components/patient/familyWalletModal/FamilyWalletModalHeader.tsx
 *
 * Layer 4: Header for Family Wallet Modal.
 * Clean clinical typography, 0% cartoon emojis, Lucide icons only.
 */

import React from "react";
import { Users, X } from "lucide-react";
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
						<p className="text-xs text-[var(--muted)] m-0 truncate">{subtitle}</p>
					</div>
				</div>

				<button
					type="button"
					data-testid="family-wallet-close-btn"
					onClick={onClose}
					className="border border-[var(--glass-border)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] min-h-[44px] sm:min-h-[32px] h-8 w-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-2xs"
					aria-label="Закрыть окно"
				>
					<X className="w-4 h-4" />
				</button>
			</div>
		);
	});
