import React from "react";
import { Sliders } from "lucide-react";
import { showToast } from "../../../GlobalToast";
import { TORQUE_PRESETS, ANGULATION_PRESETS } from "./archwireConstants";

export interface TorqueAngulationPanelProps {
	readonly torquePreset: string;
	readonly setTorquePreset: (p: string) => void;
	readonly angulationPreset: string;
	readonly setAngulationPreset: (p: string) => void;
}

export const TorqueAngulationPanel: React.FC<TorqueAngulationPanelProps> = ({
	torquePreset,
	setTorquePreset,
	angulationPreset,
	setAngulationPreset,
}) => {
	return (
		<div
			data-testid="ortho-torque-angulation-panel"
			className="bg-[var(--paper-soft)] p-3 rounded-xl border border-[var(--line)] flex flex-col gap-2.5"
		>
			<div className="flex items-center justify-between flex-wrap gap-1.5">
				<span className="text-xs font-black uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
					<Sliders size={14} className="text-[var(--primary)]" />
					Расчет торка и ангуляции
				</span>
				<span className="text-[12px] font-bold text-[var(--primary)]">
					{TORQUE_PRESETS.find((t) => t.id === torquePreset)?.shortLabel}
				</span>
			</div>

			<div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
				{TORQUE_PRESETS.map((tOpt) => {
					const isSelected = torquePreset === tOpt.id;
					return (
						<button
							key={tOpt.id}
							type="button"
							onClick={() => {
								setTorquePreset(tOpt.id);
								showToast(`Выбран торк: ${tOpt.label}`, "info");
							}}
							data-testid={`torque-preset-${tOpt.id}-btn`}
							className={`h-10 px-2.5 py-1 rounded-xl border text-left flex flex-col justify-center min-w-0 transition-all cursor-pointer ${
								isSelected
									? "bg-[var(--primary)] text-white border-[var(--primary)] font-bold shadow-xs"
									: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
							}`}
							title={tOpt.desc}
						>
							<span className="text-[12.5px] font-bold leading-tight truncate w-full">{tOpt.shortLabel}</span>
							<span className={`text-[11.5px] truncate w-full ${isSelected ? "text-white/80" : "text-[var(--muted)]"}`}>
								ВЧ {tOpt.u1Torque} / НЧ {tOpt.l1Torque}
							</span>
						</button>
					);
				})}
			</div>

			<div className="flex items-center justify-between gap-2 pt-1.5 border-t border-[var(--line)]">
				<span className="text-[12px] font-bold text-[var(--muted)]">
					Ангуляция резцов/клыков:
				</span>
				<div className="bg-[var(--paper)] p-0.5 rounded-xl border border-[var(--line)] flex items-center gap-1">
					{ANGULATION_PRESETS.map((aOpt) => {
						const isSelected = angulationPreset === aOpt.id;
						return (
							<button
								key={aOpt.id}
								type="button"
								onClick={() => setAngulationPreset(aOpt.id)}
								data-testid={`angulation-preset-${aOpt.id}-btn`}
								className={`h-7 px-2.5 rounded-lg text-[12px] font-medium transition-all cursor-pointer ${
									isSelected
										? "bg-[var(--primary)] text-white font-semibold shadow-xs"
										: "bg-transparent text-[var(--ink)] hover:bg-[var(--paper-soft)]"
								}`}
							>
								{aOpt.shortLabel}
							</button>
						);
					})}
				</div>
			</div>
		</div>
	);
};
