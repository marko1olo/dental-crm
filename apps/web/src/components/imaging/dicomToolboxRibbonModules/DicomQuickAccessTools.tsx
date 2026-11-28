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
			activeTool === tool ? activeClass : "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
		}`;

	return (
		<div className="flex items-center gap-1 shrink-0">
			<button type="button" onClick={() => onSelectTool("pan")} className={toolBtnClass("pan", "bg-teal-900/80 border-[var(--primary)] text-teal-200")} title="Рука (Pan)">
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
			<button type="button" onClick={() => onInstantScreenCapture(true)} className="icon-button h-8 w-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)]" title="Снимок экрана в буфер">
				<Camera size={15} />
			</button>
			<button type="button" data-testid="btn-dicom-hu-profile" id="btn-ez3d-hu-profile" onClick={onOpenHuProfile} className="secondary-button h-8 px-2.5 rounded-lg inline-flex items-center gap-1.5 border border-[var(--primary)]/40 bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/20 text-[13px] font-semibold cursor-pointer transition-colors" title="Плотность HU">
				<Activity size={14} className="text-[var(--primary)]" />
				<span>Плотность HU</span>
			</button>
			<div className="relative" ref={measureMenuRef}>
				<button type="button" data-testid="btn-dicom-measurement-dropdown" id="btn-ez3d-measurement-dropdown" onClick={onToggleMeasureMenu} className={`secondary-button h-8 px-2.5 rounded-lg inline-flex items-center gap-1 border text-[13px] font-medium cursor-pointer transition-colors ${isMeasureMenuOpen ? "bg-[var(--primary)]/15 border-[var(--primary)] text-[var(--primary)]" : "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"}`}>
					<span>▾ Измерение</span>
				</button>
				<DicomMeasureDropdown isOpen={isMeasureMenuOpen} onClose={onCloseMeasureMenu} onSelectTool={onSelectTool} onOpenHuProfile={onOpenHuProfile} onInstantScreenCapture={onInstantScreenCapture} />
			</div>
		</div>
	);
};
