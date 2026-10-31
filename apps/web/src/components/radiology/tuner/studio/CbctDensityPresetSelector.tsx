/**
 * DENTE CRM — CBCT Density Preset Selector
 * Clinical presets by Misch bone density (D1-D4), mandibular nerve canal, endo roots, and canonical dental contrast.
 * Strict adherence to Mandates 8e, 8x, 8b (< 800 lines).
 */

import React from "react";
import { Bone, Layers, Sparkles, Zap } from "lucide-react";
import { TUNER_PRESETS, type TunerPreset } from "../cbctTunerTypes";

export interface CbctDensityPresetSelectorProps {
	readonly activePresetId: string;
	readonly onApplyPreset: (presetId: string) => void;
}

export const CbctDensityPresetSelector: React.FC<CbctDensityPresetSelectorProps> = ({
	activePresetId,
	onApplyPreset,
}) => {
	const bonePresets = TUNER_PRESETS.filter((p) => p.category === "bone");
	const clinicalPresets = TUNER_PRESETS.filter((p) => p.category === "endo");
	const generalPresets = TUNER_PRESETS.filter((p) => p.category === "general" || !p.category);

	const renderPresetButton = (p: TunerPreset) => {
		const isSelected = activePresetId === p.id;
		return (
			<button
				key={p.id}
				type="button"
				onClick={() => onApplyPreset(p.id)}
				className={`p-2 rounded-lg text-left text-xs font-semibold transition-all border cursor-pointer min-h-[44px] flex flex-col justify-center ${
					isSelected
						? "bg-cyan-950/80 text-cyan-200 border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.3)] font-bold"
						: "bg-zinc-900 text-zinc-300 border-zinc-800 hover:text-zinc-100 hover:bg-zinc-850"
				}`}
				data-testid={`cbct-preset-btn-${p.id}`}
				title={p.description}
			>
				<div className="font-bold flex items-center justify-between">
					<span>{p.shortLabel}</span>
					{isSelected && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />}
				</div>
			</button>
		);
	};

	return (
		<div className="flex flex-col gap-2 shrink-0">
			{/* Bone Density Section (D1-D4 Misch) */}
			<div className="flex flex-col gap-1.5">
				<span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
					<Bone className="w-3.5 h-3.5 text-cyan-400" />
					Плотность кости (шкала D1–D4):
				</span>
				<div className="grid grid-cols-2 gap-1.5">
					{bonePresets.map(renderPresetButton)}
				</div>
			</div>

			{/* Nerve & Endo Section */}
			<div className="flex flex-col gap-1.5">
				<span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
					<Sparkles className="w-3.5 h-3.5 text-amber-400" />
					Каналы, нерв и корни:
				</span>
				<div className="grid grid-cols-2 gap-1.5">
					{clinicalPresets.map(renderPresetButton)}
				</div>
			</div>

			{/* General & Canonical Section */}
			<div className="flex flex-col gap-1.5">
				<span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
					<Layers className="w-3.5 h-3.5 text-emerald-400" />
					Обзорные пресеты:
				</span>
				<div className="grid grid-cols-2 gap-1.5">
					{generalPresets.map(renderPresetButton)}
				</div>
			</div>
		</div>
	);
};
