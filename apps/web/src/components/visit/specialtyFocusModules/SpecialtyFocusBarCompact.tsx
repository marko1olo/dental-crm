import React from "react";
import { ChevronDown, FileText } from "lucide-react";

export interface SpecialtyFocusBarCompactProps {
	specialtyName: string;
	activeTooth: number | null;
	isProtocolDrawerOpen: boolean;
	setIsProtocolDrawerOpen: (valOrFn: any) => void;
}

export function SpecialtyFocusBarCompact({
	specialtyName,
	activeTooth,
	isProtocolDrawerOpen,
	setIsProtocolDrawerOpen,
}: SpecialtyFocusBarCompactProps) {
	return (
		<div
			data-testid="visit-specialty-focus"
			className="specialty-focus-bar-compact flex flex-nowrap items-center justify-between gap-1.5 px-2.5 py-1 mb-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-2xs min-h-[30px] h-[30px] overflow-x-auto scrollbar-none"
		>
			<div className="flex items-center gap-1.5 shrink-0">
				<span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider shrink-0 hidden sm:inline">
					Фокус:
				</span>
				<span className="text-xs font-semibold text-[var(--ink)] shrink-0">
					{specialtyName}
				</span>
				<span className="text-xs font-mono text-[var(--teal)] font-bold shrink-0">
					(Зуб {activeTooth || "—"})
				</span>
			</div>

			<div className="flex items-center gap-1.5 shrink-0 ml-auto">
				<button
					type="button"
					data-testid="toggle-specialty-protocol-drawer"
					onClick={() => setIsProtocolDrawerOpen((prev: boolean) => !prev)}
					className="border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-bold rounded-lg px-2.5 py-1 text-xs shadow-2xs hover:border-[var(--teal)] hover:text-[var(--teal)] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
					title="Развернуть специализированный бланк приема"
					aria-expanded={isProtocolDrawerOpen}
					aria-label="Специализированный клинический бланк"
				>
					<FileText size={12} className="text-[var(--teal)] shrink-0" />
					<span className="hidden sm:inline">Бланк: {specialtyName}</span>
					<span className="sm:hidden">Бланк</span>
					<ChevronDown size={11} className={`shrink-0 transition-transform duration-150 ${isProtocolDrawerOpen ? "rotate-180" : ""}`} />
				</button>
			</div>
		</div>
	);
}
