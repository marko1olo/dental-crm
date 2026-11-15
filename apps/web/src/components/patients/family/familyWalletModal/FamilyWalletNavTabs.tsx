/**
 * apps/web/src/components/patients/family/familyWalletModal/FamilyWalletNavTabs.tsx
 * Segmented Navigation Tabs for Family Wallet.
 * Mandate 8b: strictly <= 120 lines.
 */

import {
	ArrowDownRight,
	FileText,
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
const TAB_ACTIVE =
	"border border-[var(--teal,#0d9488)] bg-[rgba(13,148,136,0.12)] text-[var(--teal-dark,#0f766e)] dark:text-[var(--teal,#0d9488)] shadow-xs";
const TAB_INACTIVE =
	"border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)]";

export const FamilyWalletNavTabs: React.FC<FamilyWalletNavTabsProps> =
	React.memo(function FamilyWalletNavTabs({ activeTab, setActiveTab }) {
		const isInfoActive = activeTab === "info" || activeTab === "overview";

		return (
			<div className="flex items-center px-4 py-2.5 border-b border-[var(--glass-border)] bg-[var(--paper)] gap-1.5 overflow-x-auto scrollbar-none shrink-0">
				<button
					type="button"
					data-testid="tab-family-wallet-overview"
					onClick={() => setActiveTab("info")}
					className={`${TAB_BTN_BASE} ${isInfoActive ? TAB_ACTIVE : TAB_INACTIVE}`}
				>
					<Wallet className="w-3.5 h-3.5 shrink-0" />
					<span className="hidden sm:inline">Состав семьи</span>
					<span className="sm:hidden inline">Инфо</span>
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
					<span>Оплатить</span>
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
				<button
					type="button"
					data-testid="tab-family-wallet-tax"
					onClick={() => setActiveTab("tax")}
					className={`${TAB_BTN_BASE} ${activeTab === "tax" ? TAB_ACTIVE : TAB_INACTIVE}`}
				>
					<FileText className="w-3.5 h-3.5 shrink-0" />
					<span className="hidden sm:inline">Справки ФНС</span>
					<span className="sm:hidden inline">ФНС 13%</span>
				</button>
			</div>
		);
	});
