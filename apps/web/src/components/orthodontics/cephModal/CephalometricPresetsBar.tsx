import { Sparkles, Trash2 } from "lucide-react";
import React from "react";
import { CLASS_I_NORMAL_LANDMARKS_PRESET, CLASS_II_DISTAL_LANDMARKS_PRESET, CLASS_III_MESIAL_LANDMARKS_PRESET, type LandmarkMap } from "../cephalometricMath";

export interface CephalometricPresetsBarProps {
	readonly onApplyPreset: (preset: LandmarkMap, label: string) => void;
	readonly onResetLandmarks: () => void;
	readonly variant: "header" | "tab1" | "tab2";
}

export function CephalometricPresetsBar({ onApplyPreset, onResetLandmarks, variant }: CephalometricPresetsBarProps) {
	if (variant === "header") {
		return (
			<div className="hidden md:flex items-center gap-1 bg-[var(--paper-soft,#020617)]/90 p-1 rounded-xl border border-[var(--line,#1e293b)] shrink-0 mr-1" data-testid="header-ceph-presets-bar">
				<span className="text-[11px] font-bold text-slate-400 px-1.5 whitespace-nowrap">Пресеты:</span>
				<button type="button" onClick={() => onApplyPreset(CLASS_I_NORMAL_LANDMARKS_PRESET, "★ I Класс (Норма)")} data-testid="header-preset-class-1" className="h-8 px-2.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 text-[12.5px] font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 shadow-2xs">
					<Sparkles size={13} className="text-emerald-400 shrink-0" /><span>★ I Класс (Норма)</span>
				</button>
				<button type="button" onClick={() => onApplyPreset(CLASS_II_DISTAL_LANDMARKS_PRESET, "II Класс (Дистальный)")} data-testid="header-preset-class-2" className="h-8 px-2.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-[12.5px] font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 shadow-2xs">
					<span>II Класс (Дистальный)</span>
				</button>
				<button type="button" onClick={() => onApplyPreset(CLASS_III_MESIAL_LANDMARKS_PRESET, "III Класс (Мезиальный)")} data-testid="header-preset-class-3" className="h-8 px-2.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 text-[12.5px] font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 shadow-2xs">
					<span>III Класс (Мезиальный)</span>
				</button>
				<button type="button" onClick={onResetLandmarks} data-testid="header-preset-clear" className="h-8 px-2.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-200 border border-slate-700 hover:border-rose-500/40 text-[12.5px] font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 shadow-2xs">
					<Trash2 size={12} className="text-slate-400 shrink-0" /><span>Очистить разметку</span>
				</button>
			</div>
		);
	}

	if (variant === "tab1") {
		return (
			<div className="mb-3.5 p-3 rounded-xl bg-[var(--paper-soft,#0f172a)] border border-[var(--line,#1e293b)] shrink-0 flex flex-col gap-2" data-testid="tab1-ceph-presets-toolbar">
				<div className="flex items-center justify-between gap-2">
					<div className="flex items-center gap-1.5 min-w-0"><Sparkles size={14} className="text-teal-400 shrink-0" /><span className="text-xs font-black uppercase tracking-wider text-teal-300 truncate">Клинические пресеты:</span></div>
					<span className="text-[11.5px] text-slate-400 shrink-0 hidden sm:inline">Норма и патология</span>
				</div>
				<div className="grid grid-cols-2 gap-2">
					<button type="button" onClick={() => onApplyPreset(CLASS_I_NORMAL_LANDMARKS_PRESET, "I Класс (Норма)")} data-testid="tab1-preset-class-1" className="h-8 px-2.5 rounded-lg bg-emerald-950/90 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/50 text-[12.5px] font-semibold transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 shadow-xs whitespace-nowrap">
						<Sparkles size={13} className="text-emerald-400 shrink-0" /><span>I Класс (Норма)</span>
					</button>
					<button type="button" onClick={() => onApplyPreset(CLASS_II_DISTAL_LANDMARKS_PRESET, "II Класс (Дистальный)")} data-testid="tab1-preset-class-2" className="h-8 px-2.5 rounded-lg bg-amber-950/90 hover:bg-amber-900 text-amber-300 border border-amber-500/50 text-[12.5px] font-semibold transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 shadow-xs whitespace-nowrap">
						<span>II Класс (Дистальный)</span>
					</button>
					<button type="button" onClick={() => onApplyPreset(CLASS_III_MESIAL_LANDMARKS_PRESET, "III Класс (Мезиальный)")} data-testid="tab1-preset-class-3" className="h-8 px-2.5 rounded-lg bg-cyan-950/90 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/50 text-[12.5px] font-semibold transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 shadow-xs whitespace-nowrap">
						<span>III Класс (Мезиальный)</span>
					</button>
					<button type="button" onClick={onResetLandmarks} data-testid="tab1-preset-clear" className="h-8 px-2.5 rounded-lg bg-slate-800 hover:bg-rose-950/70 hover:border-rose-600/60 text-slate-300 hover:text-rose-200 border border-slate-700 text-[12.5px] font-medium transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap">
						<Trash2 size={13} className="shrink-0 text-slate-400" /><span>Очистить разметку</span>
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="mb-3 p-3 rounded-xl bg-[var(--paper-soft,#0f172a)] border border-[var(--line,#1e293b)] flex flex-col gap-2 shrink-0">
			<div className="text-xs font-bold text-slate-300 flex items-center justify-between"><span>Ввод по протоколу лаборатории:</span><span className="text-[11.5px] text-slate-400">Пикассо / Золотое Сечение / КЛКТ</span></div>
			<div className="grid grid-cols-2 gap-2">
				<button type="button" onClick={() => onApplyPreset(CLASS_I_NORMAL_LANDMARKS_PRESET, "I Класс (Норма)")} className="h-8 px-2.5 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/40 text-[12.5px] font-semibold transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 shadow-xs whitespace-nowrap" data-testid="btn-ceph-preset-class-1">
					<Sparkles size={12} className="text-emerald-400 shrink-0" /><span>I Класс (Норма)</span>
				</button>
				<button type="button" onClick={() => onApplyPreset(CLASS_II_DISTAL_LANDMARKS_PRESET, "II Класс (Дистальный)")} className="h-8 px-2.5 rounded-lg bg-amber-950/70 hover:bg-amber-900/80 text-amber-300 border border-amber-500/40 text-[12.5px] font-semibold transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 shadow-xs whitespace-nowrap" data-testid="btn-ceph-preset-class-2">
					<span>II Класс (Дистальный)</span>
				</button>
				<button type="button" onClick={() => onApplyPreset(CLASS_III_MESIAL_LANDMARKS_PRESET, "III Класс (Мезиальный)")} className="h-8 px-2.5 rounded-lg bg-cyan-950/70 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-500/40 text-[12.5px] font-semibold transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 shadow-xs whitespace-nowrap" data-testid="btn-ceph-preset-class-3">
					<span>III Класс (Мезиальный)</span>
				</button>
				<button type="button" onClick={onResetLandmarks} className="h-8 px-2.5 rounded-lg bg-slate-800 hover:bg-rose-950/70 hover:border-rose-600/60 text-slate-300 hover:text-rose-200 border border-slate-700 text-[12.5px] font-medium transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap" data-testid="btn-ceph-preset-clear">
					<Trash2 size={12} className="text-slate-400 shrink-0" /><span>Очистить разметку</span>
				</button>
			</div>
		</div>
	);
}
