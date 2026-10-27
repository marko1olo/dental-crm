/**
 * PerioMobileCockpitHeader.tsx — Верхний блок мобильного кокпита: диагноз AAP/EFP, 1-клик норма PSR 0 и скрининг.
 * Архитектурный слой Layer 4: UI Subcomponent (Мандат 8b, <= 120 строк).
 */

import type { PeriodontalDiagnosisDetail } from "@dental/shared";
import { Check, FileText, Layers, ShieldCheck } from "lucide-react";
import React from "react";
import { UltrasonicScaler } from "../../icons/DentalIcons";
import type { PerioExpressPresetId } from "../perioMath";

export interface PerioMobileCockpitHeaderProps {
	readonly aapDiagnosis: PeriodontalDiagnosisDetail;
	readonly insertStatus: boolean;
	readonly onApplyExpressPreset: (presetId: PerioExpressPresetId) => void;
	readonly onInsertToProtocol: () => void;
	readonly onOpenPsrDrawer?: (() => void) | undefined;
}

export const PerioMobileCockpitHeader: React.FC<PerioMobileCockpitHeaderProps> = React.memo(({
	aapDiagnosis, insertStatus, onApplyExpressPreset, onInsertToProtocol, onOpenPsrDrawer,
}) => {
	const sev = aapDiagnosis.severity;
	const severityClass = sev === "intact" ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30" : sev === "gingivitis" ? "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30" : sev === "moderate" ? "bg-orange-500/15 text-orange-800 dark:text-orange-300 border-orange-500/30" : "bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-500/40";

	return (
		<div className="w-full flex flex-col gap-1.5">
			<div className="w-full flex items-center justify-between gap-1.5">
				<span className={`block flex-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border text-center truncate ${severityClass}`} title={aapDiagnosis.diagnosisNameRu}>
					{aapDiagnosis.icd10Code} • {aapDiagnosis.diagnosisNameRu.split("(")[0]?.trim()}
				</span>
				{onOpenPsrDrawer && (
					<button
						type="button" onClick={onOpenPsrDrawer}
						className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-800 dark:text-teal-200 shrink-0 flex items-center gap-1 cursor-pointer"
						data-testid="perio-mobile-open-psr-btn"
						data-test="perio-mobile-psr-btn"
						title="Открыть экспресс-скрининг PSR (ВОЗ)"
					>
						<Layers size={14} className="text-teal-600 dark:text-teal-400" />
						<span>PSR (0–4)</span>
					</button>
				)}
			</div>

			{/* 1-клик кнопки: «Интактен (PSR 0)» • «Гигиена» • «В дневник» */}
			<div className="grid grid-cols-3 gap-1.5 w-full">
				<button
					type="button" onClick={() => onApplyExpressPreset("perio_norm_express")}
					className="min-h-[48px] px-2 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-800 dark:text-emerald-200 border border-emerald-500/40 active:scale-95 text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer text-center"
					title="✓ Пародонт в норме (PSR 0) / Соматически здоров • Вся десна здорова (глубина 1–2 мм, BOP 0%, PSR 0)"
					data-testid="perio-toolbar-norm-1click-btn"
				>
					<ShieldCheck size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
					<span className="whitespace-nowrap font-bold">✓ Норма (PSR 0)</span>
				</button>

				<button
					type="button" onClick={() => onApplyExpressPreset("pro_hygiene_express")}
					className="min-h-[48px] px-2 py-2 rounded-xl bg-[var(--paper-soft)] hover:bg-[var(--line)] border border-[var(--line)] active:scale-95 text-[var(--ink)] text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer text-center"
					title="Комплексная гигиена (УЗ + Air-Flow + Полировка + Фторлак)"
					data-testid="perio-toolbar-prophy-1click-btn"
				>
					<UltrasonicScaler size={16} className="shrink-0 text-cyan-600 dark:text-cyan-400" />
					<span className="whitespace-nowrap">Гигиена</span>
				</button>

				<button
					type="button" onClick={onInsertToProtocol}
					className="min-h-[48px] px-2 py-2 rounded-xl bg-[var(--paper-soft)] hover:bg-[var(--line)] border border-[var(--line)] active:scale-95 text-[var(--ink)] text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer text-center"
					data-testid="perio-insert-protocol-btn"
				>
					{insertStatus ? <Check size={16} className="shrink-0 text-emerald-500" /> : <FileText size={16} className="shrink-0 text-teal-600 dark:text-teal-400" />}
					<span className="whitespace-nowrap">{insertStatus ? "Внесено!" : "В дневник"}</span>
				</button>
			</div>

			{/* Быстрые патологии в 1 клик */}
			<div className="grid grid-cols-4 gap-1.5 w-full">
				<button
					type="button" onClick={() => onApplyExpressPreset("gingivitis_express")}
					className="min-h-[44px] px-1 py-1 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 active:scale-95 text-amber-900 dark:text-amber-200 border border-amber-500/30 text-[11px] font-bold flex flex-col items-center justify-center cursor-pointer text-center"
					data-testid="perio-mobile-preset-gingivitis-btn"
				>
					<span>Гингивит</span>
					<span className="text-[10px] opacity-75 font-mono">K05.1</span>
				</button>
				<button
					type="button" onClick={() => onApplyExpressPreset("periodontitis_moderate_express")}
					className="min-h-[44px] px-1 py-1 rounded-xl bg-orange-500/15 hover:bg-orange-500/25 active:scale-95 text-orange-900 dark:text-orange-200 border border-orange-500/30 text-[10px] font-bold flex flex-col items-center justify-center cursor-pointer text-center"
					data-testid="perio-mobile-preset-moderate-btn"
				>
					<span>Пародонтит</span>
					<span className="text-[10px] opacity-75 font-mono">K05.31</span>
				</button>
				<button
					type="button" onClick={() => onApplyExpressPreset("periodontitis_severe_express")}
					className="min-h-[44px] px-1 py-1 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 active:scale-95 text-rose-900 dark:text-rose-200 border border-rose-500/30 text-[11px] font-bold flex flex-col items-center justify-center cursor-pointer text-center"
					data-testid="perio-mobile-preset-severe-btn"
				>
					<span>Тяжелый</span>
					<span className="text-[10px] opacity-75 font-mono">K05.32</span>
				</button>
				<button
					type="button" onClick={() => onApplyExpressPreset("recession_express")}
					className="min-h-[44px] px-1 py-1 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 active:scale-95 text-purple-900 dark:text-purple-200 border border-purple-500/30 text-[11px] font-bold flex flex-col items-center justify-center cursor-pointer text-center"
					data-testid="perio-mobile-preset-recession-btn"
				>
					<span>Рецессия</span>
					<span className="text-[10px] opacity-75 font-mono">K06.0</span>
				</button>
			</div>
		</div>
	);
});

PerioMobileCockpitHeader.displayName = "PerioMobileCockpitHeader";
