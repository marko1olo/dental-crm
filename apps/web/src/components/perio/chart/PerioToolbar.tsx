import type { AapEfpClassificationResult } from "@dental/shared";
import {
	Activity,
	Check,
	ChevronDown,
	ChevronUp,
	Clipboard,
	Droplets,
	FileText,
	HelpCircle,
	RotateCcw,
	ShieldCheck,
	Sparkles,
} from "lucide-react";
import React from "react";
import type { PerioExpressPresetId } from "../perioMath";

export interface PerioToolbarProps {
	readonly aapDiagnosis: AapEfpClassificationResult;
	readonly readOnly?: boolean | undefined;
	readonly selectedToothNumber: number;
	readonly isHygieneExpanded: boolean;
	readonly insertStatus: boolean;
	readonly copyStatus: boolean;
	readonly onApplyExpressPreset: (presetId: PerioExpressPresetId) => void;
	readonly onSetAllIntact: () => void;
	readonly onMarkSelectedToothPathology: (depth: number, hasBop: boolean) => void;
	readonly onMarkBopOnDeepPockets: () => void;
	readonly onClearPlaque: () => void;
	readonly onToggleHygieneExpanded: () => void;
	readonly onInsertToProtocol: () => void;
	readonly onCopyProtocol: () => void;
	readonly onToggleHelp: () => void;
}

