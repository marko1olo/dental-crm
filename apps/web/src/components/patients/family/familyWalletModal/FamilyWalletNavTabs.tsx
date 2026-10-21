/**
 * apps/web/src/components/patients/family/familyWalletModal/FamilyWalletNavTabs.tsx
 * Segmented Navigation Tabs for Family Wallet.
 * Mandate 8b: strictly <= 120 lines.
 */

import {
	ArrowDownRight,
	ArrowRightLeft,
	Plus,
	RefreshCw,
	Wallet,
} from "lucide-react";
import React from "react";
import type { FamilyWalletTab } from "./types";

export interface FamilyWalletNavTabsProps {
	readonly activeTab: FamilyWalletTab;
	readonly setActiveTab: (tab: FamilyWalletTab) => void;
}

const TAB_BTN_BASE =
	"min-h-[44px] sm:min-h-[36px] h-9 px-3 text-xs font-semibold rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap select-none";
const TAB_ACTIVE = "bg-[var(--teal)] text-white shadow-xs";
const TAB_INACTIVE =
	"border border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink)] hover:bg-[var(--paper-soft)]";

export const FamilyWalletNavTabs: React.FC<FamilyWalletNavTabsProps> =
	React.memo(function FamilyWalletNavTabs({ activeTab, setActiveTab }) {
		return (
			<div className="flex items-center px-4 py-2.5 border-b border-[var(--glass-border)] bg-[var(--paper)] gap-1.5 overflow-x-auto scrollbar-none shrink-0">
				<button
					type="button"
					data-testid="tab-family-wallet-overview"
					onClick={() => setActiveTab("overview")}
					className={`${TAB_BTN_BASE} ${activeTab === "overview" ? TAB_ACTIVE : TAB_INACTIVE}`}
				>
					<Wallet className="w-3.5 h-3.5 shrink-0" />
					<span className="hidden sm:inline">Обзор баланса</span>
					<span className="sm:hidden inline">Обзор</span>
				</button>
				<button
					type="button"
					data-testid="tab-family-wallet-topup"
					onClick={() => setActiveTab("topup")}
					className={`${TAB_BTN_BASE} ${activeTab === "topup" ? TAB_ACTIVE : TAB_INACTIVE}`}
				>
					<Plus className="w-3.5 h-3.5 shrink-0" />
					<span>Пополнить</span>
				</button>
				<button
					type="button"
					data-testid="tab-family-wallet-spend"
					onClick={() => setActiveTab("spend")}
					className={`${TAB_BTN_BASE} ${activeTab === "spend" ? TAB_ACTIVE : TAB_INACTIVE}`}
				>
					<ArrowDownRight className="w-3.5 h-3.5 shrink-0" />
					<span>Списать</span>
				</button>
				<button
					type="button"
					data-testid="tab-family-wallet-transfer"
					onClick={() => setActiveTab("transfer")}
					className={`${TAB_BTN_BASE} ${activeTab === "transfer" ? TAB_ACTIVE : TAB_INACTIVE}`}
				>
					<ArrowRightLeft className="w-3.5 h-3.5 shrink-0" />
					<span>Перевод</span>
				</button>
				<button
					type="button"
					data-testid="tab-family-wallet-history"
					onClick={() => setActiveTab("history")}
					className={`${TAB_BTN_BASE} ${activeTab === "history" ? TAB_ACTIVE : TAB_INACTIVE}`}
				>
					<RefreshCw className="w-3.5 h-3.5 shrink-0" />
					<span>История</span>
				</button>
			</div>
		);
	});
