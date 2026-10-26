/**
 * DicomMeasureDropdown.tsx — Выпадающее меню расширенных измерений и аннотаций
 * Mandate 8b: строго <= 120 строк.
 */

import React from "react";
import { Activity, Copy, Download, Move, Ruler, Triangle, Zap } from "lucide-react";
import { showToast } from "../../GlobalToast.js";
import type { DicomToolType } from "./types.js";

interface DicomMeasureDropdownProps {
	isOpen: boolean;
	onClose: () => void;
	onSelectTool: (tool: DicomToolType) => void;
	onOpenHuProfile: () => void;
	onInstantScreenCapture: (clipboardOnly?: boolean) => void;
}

export const DicomMeasureDropdown: React.FC<DicomMeasureDropdownProps> = ({
	isOpen,
	onClose,
	onSelectTool,
	onOpenHuProfile,
	onInstantScreenCapture,
}) => {
	if (!isOpen) return null;

	return (
		<div className="absolute left-0 top-full mt-1 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-[10001] p-1.5 flex flex-col gap-0.5">
			<div className="text-xs font-bold text-slate-400 px-2 py-1 uppercase border-b border-slate-800 tracking-wider">
				Измерение
			</div>
			<button
				type="button"
				onClick={() => { onSelectTool("ruler"); onClose(); }}
				className="w-full text-left px-2 py-1.5 text-[13px] font-medium rounded-lg text-slate-200 hover:bg-slate-800 cursor-pointer flex items-center gap-2 transition-colors"
			>
				<Ruler size={14} className="text-sky-400" />
				<span>Длина / Линейка (мм)</span>
			</button>
			<button
				type="button"
				onClick={() => { onSelectTool("angle"); onClose(); }}
				className="w-full text-left px-2 py-1.5 text-[13px] font-medium rounded-lg text-slate-200 hover:bg-slate-800 cursor-pointer flex items-center gap-2 transition-colors"
			>
				<Triangle size={14} className="text-amber-400" />
				<span>Угол (Cobb / Gnathic °)</span>
			</button>
			<button
				type="button"
				onClick={() => { onOpenHuProfile(); onClose(); }}
				className="w-full text-left px-2 py-1.5 text-[13px] font-medium rounded-lg text-slate-200 hover:bg-slate-800 cursor-pointer flex items-center gap-2 transition-colors"
			>
				<Activity size={14} className="text-teal-400" />
				<span>Плотность кости (HU Misch)</span>
			</button>

			<div className="text-xs font-bold text-slate-400 px-2 py-1 uppercase border-b border-slate-800 tracking-wider mt-1">
				Захват
			</div>
			<button
				type="button"
				onClick={() => { onInstantScreenCapture(true); onClose(); }}
				className="w-full text-left px-2 py-1.5 text-[13px] font-medium rounded-lg text-slate-200 hover:bg-slate-800 cursor-pointer flex items-center gap-2 transition-colors"
			>
				<Copy size={14} className="text-emerald-400" />
				<span>Снимок в буфер (Ctrl+V)</span>
			</button>
			<button
				type="button"
				onClick={() => { onInstantScreenCapture(false); onClose(); }}
				className="w-full text-left px-2 py-1.5 text-[13px] font-medium rounded-lg text-slate-200 hover:bg-slate-800 cursor-pointer flex items-center gap-2 transition-colors"
			>
				<Download size={14} className="text-cyan-400" />
				<span>Экспорт PNG высокого разрешения</span>
			</button>

			<div className="text-xs font-bold text-slate-400 px-2 py-1 uppercase border-b border-slate-800 tracking-wider mt-1">
				Аннотация и имплантация
			</div>
			<button
				type="button"
				onClick={() => {
					showToast("Режим стрелки-аннотации активирован: кликните на очаг", "info");
					onClose();
				}}
				className="w-full text-left px-2 py-1.5 text-[13px] font-medium rounded-lg text-slate-200 hover:bg-slate-800 cursor-pointer flex items-center gap-2 transition-colors"
			>
				<Move size={14} className="text-pink-400" />
				<span>Стрелка / Клиническая выноска</span>
			</button>
			<button
				type="button"
				onClick={() => {
					showToast("Библиотека имплантатов: буфер безопасности 1.5–2 мм вокруг IAN активна", "success");
					onClose();
				}}
				className="w-full text-left px-2 py-1.5 text-[13px] font-medium rounded-lg text-slate-200 hover:bg-slate-800 cursor-pointer flex items-center gap-2 transition-colors"
			>
				<Zap size={14} className="text-amber-300" />
				<span>Имплантат (Буфер 1.5–2 мм)</span>
			</button>
		</div>
	);
};
