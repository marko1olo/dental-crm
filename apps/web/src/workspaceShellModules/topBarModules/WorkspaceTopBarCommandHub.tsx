/**
 * DENTE Dental CRM — Central Island: Unified Command Hub / Search (Layer 4)
 * 
 * Mandate 8d (Apple HIG / Studio Clinical Standard), Mandate 8e (Doctor Autonomy)
 * 1-click & Ctrl+K Omnibar Spotlight trigger.
 */

import React from "react";
import { Search } from "lucide-react";
import { workspaceTopbarLabels } from "../../workspaceUiLabels";

export function WorkspaceTopBarCommandHub() {
	const handleOpenCommandHud = () => {
		if (typeof window !== "undefined") {
			window.dispatchEvent(new CustomEvent("dente:open-command-hud"));
		}
	};

	return (
		<div className="topbar-command-hub flex-1 max-w-[420px] mx-auto hidden sm:flex items-center z-10">
			<button
				type="button"
				id="topbar-command-hud-btn"
				data-testid="topbar-command-hud-btn"
				onClick={handleOpenCommandHud}
				className="w-full h-8 px-3 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--paper)] border border-[var(--line)] hover:border-[var(--teal)] text-[var(--muted)] hover:text-[var(--text)] transition-all flex items-center justify-between gap-2 shadow-xs group cursor-pointer"
				title={workspaceTopbarLabels.commandHud.title}
				aria-label={workspaceTopbarLabels.commandHud.label}
			>
				<span className="flex items-center gap-2 truncate text-xs text-[var(--muted-darker)] group-hover:text-[var(--text)] font-medium">
					<Search size={14} className="text-[var(--teal)] shrink-0 opacity-80 group-hover:opacity-100" aria-hidden="true" />
					<span className="truncate">Поиск пациента, карты, команды...</span>
				</span>
				<kbd className="hidden md:inline-flex items-center text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-[var(--paper)] border border-[var(--line)] text-[var(--muted)] shrink-0">
					Ctrl+K
				</kbd>
			</button>
		</div>
	);
}
