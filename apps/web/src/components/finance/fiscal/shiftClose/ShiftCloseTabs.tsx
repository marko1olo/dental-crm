/**
 * ShiftCloseTabs.tsx — Desktop & Mobile Tab Switchers for Shift Close Modal.
 * Apple HIG: >= 44px touch targets on mobile.
 */

import React from "react";
import { Layers } from "lucide-react";
import type { ShiftCloseActiveTab } from "./types";

export interface ShiftCloseTabsProps {
	readonly activeTab: ShiftCloseActiveTab;
	readonly onTabChange: (tab: ShiftCloseActiveTab) => void;
	readonly onOpenBatchModal: () => void;
}

export const ShiftCloseDesktopTabs: React.FC<ShiftCloseTabsProps> = ({
	activeTab,
	onTabChange,
	onOpenBatchModal,
}) => (
	<div className="hidden sm:flex items-center gap-1.5 bg-[var(--paper)] p-1 rounded-xl border border-[var(--line)] shadow-xs">
		<button
			type="button"
			onClick={() => onTabChange("reconciliation")}
			className={`btn-pill ${activeTab === "reconciliation" ? "active" : ""}`}
		>
			Сверка итогов
		</button>
		<button
			type="button"
			onClick={() => onTabChange("drawer")}
			className={`btn-pill ${activeTab === "drawer" ? "active" : ""}`}
		>
			Денежный ящик
		</button>
		<button
			type="button"
			onClick={() => onTabChange("tape")}
			className={`btn-pill ${activeTab === "tape" ? "active" : ""}`}
		>
			Печать на ленте
		</button>
		<button
			type="button"
			onClick={onOpenBatchModal}
			className="btn-pill flex items-center gap-1 text-[var(--muted)] hover:text-[var(--ink)]"
			title="Очередь чеков и сверка с эквайрингом перед закрытием смены"
		>
			<Layers className="w-3.5 h-3.5 shrink-0" />
			<span>Очередь чеков</span>
		</button>
	</div>
);

export const ShiftCloseMobileTabs: React.FC<ShiftCloseTabsProps> = ({
	activeTab,
	onTabChange,
	onOpenBatchModal,
}) => (
	<div className="sm:hidden mt-3 w-full">
		<div className="grid grid-cols-4 bg-[var(--paper-soft)] p-1 rounded-xl border border-[var(--line)] gap-1">
			<button
				type="button"
				onClick={() => onTabChange("reconciliation")}
				className={`min-h-[44px] py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap text-center flex items-center justify-center ${
					activeTab === "reconciliation" ? "bg-[var(--paper)] text-[var(--ink)] shadow-xs" : "text-[var(--muted)] hover:text-[var(--ink)]"
				}`}
			>
				Сверка
			</button>
			<button
				type="button"
				onClick={() => onTabChange("drawer")}
				className={`min-h-[44px] py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap text-center flex items-center justify-center ${
					activeTab === "drawer" ? "bg-[var(--paper)] text-[var(--ink)] shadow-xs" : "text-[var(--muted)] hover:text-[var(--ink)]"
				}`}
			>
				Ящик
			</button>
			<button
				type="button"
				onClick={() => onTabChange("tape")}
				className={`min-h-[44px] py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap text-center flex items-center justify-center ${
					activeTab === "tape" ? "bg-[var(--paper)] text-[var(--ink)] shadow-xs" : "text-[var(--muted)] hover:text-[var(--ink)]"
				}`}
			>
				Лента
			</button>
			<button
				type="button"
				onClick={onOpenBatchModal}
				className="min-h-[44px] py-1.5 rounded-lg text-xs font-bold text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)] transition-all cursor-pointer flex items-center justify-center whitespace-nowrap text-center"
				title="Очередь чеков и сверка с эквайрингом перед закрытием смены"
			>
				Очередь
			</button>
		</div>
	</div>
);
