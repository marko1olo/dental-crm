import React from "react";
import { Zap, Activity, ShieldCheck, Scissors, Award, Sparkles, CheckCircle2 } from "lucide-react";
import { CORE_1CLICK_PRESETS } from "../protocolGeneratorPresets";
import { COMPANION_ICD10_CODES, clinicalSpecialtyLabels } from "../emrProtocolEngine";

export interface EmrProtocolPresetSelectorProps {
	readonly selectedPresetCode: string;
	readonly onSelectPreset: (code: string) => void;
}

export const EmrProtocolPresetSelector: React.FC<EmrProtocolPresetSelectorProps> = React.memo(
	function EmrProtocolPresetSelector({ selectedPresetCode, onSelectPreset }) {
		return (
			<div className="space-y-2">
				<label className="text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)] flex items-center gap-1.5">
					<Zap className="w-4 h-4 text-amber-500" />
					1. Клинические пресеты по МКБ-10
				</label>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
					{CORE_1CLICK_PRESETS.map((preset) => {
						const isSelected = selectedPresetCode === preset.id;
						return (
							<button
								key={preset.id}
								type="button"
								onClick={() => onSelectPreset(preset.id)}
								className={`flex flex-col items-start p-3 min-h-[64px] rounded-xl border text-left transition-all cursor-pointer ${
									isSelected
										? "border-[var(--teal,#0d9488)] bg-[var(--teal-soft,#f0fdfa)] text-[var(--ink,#0f172a)] shadow-sm ring-2 ring-[var(--teal,#0d9488)]/30"
										: "border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] hover:bg-[var(--paper-strong,#f1f5f9)] text-[var(--muted,#64748b)]"
								}`}
								data-testid={`preset-btn-${preset.id}`}
							>
								<div className="flex items-center justify-between w-full">
									<span className="text-sm font-bold text-[var(--ink,#0f172a)] flex items-center gap-1.5">
										{preset.iconType === "activity" && <Activity className="w-4 h-4 text-sky-500" />}
										{preset.iconType === "zap" && <Zap className="w-4 h-4 text-purple-500" />}
										{preset.iconType === "shield" && <ShieldCheck className="w-4 h-4 text-indigo-500" />}
										{preset.iconType === "scissors" && <Scissors className="w-4 h-4 text-rose-500" />}
										{preset.iconType === "award" && <Award className="w-4 h-4 text-amber-500" />}
										{preset.iconType === "sparkles" && <Sparkles className="w-4 h-4 text-emerald-500" />}
										<span>{preset.code}</span>
									</span>
									{isSelected && <CheckCircle2 className="w-4 h-4 text-[var(--teal,#0d9488)] shrink-0" />}
								</div>
								<div className="text-xs font-medium text-[var(--ink,#0f172a)] mt-0.5 line-clamp-1">
									{preset.title}
								</div>
								<div className="text-[10px] text-[var(--muted,#64748b)] mt-1 line-clamp-1">
									{preset.description}
								</div>
							</button>
						);
					})}
				</div>

				<div className="pt-1">
					<label className="text-[11px] font-semibold text-[var(--muted,#64748b)] block mb-1">
						Или выберите дополнительный диагноз МКБ-10:
					</label>
					<select
						value={selectedPresetCode}
						onChange={(e) => onSelectPreset(e.target.value)}
						className="w-full px-3 py-2 min-h-[44px] rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-xs text-[var(--ink,#0f172a)] font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
					>
						<optgroup label="Основные клинические протоколы (СтАР)">
							{CORE_1CLICK_PRESETS.map((p) => (
								<option key={p.id} value={p.id}>
									{p.code} — {p.title}
								</option>
							))}
						</optgroup>
						<optgroup label="Смежные нозологии МКБ-10">
							{Object.entries(COMPANION_ICD10_CODES).map(([code, item]) => (
								<option key={code} value={code}>
									{code} — {item.title} ({clinicalSpecialtyLabels[item.category]})
								</option>
							))}
						</optgroup>
					</select>
				</div>
			</div>
		);
	},
);
