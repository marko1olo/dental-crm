/**
 * DicomQuickAccessTools.tsx — Центральная панель инструментов навигации и измерений КТ
 * Mandate 8b: строго <= 120 строк.
 */

import React from "react";
import { Activity, Camera, Hand, PenTool, Ruler, Triangle } from "lucide-react";
import { showToast } from "../../GlobalToast.js";
import type { DicomToolType } from "./types.js";
import { DicomMeasureDropdown } from "./DicomMeasureDropdown.js";

interface DicomQuickAccessToolsProps {
	activeTool: DicomToolType;
	onSelectTool: (tool: DicomToolType) => void;
	isMeasureMenuOpen: boolean;
	onToggleMeasureMenu: () => void;
	onCloseMeasureMenu: () => void;
	measureMenuRef: React.RefObject<HTMLDivElement | null>;
	onOpenHuProfile: () => void;
	onInstantScreenCapture: (clipboardOnly?: boolean) => void;
}

export const DicomQuickAccessTools: React.FC<DicomQuickAccessToolsProps> = ({
	activeTool, onSelectTool, isMeasureMenuOpen, onToggleMeasureMenu,
	onCloseMeasureMenu, measureMenuRef, onOpenHuProfile, onInstantScreenCapture,
}) => {
	const toolBtnClass = (tool: DicomToolType, activeClass: string) =>
		`icon-button h-8 w-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors border ${
			activeTool === tool ? activeClass : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
		}`;

	return (
		<div className="flex items-center gap-1 shrink-0">
			<button type="button" onClick={() => onSelectTool("pan")} className={toolBtnClass("pan", "bg-teal-900/80 border-[var(--teal)] text-teal-300")} title="Рука (Pan)">
				<Hand size={15} />
			</button>
			<button type="button" onClick={() => onSelectTool("ruler")} className={toolBtnClass("ruler", "bg-sky-900/80 border-sky-500 text-sky-200")} title="Линейка (мм)">
				<Ruler size={15} />
			</button>
			<button type="button" onClick={() => { onSelectTool("angle"); showToast("Инструмент угла: выберите вершину и две точки", "info"); }} className={toolBtnClass("angle", "bg-amber-900/80 border-amber-500 text-amber-200")} title="Угол (°)">
				<Triangle size={15} />
			</button>
			<button type="button" onClick={() => onSelectTool("root_canal_tracer")} className={toolBtnClass("root_canal_tracer", "bg-rose-900/80 border-rose-500 text-rose-200")} title="Трассировка канала">
				<PenTool size={15} />
			</button>
			<button type="button" onClick={() => onInstantScreenCapture(true)} className="icon-button h-8 w-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700" title="Снимок экрана в буфер">
				<Camera size={15} />
			</button>
			<button type="button" data-testid="btn-dicom-hu-profile" id="btn-ez3d-hu-profile" onClick={onOpenHuProfile} className="secondary-button h-8 px-2.5 rounded-lg inline-flex items-center gap-1.5 border border-sky-500/50 bg-sky-600/30 text-sky-200 hover:bg-sky-600/40 text-[13px] font-semibold cursor-pointer transition-colors" title="Плотность HU">
				<Activity size={14} className="text-sky-400" />
				<span>Плотность HU</span>
			</button>
			<div className="relative" ref={measureMenuRef}>
				<button type="button" data-testid="btn-dicom-measurement-dropdown" id="btn-ez3d-measurement-dropdown" onClick={onToggleMeasureMenu} className={`secondary-button h-8 px-2.5 rounded-lg inline-flex items-center gap-1 border text-[13px] font-medium cursor-pointer transition-colors ${isMeasureMenuOpen ? "bg-teal-900/80 border-[var(--teal)] text-teal-200" : "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"}`}>
					<span>▾ Измерение</span>
				</button>
				<DicomMeasureDropdown isOpen={isMeasureMenuOpen} onClose={onCloseMeasureMenu} onSelectTool={onSelectTool} onOpenHuProfile={onOpenHuProfile} onInstantScreenCapture={onInstantScreenCapture} />
			</div>
		</div>
	);
};