export const PerioToolbar: React.FC<PerioToolbarProps> = React.memo(({
	aapDiagnosis,
	readOnly = false,
	selectedToothNumber,
	isHygieneExpanded,
	insertStatus,
	copyStatus,
	onApplyExpressPreset,
	onSetAllIntact,
	onMarkSelectedToothPathology,
	onMarkBopOnDeepPockets,
	onClearPlaque,
	onToggleHygieneExpanded,
	onInsertToProtocol,
	onCopyProtocol,
	onToggleHelp,
}) => {
	return (
		<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[var(--line)]">
			<div className="flex items-center gap-3 min-w-0">
				<div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 shrink-0">
					<Activity size={22} />
				</div>
				<div className="min-w-0">
					<div className="flex items-center gap-2 flex-wrap sm:flex-nowrap min-w-0">
						<h3 className="text-base font-bold text-[var(--ink)] truncate">
							Пародонтологический осмотр (Скрининг PSR / CPITN & Статус 043/у)
						</h3>
						<span
							className={`px-2.5 py-0.5 rounded-full text-xs font-bold border truncate max-w-xs shrink-0 ${
								aapDiagnosis.severity === "intact"
									? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
									: aapDiagnosis.severity === "gingivitis"
										? "bg-amber-500/10 text-amber-400 border-amber-500/30"
										: aapDiagnosis.severity === "moderate"
											? "bg-orange-500/10 text-orange-400 border-orange-500/30"
											: "bg-rose-500/15 text-rose-400 border-rose-500/30 animate-pulse"
							}`}
						>
							{aapDiagnosis.icd10Code} •{" "}
							{aapDiagnosis.diagnosisNameRu.split("(")[0]}
						</span>
					</div>
					<p className="text-xs text-[var(--muted)] mt-0.5 truncate">
						{aapDiagnosis.stageDescriptionRu}
					</p>
				</div>
			</div>

			{/* 1-Click Fast Action Presets (1 Row 32-36px Toolbar, Mandates 8d, 8e, 8k, HIG) */}
			{!readOnly && (
				<div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto py-0.5 shrink-0 h-9 min-h-[36px]">
					{/* 1-Click Norm Express: Instant PSR 0, Healthy Tissues & Form 043/u Protocol */}
					<button
						type="button"
						onClick={() => onApplyExpressPreset("perio_norm_express")}
						className="h-9 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer min-h-[44px] min-w-[44px] whitespace-nowrap shrink-0"
						title="1-клик: Вся десна здорова (Норма) (PSR 0, глубина <= 2 мм, BOP 0, протокол в 043/у)"
						data-testid="perio-toolbar-norm-1click-btn"
					>
						<ShieldCheck size={16} className="shrink-0" />
						<span>1-клик: Здоровый пародонт (Норма)</span>
					</button>

					{/* 1-Click Pro-Hygiene: Ultrasonic, Air-Flow Glycine & Service A16.07.051 */}
					<button
						type="button"
						onClick={() => onApplyExpressPreset("pro_hygiene_express")}
						className="h-9 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer min-h-[44px] min-w-[44px] whitespace-nowrap shrink-0"
						title="Профгигиена в 1 клик (УЗ + Air-Flow глицин + полировка + фторирование + услуга A16.07.051)"
						data-testid="perio-toolbar-prophy-1click-btn"
					>
						<Sparkles size={16} className="shrink-0" />
						<span>Профгигиена</span>
					</button>

					<button
						type="button"
						onClick={onSetAllIntact}
						className="h-9 px-2.5 rounded-lg bg-[var(--paper-soft)] hover:bg-emerald-500/15 hover:text-emerald-400 border border-[var(--line)] text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5 transition-all cursor-pointer min-h-[44px] min-w-[44px] whitespace-nowrap shrink-0"
						title="Пародонт интактен / норма (все 32 зуба: глубина 2 мм, рецессия 0 мм, BOP 0%)"
						data-testid="perio-healthy-norm-btn"
					>
						<ShieldCheck size={14} className="text-emerald-400 shrink-0" />
						<span>Пародонт интактен / норма</span>
					</button>

					<button
						type="button"
						onClick={() => onMarkSelectedToothPathology(5, true)}
						className="h-9 px-2.5 rounded-lg bg-[var(--paper-soft)] hover:bg-rose-500/15 hover:text-rose-400 border border-[var(--line)] text-xs font-semibold text-[var(--ink)] hidden md:flex items-center gap-1.5 transition-all cursor-pointer min-h-[44px] min-w-[44px] whitespace-nowrap shrink-0"
						title={`Быстрая разметка пародонтита: карман 5 мм + кровоточивость для выбранного зуба #${selectedToothNumber}`}
						data-testid="perio-preset-tooth-pathology"
					>
						<Droplets size={14} className="text-rose-400 shrink-0" />
						<span>#{selectedToothNumber} 5мм+BOP</span>
					</button>

					<button
						type="button"
						onClick={onMarkBopOnDeepPockets}
						className="h-9 px-2.5 rounded-lg bg-[var(--paper-soft)] hover:bg-rose-500/15 hover:text-rose-400 border border-[var(--line)] text-xs font-semibold text-[var(--ink)] hidden lg:flex items-center gap-1.5 transition-all cursor-pointer min-h-[44px] min-w-[44px] whitespace-nowrap shrink-0"
						title="Автоматически проставить кровоточивость на всех карманах глубиной ≥ 4 мм"
						data-testid="perio-preset-bop-pockets"
					>
						<Droplets size={14} className="text-rose-400 shrink-0" />
						<span>BOP ≥ 4мм</span>
					</button>

					<button
						type="button"
						onClick={onClearPlaque}
						className="h-9 px-2.5 rounded-lg bg-[var(--paper-soft)] hover:bg-teal-500/15 hover:text-teal-400 border border-[var(--line)] text-xs font-semibold text-[var(--ink)] hidden xl:flex items-center gap-1.5 transition-all cursor-pointer min-h-[44px] min-w-[44px] whitespace-nowrap shrink-0"
						title="Очистить весь зубной налет"
						data-testid="perio-preset-clear-plaque"
					>
						<RotateCcw size={14} className="text-teal-400 shrink-0" />
						<span>Очистить налет</span>
					</button>

					<button
						type="button"
						onClick={onToggleHygieneExpanded}
						className={`h-9 px-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer min-h-[44px] min-w-[44px] whitespace-nowrap shrink-0 ${
							isHygieneExpanded
								? "bg-teal-600 text-white border-teal-500 shadow-xs"
								: "bg-[var(--paper-soft)] hover:bg-teal-500/15 hover:text-teal-400 border-[var(--line)] text-[var(--ink)]"
						}`}
						title="Открыть экспресс-расчет индексов гигиены (OHI-S, PMA, КПИ)"
						data-testid="perio-hygiene-indices-btn"
					>
						<ShieldCheck
							size={14}
							className={isHygieneExpanded ? "text-white" : "text-teal-400"}
						/>
						<span>Индексы гигиены</span>
						{isHygieneExpanded ? (
							<ChevronUp size={12} />
						) : (
							<ChevronDown size={12} />
						)}
					</button>

					{/* 1-Click Insert into 043/u: ALWAYS VISIBLE AND ACTIVE */}
					<button
						type="button"
						onClick={onInsertToProtocol}
						className="h-9 px-3.5 rounded-lg bg-teal-600 hover:bg-teal-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer min-h-[44px] min-w-[44px] whitespace-nowrap shrink-0"
						title="Сформировать и вставить протокол пародонтограммы в дневник 043/у"
						data-testid="perio-insert-protocol-btn"
					>
						{insertStatus ? <Check size={14} /> : <FileText size={14} />}
						<span>
							{insertStatus ? "Внесено в 043/у!" : "Внести в дневник 043/у"}
						</span>
					</button>

					<button
						type="button"
						onClick={onCopyProtocol}
						className="h-9 w-9 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--line)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center transition-all cursor-pointer min-h-[44px] min-w-[44px] shrink-0"
						title="Копировать текст протокола в буфер"
						aria-label="Копировать текст протокола"
					>
						{copyStatus ? (
							<Check size={16} className="text-emerald-400" />
						) : (
							<Clipboard size={16} />
						)}
					</button>

					<button
						type="button"
						onClick={onToggleHelp}
						className="h-9 w-9 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--line)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center transition-all cursor-pointer min-h-[44px] min-w-[44px] shrink-0"
						title="Справка по горячим клавишам пародонтограммы"
						aria-label="Справка по горячим клавишам"
					>
						<HelpCircle size={16} />
					</button>
				</div>
			)}
		</div>
	);
});

PerioToolbar.displayName = "PerioToolbar";
