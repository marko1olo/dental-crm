/**
 * apps/web/src/components/patient/familyWalletModal/FamilyWalletNavTabs.tsx
 *
 * Layer 4: Segmented Navigation Tabs for Family Wallet.
 * 1-click tab switching with Apple HIG touch targets.
 */

import React from "react";
import {
	ArrowDownRight,
	ArrowRightLeft,
	Plus,
	RefreshCw,
	Wallet,
} from "lucide-react";
import type { FamilyWalletTab } from "./types";

export interface FamilyWalletNavTabsProps {
	readonly activeTab: FamilyWalletTab;
	readonly setActiveTab: (tab: FamilyWalletTab) => void;
}

export const FamilyWalletNavTabs: React.FC<FamilyWalletNavTabsProps> =
	React.memo(function FamilyWalletNavTabs({ activeTab, setActiveTab }) {
		const activeStyle: React.CSSProperties = {
			backgroundColor: "#0d9488",
			color: "#ffffff",
			borderColor: "#0d9488",
			padding: "0 10px",
		};
		const inactiveStyle: React.CSSProperties = {
			padding: "0 10px",
		};

		return (
			<div className="flex items-center px-4 py-2.5 border-b border-[var(--glass-border)] bg-[var(--paper)] gap-1.5 overflow-x-auto scrollbar-none shrink-0">
				<button
					type="button"
					data-testid="tab-family-wallet-overview"
					style={activeTab === "overview" ? activeStyle : inactiveStyle}
					className={`min-h-[44px] sm:min-h-[32px] h-8 px-2.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap select-none ${
						activeTab === "overview"
							? "border shadow-xs"
							: "border border-[var(--glass-border)] bg-[var(--paper-strong)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
					}`}
					onClick={() => setActiveTab("overview")}
				>
					<Wallet className="w-3.5 h-3.5 shrink-0" />
					<span>Обзор баланса</span>
				</button>

				<button
					type="button"
					data-testid="tab-family-wallet-topup"
					style={activeTab === "topup" ? activeStyle : inactiveStyle}
					className={`min-h-[44px] sm:min-h-[32px] h-8 px-2.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap select-none ${
						activeTab === "topup"
							? "border shadow-xs"
							: "border border-[var(--glass-border)] bg-[var(--paper-strong)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
					}`}
					onClick={() => setActiveTab("topup")}
				>
					<Plus className="w-3.5 h-3.5 shrink-0" />
					<span>Пополнить</span>
				</button>

				<button
					type="button"
					data-testid="tab-family-wallet-spend"
					style={activeTab === "spend" ? activeStyle : inactiveStyle}
					className={`min-h-[44px] sm:min-h-[32px] h-8 px-2.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap select-none ${
						activeTab === "spend"
							? "border shadow-xs"
							: "border border-[var(--glass-border)] bg-[var(--paper-strong)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
					}`}
					onClick={() => setActiveTab("spend")}
				>
					<ArrowDownRight className="w-3.5 h-3.5 shrink-0" />
					<span>Списать</span>
				</button>

				<button
					type="button"
					data-testid="tab-family-wallet-transfer"
					style={activeTab === "transfer" ? activeStyle : inactiveStyle}
					className={`min-h-[44px] sm:min-h-[32px] h-8 px-2.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap select-none ${
						activeTab === "transfer"
							? "border shadow-xs"
							: "border border-[var(--glass-border)] bg-[var(--paper-strong)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
					}`}
					onClick={() => setActiveTab("transfer")}
				>
					<ArrowRightLeft className="w-3.5 h-3.5 shrink-0" />
					<span>Перевод</span>
				</button>

				<button
					type="button"
					data-testid="tab-family-wallet-history"
					style={activeTab === "history" ? activeStyle : inactiveStyle}
					className={`min-h-[44px] sm:min-h-[32px] h-8 px-2.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap select-none ${
						activeTab === "history"
							? "border shadow-xs"
							: "border border-[var(--glass-border)] bg-[var(--paper-strong)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
					}`}
					onClick={() => setActiveTab("history")}
				>
					<RefreshCw className="w-3.5 h-3.5 shrink-0" />
					<span>История</span>
				</button>
			</div>
		);
	});
