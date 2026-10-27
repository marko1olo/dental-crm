import React from "react";
import { CheckCircle2, ShieldCheck } from "lucide-react";

export interface SinusMembraneSelectorProps {
	readonly selectedMembrane: string;
	readonly hasPins: boolean;
	readonly onMembraneSelect: (membrane: string) => void;
	readonly onTogglePins: () => void;
}

const MEMBRANE_OPTIONS = [
	{ label: "Bio-Gide 25x25 мм", short: "Bio-Gide 25×25" },
	{ label: "Jason мембрана", short: "Jason" },
	{ label: "Cytoplast d-PTFE", short: "Cytoplast" },
	{ label: "Без мембраны", short: "Без мембраны" },
] as const;

export const SinusMembraneSelector: React.FC<SinusMembraneSelectorProps> = ({
	selectedMembrane,
	hasPins,
	onMembraneSelect,
	onTogglePins,
}) => {
	return (
		<div className="space-y-1.5" data-testid="sinus-membrane-section">
			<span className="text-[11px] font-bold text-[var(--muted)]">Барьерная мембрана & Пины:</span>
			<div className="flex items-center gap-2 flex-wrap">
				{MEMBRANE_OPTIONS.map((m) => {
					const isSel = selectedMembrane.includes(m.short) || selectedMembrane === m.label;
					return (
						<button
							key={m.short}
							type="button"
							onClick={() => onMembraneSelect(m.label)}
							className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer touch-manipulation flex items-center gap-1.5 ${
								isSel
									? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] shadow-xs"
									: "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--teal,#0d9488)]"
							}`}
							data-testid={`btn-membrane-${m.short.replace(/[\s×]+/g, "-")}`}
						>
							{isSel && <CheckCircle2 size={13} className="shrink-0" />}
							<span>{m.short}</span>
						</button>
					);
				})}

				<button
					type="button"
					onClick={onTogglePins}
					className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer touch-manipulation flex items-center gap-1.5 ml-auto ${
						hasPins
							? "bg-[var(--teal-surface,rgba(13,148,136,0.1))] text-[var(--teal,#0d9488)] border border-[var(--teal,#0d9488)]"
							: "bg-[var(--paper)] text-[var(--muted)] border border-[var(--line)]"
					}`}
					data-testid="btn-toggle-titanium-pins"
				>
					<ShieldCheck size={14} />
					<span>{hasPins ? "Пины титановые: 2 шт" : "Без пинов"}</span>
				</button>
			</div>
		</div>
	);
};
