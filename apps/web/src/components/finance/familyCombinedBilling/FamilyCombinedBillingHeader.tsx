import React from "react";
import { ShieldCheck, Users, X } from "lucide-react";
import type { FamilyBillingPayerProfile } from "@dental/shared";
import { formatAvailableForDebitLabel, formatFamilyBalanceLabel } from "../familyWalletHelpers";

interface FamilyCombinedBillingHeaderProps {
	readonly familyGroupName: string;
	readonly availableFamilyWalletRub: number;
	readonly initialPayer: FamilyBillingPayerProfile;
	readonly onClose: () => void;
}

export function FamilyCombinedBillingHeader({
	familyGroupName,
	availableFamilyWalletRub,
	initialPayer,
	onClose,
}: FamilyCombinedBillingHeaderProps) {
	return (
		<div className="p-4 sm:p-5 border-b border-[var(--line,#e2e8f0)] flex items-center justify-between gap-3 bg-[var(--paper-soft,#f8fafc)] shrink-0">
			<div className="flex items-center gap-3">
				<div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
					<Users size={22} />
				</div>
				<div>
					<div className="flex items-center gap-2 flex-wrap">
						<h2 id="family-billing-title" className="text-base sm:text-lg font-black m-0 text-[var(--ink,#0f172a)]">
							Семейный расчет и объединенная оплата
						</h2>
						<span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30">
							{familyGroupName}
						</span>
						<span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border border-emerald-500/30">
							{formatFamilyBalanceLabel(availableFamilyWalletRub, initialPayer.payerFullName)}
						</span>
					</div>
					<p className="text-xs text-[var(--muted,#64748b)] m-0 mt-0.5 flex items-center gap-2 flex-wrap">
						<span>Плательщик: <strong>{initialPayer.payerFullName || "Ответственный плательщик"}</strong></span>
						{initialPayer.payerInn && <span>· ИНН: <strong className="font-mono">{initialPayer.payerInn}</strong></span>}
						<span>· <strong className="text-emerald-600">{formatAvailableForDebitLabel(availableFamilyWalletRub)}</strong></span>
						<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
							<ShieldCheck className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
							<span>ИНН с пациентов-физлиц не требуется</span>
						</span>
					</p>
				</div>
			</div>

			<button
				type="button"
				onClick={onClose}
				className="min-h-[44px] min-w-[44px] rounded-xl border border-[var(--line,#e2e8f0)] flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] transition-colors cursor-pointer"
				aria-label="Закрыть"
				data-testid="btn-close-family-billing-modal"
			>
				<X size={18} />
			</button>
		</div>
	);
}
