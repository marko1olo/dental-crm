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
		<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
			<div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-full pb-1 sm:pb-0 sm:flex-wrap">
				<button
					type="button"
					data-testid="btn-endo-obturation-norm"
					onClick={props.onApplyOneClickObturationNorm}
					className="btn-endo-obturation-norm secondary-button min-h-[44px] sm:min-h-[34px] h-9 sm:h-8 px-3 rounded-lg text-xs font-semibold bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper-soft)] flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer shrink-0"
					title="Мгновенно обтурировать каналы анатомической нормой: длина по FDI, МАФ 25.04, AH Plus, NaOCl 3%, латеральная компакция"
				>
					<Check size={14} className="stroke-[2.5] text-[var(--primary)] shrink-0" />
					<span className="hidden sm:inline">Каналы запломбированы (физиологическая норма)</span>
					<span className="sm:hidden">Запломбировать каналы (норма)</span>
				</button>
				<button
					type="button"
					onClick={() => props.onApplyCanonicalProtocol("pulpitis_1visit")}
					className={`min-h-[44px] sm:min-h-[34px] h-9 sm:h-8 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer shrink-0 ${props.activeProtocolId === "pulpitis_1visit" ? "bg-[var(--primary-soft)] text-[var(--primary)] border-[var(--primary)]" : "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)]"}`}
				>
					Пульпит (1 визит)
				</button>
				<button
					type="button"
					onClick={() => props.onApplyCanonicalProtocol("periodontitis_temp")}
					className={`min-h-[44px] sm:min-h-[34px] h-9 sm:h-8 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer shrink-0 ${props.activeProtocolId === "periodontitis_temp" ? "bg-[var(--primary-soft)] text-[var(--primary)] border-[var(--primary)]" : "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)]"}`}
				>
					Периодонтит (Ca(OH)2)
				</button>
				<button
					type="button"
					onClick={() => props.onApplyCanonicalProtocol("periodontitis_permanent_ahplus")}
					className={`min-h-[44px] sm:min-h-[34px] h-9 sm:h-8 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer shrink-0 ${props.activeProtocolId === "periodontitis_permanent_ahplus" ? "bg-[var(--primary-soft)] text-[var(--primary)] border-[var(--primary)]" : "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)]"}`}
				>
					Периодонтит (AH Plus)
				</button>
				<button
					type="button"
					onClick={() => props.onApplyCanonicalProtocol("retreatment_unsealing")}
					className={`min-h-[44px] sm:min-h-[34px] h-9 sm:h-8 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer shrink-0 ${props.activeProtocolId === "retreatment_unsealing" ? "bg-[var(--primary-soft)] text-[var(--primary)] border-[var(--primary)]" : "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)]"}`}
				>
					Распломбировка
				</button>
				<button
					type="button"
					data-testid="btn-endo-anatomical-autofill"
					onClick={props.onApplyAnatomicalNorm}
					className="btn-endo-anatomical-autofill min-h-[44px] sm:min-h-[34px] h-9 sm:h-8 px-3 rounded-lg text-xs font-semibold bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper-soft)] cursor-pointer shrink-0"
					title="Восстановить анатомическую норму каналов по FDI"
				>
					Норма (FDI)
				</button>
			</div>
			<button
				type="button"
				onClick={props.onAddCanal}
				className="min-h-[44px] sm:min-h-[34px] h-9 sm:h-8 px-3 rounded-lg text-xs font-semibold bg-[var(--paper)] text-[var(--primary)] border border-[var(--line)] hover:bg-[var(--paper-soft)] flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
			>
				<Plus size={14} /> Добавить канал
			</button>
		</div>
	);
}
