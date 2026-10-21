/**
 * apps/web/src/components/patients/family/familyWalletModal/FamilyPooledBalanceCard.tsx
 * Aggregated family pooled balance display card with quick action buttons.
 * Mandate 8b: strictly <= 120 lines.
 */

import { ArrowDownRight, Plus, Wallet } from "lucide-react";
import React from "react";
import { money } from "../../../../AppHelpers";
import type { FamilyWalletTab } from "./types";

export interface FamilyPooledBalanceCardProps {
	readonly familyBalanceNumeric: number;
	readonly onNavigateTab: (tab: FamilyWalletTab) => void;
}

export const FamilyPooledBalanceCard: React.FC<FamilyPooledBalanceCardProps> =
	React.memo(function FamilyPooledBalanceCard({
		familyBalanceNumeric,
		onNavigateTab,
	}) {
		return (
			<div
				data-testid="family-wallet-pooled-balance"
				className="p-4 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs"
			>
				<div>
					<div className="flex items-center gap-1.5 text-xs text-[var(--muted)] font-medium">
						<Wallet className="w-4 h-4 text-[var(--teal)]" />
						<span>Общий семейный аванс (депозит):</span>
					</div>
					<div className="text-2xl font-black text-[var(--teal)] tracking-tight mt-1">
						{money(familyBalanceNumeric)}
					</div>
					<p className="text-[11px] text-[var(--muted)] m-0 mt-0.5">
						Доступен для оплаты процедур любого члена семьи без ограничений и
						комиссий.
					</p>
				</div>

				<div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
					<button
						type="button"
						onClick={() => onNavigateTab("topup")}
						className="flex-1 sm:flex-initial min-h-[44px] sm:min-h-[36px] h-9 px-3.5 bg-[var(--teal)] text-white text-xs font-semibold rounded-xl inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-xs hover:opacity-95 transition-opacity whitespace-nowrap"
					>
						<Plus className="w-4 h-4 shrink-0" />
						<span>Пополнить</span>
					</button>
					<button
						type="button"
						onClick={() => onNavigateTab("spend")}
						className="flex-1 sm:flex-initial min-h-[44px] sm:min-h-[36px] h-9 px-3.5 border border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink)] text-xs font-semibold rounded-xl inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs hover:bg-[var(--paper-soft)] transition-colors whitespace-nowrap"
					>
						<ArrowDownRight className="w-4 h-4 shrink-0" />
						<span>Оплатить</span>
					</button>
				</div>
			</div>
		);
	});
