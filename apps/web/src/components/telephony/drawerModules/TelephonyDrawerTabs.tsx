import { ListOrdered, PhoneCall } from "lucide-react";
import React from "react";

export interface TelephonyDrawerTabsProps {
	activeTab: "call" | "journal";
	onSelectTab: (tab: "call" | "journal") => void;
}

export function TelephonyDrawerTabs({ activeTab, onSelectTab }: TelephonyDrawerTabsProps) {
	return (
		<div className="grid grid-cols-2 p-1.5 bg-[var(--paper-soft)] border-b border-[var(--line)] gap-1 shrink-0" role="tablist" aria-label="Вкладки телефонии">
			<button
				type="button"
				role="tab"
				aria-selected={activeTab === "call"}
				onClick={() => onSelectTab("call")}
				className={`min-h-[34px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
					activeTab === "call" ? "bg-[var(--paper-strong)] text-[var(--ink)] shadow-xs border border-[var(--line)]" : "text-[var(--muted)] hover:text-[var(--ink)]"
				}`}
				data-testid="telephony-tab-call"
			>
				<PhoneCall size={13} className="text-[var(--teal)]" />
				<span>Текущий вызов</span>
			</button>
			<button
				type="button"
				role="tab"
				aria-selected={activeTab === "journal"}
				onClick={() => onSelectTab("journal")}
				className={`min-h-[34px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
					activeTab === "journal" ? "bg-[var(--paper-strong)] text-[var(--ink)] shadow-xs border border-[var(--line)]" : "text-[var(--muted)] hover:text-[var(--ink)]"
				}`}
				data-testid="telephony-tab-journal"
			>
				<ListOrdered size={13} />
				<span>Журнал вызовов</span>
			</button>
		</div>
	);
}
