import type { PeriodontalDiagnosisDetail } from "@dental/shared";
import {
	Check,
	ChevronDown,
	ChevronUp,
	Clipboard,
	Droplets,
	FileText,
	HelpCircle,
	RotateCcw,
	Save,
	ShieldCheck,
} from "lucide-react";
import React from "react";
import {
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
	readonly syncStatus?:
		| "idle"
		| "loading"
		| "saving"
		| "synced"
		| "closed"
		| "error"
		| undefined;
	readonly lastSavedAt?: Date | null | undefined;
	readonly onSaveDraft?: (() => void) | undefined;
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
	syncStatus = "idle",
	lastSavedAt: _lastSavedAt,
	onSaveDraft,
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
				<div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 shrink-0">
					<PerioProbe size={20} />
				</div>
				<div className="min-w-0">
					<div className="flex items-center gap-2 flex-wrap sm:flex-nowrap min-w-0">
						<h3 className="text-base font-bold text-[var(--ink)] truncate">
							Карта пародонта
						</h3>
						<span
							className={`px-2.5 py-0.5 rounded-full text-xs font-bold border truncate max-w-xs shrink-0 ${
								aapDiagnosis.severity === "intact"
									? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
									: aapDiagnosis.severity === "gingivitis"
										? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
										: aapDiagnosis.severity === "moderate"
											? "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30"
											: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30"
							}`}
						>
							{aapDiagnosis.icd10Code} •{" "}
							{aapDiagnosis.diagnosisNameRu.split("(")[0]?.trim()}
						</span>
						{syncStatus && syncStatus !== "idle" && (
							<span
								className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border shrink-0 ${
									syncStatus === "saving" || syncStatus === "loading"
										? "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30"
										: syncStatus === "synced"
											? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
											: syncStatus === "closed"
												? "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30"
												: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
								}`}
								data-testid="perio-sync-status-badge"
							>
								{syncStatus === "saving" || syncStatus === "loading" ? (
									<span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-ping shrink-0" />
								) : syncStatus === "synced" ? (
									<Check size={11} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
								) : syncStatus === "closed" ? (
									<ShieldCheck size={11} className="text-sky-600 dark:text-sky-400 shrink-0" />
								) : (
									<span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
								)}
								<span>
									{syncStatus === "saving"
										? "Сохранение..."
										: syncStatus === "loading"
											? "Загрузка..."
											: syncStatus === "synced"
												? "В карте"
												: syncStatus === "closed"
													? "Зафиксирован"
													: "Черновик"}
								</span>
							</span>
						)}
					</div>
					<p className="text-xs text-[var(--muted)] mt-0.5 truncate">
						{aapDiagnosis.stageDescriptionRu}
					</p>
				</div>
			</div>

			{/* Тулбар клинических действий (Строго 1 строка 36px на десктопе, Мандат 8am: ровно 1 Primary CTA) */}
			{!readOnly && (
				<div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto py-0.5 shrink-0 h-9 min-h-[36px]">
					{/* 1-клик Физиологическая норма: «Пародонт в норме» (глубина 1-2 мм, кровоточивость 0%) */}
					<button
						type="button"
						onClick={() => onApplyExpressPreset("perio_norm_express")}
						className="secondary-button shrink-0 font-bold border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 !h-9 !min-h-[36px]"
						title="Вся десна здорова (Норма) • Пародонт интактен (глубина 1–2 мм, кровоточивость 0%)"
						data-testid="perio-toolbar-norm-1click-btn"
					>
						<ShieldCheck size={15} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
						<span>Пародонт в норме</span>
					</button>

					{/* Протокол «Профгигиена» */}
					<button
						type="button"
						onClick={() => onApplyExpressPreset("pro_hygiene_express")}
						className="secondary-button shrink-0 !h-9 !min-h-[36px]"
						title="Профессиональная гигиена полости рта (УЗ + Air-Flow + полировка + фторирование)"
						data-testid="perio-toolbar-prophy-1click-btn"
					>
						<UltrasonicScaler size={15} className="shrink-0 text-cyan-600 dark:text-cyan-400" />
						<span>Профгигиена</span>
					</button>

					{/* Быстрый сброс всех зубов к интактным */}
					<button
						type="button"
						onClick={onSetAllIntact}
						className="secondary-button shrink-0 !h-9 !min-h-[36px]"
						title="Пародонт интактен / норма (все 32 зуба: глубина 1–2 мм, рецессия 0 мм, BOP 0%)"
						data-testid="perio-healthy-norm-btn"
					>
						<span>Интактно</span>
					</button>

					{/* Протокол «Рецессия десны»: K06.0 */}
					<button
						type="button"
						onClick={() => onApplyExpressPreset("recession_express")}
						className="secondary-button shrink-0 !h-9 !min-h-[36px]"
						title="Рецессия десны (K06.0): рецессия 1–3 мм, карманы <= 2 мм, BOP 0"
						data-testid="perio-preset-recession-toolbar-btn"
					>
						<span>Рецессия</span>
					</button>

					{/* Быстрая отметка патологии выбранного зуба: карман 5 мм + кровоточивость */}
					<button
						type="button"
						onClick={() => onMarkSelectedToothPathology(5, true)}
						className="secondary-button hidden md:inline-flex shrink-0 !h-9 !min-h-[36px]"
						title={`Быстрая отметка кармана 5 мм с кровоточивостью для зуба #${selectedToothNumber}`}
						data-testid="perio-preset-tooth-pathology"
					>
						<Droplets size={14} className="text-rose-500 shrink-0" />
						<span>#{selectedToothNumber} 5мм+BOP</span>
					</button>

					{/* Автоматически проставить кровоточивость на всех карманах >= 4 мм */}
					<button
						type="button"
						onClick={onMarkBopOnDeepPockets}
						className="secondary-button hidden lg:inline-flex shrink-0 !h-9 !min-h-[36px]"
						title="Автоматически отметить кровоточивость на всех карманах глубиной ≥ 4 мм"
						data-testid="perio-preset-bop-pockets"
					>
						<Droplets size={14} className="text-rose-500 shrink-0" />
						<span>BOP ≥ 4мм</span>
					</button>

					{/* Очистить зубной налёт */}
					<button
						type="button"
						onClick={onClearPlaque}
						className="secondary-button hidden xl:inline-flex shrink-0 !h-9 !min-h-[36px]"
						title="Очистить весь зубной налет"
						data-testid="perio-preset-clear-plaque"
					>
						<RotateCcw size={14} className="text-teal-500 shrink-0" />
						<span>Очистить налет</span>
					</button>

					{/* Индексы гигиены */}
					<button
						type="button"
						onClick={onToggleHygieneExpanded}
						className={`secondary-button shrink-0 !h-9 !min-h-[36px] ${isHygieneExpanded ? "border-teal-500 text-teal-700 dark:text-teal-300 font-bold bg-teal-500/10" : ""}`}
						title="Открыть расчет индексов гигиены (OHI-S, PMA, КПИ)"
						data-testid="perio-hygiene-indices-btn"
					>
						<ShieldCheck
							size={14}
							className={isHygieneExpanded ? "text-teal-600 dark:text-teal-400" : "text-[var(--muted)]"}
						/>
						<span>Индексы гигиены</span>
						{isHygieneExpanded ? (
							<ChevronUp size={12} />
						) : (
							<ChevronDown size={12} />
						)}
					</button>

					{/* Внести в дневник визита */}
					<button
						type="button"
						onClick={onInsertToProtocol}
						className="secondary-button shrink-0 !h-9 !min-h-[36px]"
						title="Сформировать клиническое резюме и вставить в дневник приёма"
						data-testid="perio-insert-protocol-btn"
					>
						{insertStatus ? <Check size={14} className="text-emerald-500" /> : <FileText size={14} className="text-teal-600 dark:text-teal-400" />}
						<span>
							{insertStatus ? "Внесено в дневник!" : "Внести в дневник"}
						</span>
					</button>

					{/* ЕДИНСТВЕННАЯ PRIMARY CTA КНОПКА (МАНДАТ 8am): «Сохранить периодонтограмму» */}
					{onSaveDraft && (
						<button
							type="button"
							onClick={onSaveDraft}
							disabled={syncStatus === "saving"}
							className="primary-button shrink-0 font-bold !h-9 !min-h-[36px]"
							title="Сохранить карту пародонта в электронную медицинскую карту"
							data-testid="perio-save-draft-btn"
						>
							<Save size={15} className={syncStatus === "saving" ? "animate-spin text-white" : "text-white"} />
							<span>Сохранить периодонтограмму</span>
						</button>
					)}

					{/* Иконка сброса */}
					<button
						type="button"
						onClick={onSetAllIntact}
						className="icon-button shrink-0 !h-9 !w-9 !min-h-[36px]"
						title="Сбросить карту к физиологической норме"
						aria-label="Сбросить карту к норме"
						data-testid="perio-reset-icon-btn"
					>
						<RotateCcw size={15} />
					</button>

					{/* Копировать текст протокола */}
					<button
						type="button"
						onClick={onCopyProtocol}
						className="icon-button shrink-0 !h-9 !w-9 !min-h-[36px]"
						title="Копировать текст резюме пародонта в буфер"
						aria-label="Копировать текст резюме"
					>
						{copyStatus ? (
							<Check size={15} className="text-emerald-500" />
						) : (
							<Clipboard size={15} />
						)}
					</button>

					{/* Справка */}
					<button
						type="button"
						onClick={onToggleHelp}
						className="icon-button shrink-0 !h-9 !w-9 !min-h-[36px]"
						title="Справка по карте пародонта"
						aria-label="Справка по карте пародонта"
					>
						<HelpCircle size={15} />
					</button>
				</div>
			)}
		</div>
	);
});

PerioToolbar.displayName = "PerioToolbar";
