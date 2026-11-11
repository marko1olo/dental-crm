/**
 * DENTE Dental CRM — Endodontic Studio Quick Protocol Toolbar
 * apps/web/src/components/endo/studioModules/EndoStudioToolbar.tsx
 *
 * Панель быстрого применения клинических протоколов обтурации и анатомической нормы (Мандаты 8e, 8am, 8ap).
 * Строгий профессиональный интерфейс врача: ноль эмодзи, только векторная графика Lucide.
 */

import React from "react";
import { Check, Plus } from "lucide-react";
import type { EndoProtocolPresetId } from "../endodonticsCatalogData";

export interface EndoStudioToolbarProps {
	readonly activeTooth: number;
	readonly activeProtocolId: EndoProtocolPresetId;
	readonly onApplyOneClickObturationNorm: () => void;
	readonly onApplyCanonicalProtocol: (protoId: EndoProtocolPresetId) => void;
	readonly onApplyAnatomicalNorm: () => void;
	readonly onAddCanal: () => void;
}

export function EndoStudioToolbar(props: EndoStudioToolbarProps) {
	return (
		<div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-[var(--surface,#f8fafc)] dark:bg-slate-800/40 border border-[var(--line,#e2e8f0)] dark:border-slate-800">
			<div className="flex items-center gap-1.5 flex-wrap">
				<button
					type="button"
					data-testid="btn-endo-obturation-norm"
					onClick={props.onApplyOneClickObturationNorm}
					className="btn-endo-obturation-norm secondary-button min-h-[44px] sm:min-h-[34px] h-9 sm:h-8 px-3 rounded-lg text-xs font-semibold bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-[var(--line,#cbd5e1)] dark:border-slate-700 hover:bg-slate-100 flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
					title="Мгновенно обтурировать каналы анатомической нормой: длина по FDI, МАФ 25.04, AH Plus, NaOCl 3%, латеральная компакция"
				>
					<Check size={14} className="stroke-[2.5] text-[var(--teal,#0d9488)]" />
					<span>Каналы запломбированы (физиологическая норма)</span>
				</button>
				<button
					type="button"
					onClick={() => props.onApplyCanonicalProtocol("pulpitis_1visit")}
					className={`min-h-[44px] sm:min-h-[34px] h-9 sm:h-8 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${props.activeProtocolId === "pulpitis_1visit" ? "bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-400 dark:border-teal-700" : "bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-[var(--line,#cbd5e1)] dark:border-slate-700 hover:bg-slate-100"}`}
				>
					Пульпит (1 визит)
				</button>
				<button
					type="button"
					onClick={() => props.onApplyCanonicalProtocol("periodontitis_temp")}
					className={`min-h-[44px] sm:min-h-[34px] h-9 sm:h-8 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${props.activeProtocolId === "periodontitis_temp" ? "bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-400 dark:border-teal-700" : "bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-[var(--line,#cbd5e1)] dark:border-slate-700 hover:bg-slate-100"}`}
				>
					Периодонтит (Ca(OH)2)
				</button>
				<button
					type="button"
					onClick={() => props.onApplyCanonicalProtocol("periodontitis_permanent_ahplus")}
					className={`min-h-[44px] sm:min-h-[34px] h-9 sm:h-8 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${props.activeProtocolId === "periodontitis_permanent_ahplus" ? "bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-400 dark:border-teal-700" : "bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-[var(--line,#cbd5e1)] dark:border-slate-700 hover:bg-slate-100"}`}
				>
					Периодонтит (AH Plus)
				</button>
				<button
					type="button"
					onClick={() => props.onApplyCanonicalProtocol("retreatment_unsealing")}
					className={`min-h-[44px] sm:min-h-[34px] h-9 sm:h-8 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${props.activeProtocolId === "retreatment_unsealing" ? "bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-400 dark:border-teal-700" : "bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-[var(--line,#cbd5e1)] dark:border-slate-700 hover:bg-slate-100"}`}
				>
					Распломбировка
				</button>
				<button
					type="button"
					data-testid="btn-endo-anatomical-autofill"
					onClick={props.onApplyAnatomicalNorm}
					className="btn-endo-anatomical-autofill min-h-[44px] sm:min-h-[34px] h-9 sm:h-8 px-3 rounded-lg text-xs font-semibold bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-[var(--line,#cbd5e1)] dark:border-slate-700 hover:bg-slate-100 cursor-pointer"
					title="Восстановить анатомическую норму каналов по FDI"
				>
					Норма (FDI)
				</button>
			</div>
			<button
				type="button"
				onClick={props.onAddCanal}
				className="min-h-[44px] sm:min-h-[34px] h-9 sm:h-8 px-3 rounded-lg text-xs font-semibold bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-[var(--teal,#0d9488)] border border-[var(--line,#cbd5e1)] dark:border-slate-700 flex items-center gap-1.5 cursor-pointer"
			>
				<Plus size={14} /> Добавить канал
			</button>
		</div>
	);
}
