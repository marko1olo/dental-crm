import React from "react";
import { Zap } from "lucide-react";
import { WORKHORSE_ARCHWIRES, type WorkhorseArchwireOption } from "@dental/shared";
import type { ArchwireMaterial, ArchwireSection } from "../types";

export interface WorkhorseWiresStripProps {
	readonly archwireMaterial: ArchwireMaterial;
	readonly archwireSection: ArchwireSection;
	readonly onSelectWorkhorseArchwire: (wire: WorkhorseArchwireOption) => void;
}

export const WorkhorseWiresStrip: React.FC<WorkhorseWiresStripProps> = ({
	archwireMaterial,
	archwireSection,
	onSelectWorkhorseArchwire,
}) => {
	return (
		<div
			data-testid="ortho-workhorse-wires-strip"
			className="mt-1 p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-1.5"
		>
			<div className="flex items-center justify-between">
				<span className="text-[12px] font-bold uppercase tracking-wider text-[var(--ink)] flex items-center gap-1">
					<Zap size={14} className="text-[var(--primary)]" />
					Рабочие дуги ортодонта
				</span>
				<span className="text-[12px] text-[var(--muted)] font-medium">
					Мгновенный выбор материала и сечения
				</span>
			</div>

			<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5">
				{WORKHORSE_ARCHWIRES.map((wire) => {
					const isSelected = archwireMaterial === wire.material && archwireSection === wire.section;
					const wireSubtitle = wire.material === "SS" ? "Рабочая сталь" : wire.material === "TMA" ? "Юстировка" : wire.section === ".016x.022" ? "Контроль торка" : "Нивелирование";
					return (
						<button
							key={wire.id}
							type="button"
							onClick={() => onSelectWorkhorseArchwire(wire)}
							data-testid={`quick-wire-${wire.id}-btn`}
							className={`h-10 px-2.5 py-1 rounded-xl border text-left flex flex-col justify-center min-w-0 transition-all cursor-pointer ${
								isSelected
									? "bg-[var(--primary)] text-white border-[var(--primary)] font-bold shadow-xs"
									: "bg-[var(--paper)] border-[var(--line)] hover:border-[var(--line-strong,var(--primary))] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
							}`}
							title={wire.desc}
						>
							<span className="text-[12.5px] font-bold leading-tight truncate w-full">{wire.label}</span>
							<span className={`text-[11.5px] truncate w-full ${isSelected ? "text-white/80" : "text-[var(--muted)]"}`}>
								{wireSubtitle}
							</span>
						</button>
					);
				})}
			</div>
		</div>
	);
};
