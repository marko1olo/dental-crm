import type { PeriodontalDiagnosisDetail } from "@dental/shared";
import {
	Check,
	ChevronDown,
	ChevronUp,
	Clipboard,
	Droplets,
	HelpCircle,
	RotateCcw,
	ShieldCheck,
} from "lucide-react";
import React from "react";
import {
	DentalForm043,
	PerioProbe,
	UltrasonicScaler,
} from "../../icons/DentalIcons";
import type { PerioExpressPresetId } from "../perioMath";

export interface PerioToolbarProps {
	readonly aapDiagnosis: PeriodontalDiagnosisDetail;
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
					<PerioProbe size={22} />
				</div>
				<div className="min-w-0">
					<div className="flex items-center gap-2 flex-wrap sm:flex-nowrap min-w-0">
						<h3 className="text-base font-bold text-[var(--ink)] truncate">
							Пародонтологический осмотр (Скрининг PSR / CPITN)
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

			{/* Клинические протоколы пародонтологии (1 Row 32px Toolbar, Mandates 8d, 8e, 8k, HIG) */}
			{!readOnly && (
				<div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto py-0.5 shrink-0 h-8 min-h-[32px]">
					{/* Протокол «Норма»: Instant PSR 0, Healthy Tissues & Form 043/u Protocol */}
					<button
						type="button"
						onClick={() => onApplyExpressPreset("perio_norm_express")}
						className="secondary-button shrink-0"
						title="Вся десна здорова (Норма) (PSR 0, глубина <= 2 мм, BOP 0, протокол в дневник)"
						data-testid="perio-toolbar-norm-1click-btn"
					>
						<ShieldCheck size={15} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
						<span>Десна здорова (Норма)</span>
					</button>

					{/* Протокол «Профгигиена»: Ultrasonic, Air-Flow Glycine & Service A16.07.051 */}
					<button
						type="button"
						onClick={() => onApplyExpressPreset("pro_hygiene_express")}
						className="secondary-button shrink-0"
						title="Профессиональная гигиена полости рта (УЗ + Air-Flow глицин + полировка + фторирование + услуга A16.07.051)"
						data-testid="perio-toolbar-prophy-1click-btn"
					>
						<UltrasonicScaler size={15} className="shrink-0 text-cyan-600 dark:text-cyan-400" />
						<span>Профгигиена</span>
					</button>

					<button
						type="button"
						onClick={onSetAllIntact}
						className="secondary-button shrink-0"
						title="Пародонт интактен / норма (все 32 зуба: глубина 2 мм, рецессия 0 мм, BOP 0%)"
						data-testid="perio-healthy-norm-btn"
					>
						<ShieldCheck size={14} className="text-emerald-500 shrink-0" />
						<span>Интактно</span>
					</button>

					<button
						type="button"
						onClick={() => onMarkSelectedToothPathology(5, true)}
						className="secondary-button hidden md:inline-flex shrink-0"
						title={`Быстрая разметка пародонтита: карман 5 мм + кровоточивость для выбранного зуба #${selectedToothNumber}`}
						data-testid="perio-preset-tooth-pathology"
					>
						<Droplets size={14} className="text-rose-500 shrink-0" />
						<span>#{selectedToothNumber} 5мм+BOP</span>
					</button>

					<button
						type="button"
						onClick={onMarkBopOnDeepPockets}
						className="secondary-button hidden lg:inline-flex shrink-0"
						title="Автоматически проставить кровоточивость на всех карманах глубиной ≥ 4 мм"
						data-testid="perio-preset-bop-pockets"
					>
						<Droplets size={14} className="text-rose-500 shrink-0" />
						<span>BOP ≥ 4мм</span>
					</button>

					<button
						type="button"
						onClick={onClearPlaque}
						className="secondary-button hidden xl:inline-flex shrink-0"
						title="Очистить весь зубной налет"
						data-testid="perio-preset-clear-plaque"
					>
						<RotateCcw size={14} className="text-teal-500 shrink-0" />
						<span>Очистить налет</span>
					</button>

					<button
						type="button"
						onClick={onToggleHygieneExpanded}
						className={`${isHygieneExpanded ? "primary-button" : "secondary-button"} shrink-0`}
						title="Открыть экспресс-расчет индексов гигиены (OHI-S, PMA, КПИ)"
						data-testid="perio-hygiene-indices-btn"
					>
						<ShieldCheck
							size={14}
							className={isHygieneExpanded ? "text-white" : "text-teal-500"}
						/>
						<span>Индексы гигиены</span>
						{isHygieneExpanded ? (
							<ChevronUp size={12} />
						) : (
							<ChevronDown size={12} />
						)}
					</button>

					{/* 1-Click Insert into 043/u: SINGLE PRIMARY CTA */}
					<button
						type="button"
						onClick={onInsertToProtocol}
						className="primary-button shrink-0"
						title="Сформировать и вставить протокол пародонтограммы в дневник приёма"
						data-testid="perio-insert-protocol-btn"
					>
						{insertStatus ? <Check size={14} /> : <DentalForm043 size={14} />}
						<span>
							{insertStatus ? "Внесено в медкарту!" : "Внести в дневник"}
						</span>
					</button>

					<button
						type="button"
						onClick={onCopyProtocol}
						className="secondary-button !px-2 !w-8 shrink-0"
						title="Копировать текст протокола в буфер"
						aria-label="Копировать текст протокола"
					>
						{copyStatus ? (
							<Check size={15} className="text-emerald-500" />
						) : (
							<Clipboard size={15} />
						)}
					</button>

					<button
						type="button"
						onClick={onToggleHelp}
						className="secondary-button !px-2 !w-8 shrink-0"
						title="Справка по горячим клавишам пародонтограммы"
						aria-label="Справка по горячим клавишам"
					>
						<HelpCircle size={15} />
					</button>
				</div>
			)}
		</div>
	);
});

PerioToolbar.displayName = "PerioToolbar";
