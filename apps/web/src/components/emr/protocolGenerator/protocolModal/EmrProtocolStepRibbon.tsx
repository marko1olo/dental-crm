import React from "react";
import { ChevronRight, ShieldCheck } from "lucide-react";

export const EmrProtocolStepRibbon: React.FC = React.memo(
	function EmrProtocolStepRibbon() {
		return (
			<div className="mx-4 sm:mx-6 mt-3 sm:mt-4 p-2 sm:p-2.5 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] flex items-center gap-2 text-xs flex-wrap shrink-0">
				<div className="flex items-center gap-1.5 font-bold text-[var(--teal,#0d9488)]">
					<span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] text-[10px]">
						1
					</span>
					<span>Шаг 1: Диагноз МКБ-10 и зуб</span>
				</div>
				<ChevronRight size={14} className="text-[var(--muted,#64748b)] hidden sm:inline" />
				<div className="flex items-center gap-1.5 font-bold text-[var(--teal,#0d9488)]">
					<span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] text-[10px]">
						2
					</span>
					<span>Шаг 2: Протокол лечения</span>
				</div>
				<ChevronRight size={14} className="text-[var(--muted,#64748b)] hidden sm:inline" />
				<div className="flex items-center gap-1.5 font-bold text-[var(--ok-fg,#059669)]">
					<span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--ok-fg,#059669)] text-[var(--on-teal,#ffffff)] text-[10px]">
						3
					</span>
					<span>Шаг 3: Внесите в карту</span>
				</div>
				<div className="ml-auto flex items-center gap-1 text-[var(--muted,#64748b)] text-[11px]">
					<ShieldCheck size={13} className="text-[var(--ok-fg,#059669)]" />
					<span>Готов к переносу в медицинскую карту</span>
				</div>
			</div>
		);
	},
);
