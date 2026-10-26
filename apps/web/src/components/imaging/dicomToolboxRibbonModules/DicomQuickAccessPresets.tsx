/**
 * DicomQuickAccessPresets.tsx — Пресеты контрастности и панели окон W/L и обрезки
 * Mandate 8b: строго <= 120 строк.
 */

import React from "react";
import { Crop, Sliders } from "lucide-react";
import { showToast } from "../../GlobalToast.js";
import { BONE_PRESET, DENTIN_PRESET, ENAMEL_PRESET } from "./dicomRibbonConstants.js";
import type { DicomViewportState } from "./types.js";

interface DicomQuickAccessPresetsProps {
	viewportState: DicomViewportState;
	onViewportChange: (delta: Partial<DicomViewportState>) => void;
	isWindowPanelOpen: boolean;
	onToggleWindowPanel: () => void;
	isClippingPanelOpen: boolean;
	onToggleClippingPanel: () => void;
	isClippingApplied: boolean;
}

export const DicomQuickAccessPresets: React.FC<DicomQuickAccessPresetsProps> = ({
	viewportState, onViewportChange, isWindowPanelOpen, onToggleWindowPanel,
	isClippingPanelOpen, onToggleClippingPanel, isClippingApplied,
}) => {
	const isBone = viewportState.windowWidth === 2000 && viewportState.windowCenter === 500 && !viewportState.invert;
	const isEnamel = viewportState.windowWidth === 4000 && viewportState.windowCenter === 1500 && !viewportState.invert;
	const isDentin = viewportState.windowWidth === 1500 && viewportState.windowCenter === 300 && !viewportState.invert;

	const presetBtnClass = (active: boolean, activeColor: string) =>
		`secondary-button h-8 px-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
			active ? activeColor : "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
		}`;

	return (
		<div className="flex items-center gap-1 shrink-0 ml-1">
			<button type="button" data-testid="btn-preset-bone" onClick={() => { onViewportChange(BONE_PRESET); showToast("Пресет «Кость»: WW 2000 / WL 500", "info"); }} className={presetBtnClass(isBone, "bg-teal-900/80 border-[var(--teal)] text-teal-200")} title="Костная ткань">
				Кость
			</button>
			<button type="button" data-testid="btn-preset-enamel" onClick={() => { onViewportChange(ENAMEL_PRESET); showToast("Пресет «Эмаль»: WW 4000 / WL 1500", "info"); }} className={presetBtnClass(isEnamel, "bg-amber-900/80 border-amber-500 text-amber-200")} title="Эмаль и кариес">
				Эмаль
			</button>
			<button type="button" data-testid="btn-preset-dentin" onClick={() => { onViewportChange(DENTIN_PRESET); showToast("Пресет «Дентин»: WW 1500 / WL 300", "info"); }} className={presetBtnClass(isDentin, "bg-sky-900/80 border-sky-500 text-sky-200")} title="Дентин и каналы">
				Дентин
			</button>
			<button type="button" data-testid="btn-preset-negative" onClick={() => { onViewportChange({ invert: !viewportState.invert }); showToast(viewportState.invert ? "Инверсия выключена" : "Пресет «Негатив»", "info"); }} className={presetBtnClass(Boolean(viewportState.invert), "bg-blue-900/80 border-blue-500 text-blue-200")} title="Инверсия для трещин">
				Негатив
			</button>
			<button type="button" id="btn-dicom-window-panel" data-tour="mpr-presets" onClick={onToggleWindowPanel} className={`secondary-button h-8 px-2.5 rounded-lg inline-flex items-center gap-1.5 border text-[13px] font-medium cursor-pointer transition-colors ${isWindowPanelOpen ? "bg-purple-900/80 border-purple-500 text-purple-200" : "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"}`} title="Управление окнами W/L">
				<Sliders size={14} />
				<span>Окна W/L</span>
			</button>
			<button type="button" id="btn-dicom-clipping-panel" onClick={onToggleClippingPanel} className={`secondary-button h-8 px-2.5 rounded-lg inline-flex items-center gap-1.5 border text-[13px] font-medium cursor-pointer transition-colors ${isClippingApplied ? "bg-emerald-950 border-emerald-500 text-emerald-200" : isClippingPanelOpen ? "bg-teal-900/80 border-[var(--teal)] text-teal-200" : "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"}`} title="Обрезка срезов (ROI)">
				<Crop size={14} />
				<span>Обрезка</span>
			</button>
		</div>
	);
};
