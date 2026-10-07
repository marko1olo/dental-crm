/**
 * DENTE Dental CRM — Odontogram Toolbar Quick Actions Dropdown
 *
 * Provides batch quadrant selection (Q1..Q4, Q5..Q8, Front) and jaw/occlusion launchers (JU, JL, C).
 */

import React, { useCallback } from "react";
import { ArrowLeftRight, ChevronDown, Layers, X, Zap } from "lucide-react";
import type { ToothState } from "./ToothChart";
import { TOOTH_STATE_LABELS } from "./chart/toothChartTypes";
import { SoundFeedbackService } from "../../services/audio/SoundFeedbackService";
import { showToast } from "../GlobalToast";

export interface OdontogramToolbarQuickActionsProps {
	onQuickStateChange?: ((targets: number[], state: ToothState, surfaces?: readonly string[] | undefined) => void) | undefined;
	handleMarkIntactDentition: () => void;
	handleMarkWisdomTeethMissing: () => void;
	handleBatchSelectGroup: (teeth: number[]) => void;
	setActiveJawModalTarget: (target: "JU" | "JL" | "C") => void;
	pediatricMode?: boolean | undefined;
	isPediatricEffective: boolean;
	ADULT_Q1: number[];
	ADULT_Q2: number[];
	ADULT_Q3: number[];
	ADULT_Q4: number[];
	ADULT_FRONT: number[];
	PEDIATRIC_Q5: number[];
	PEDIATRIC_Q6: number[];
	PEDIATRIC_Q7: number[];
	PEDIATRIC_Q8: number[];
	PEDIATRIC_FRONT: number[];
	activeStampTool?: ToothState | null | undefined;
	selectedTeeth?: number[] | undefined;
	onInvertSelection?: (() => void) | undefined;
	onClearSelection?: (() => void) | undefined;
}

export const OdontogramToolbarQuickActions: React.FC<OdontogramToolbarQuickActionsProps> = React.memo(({
	onQuickStateChange,
	handleMarkIntactDentition,
	handleMarkWisdomTeethMissing,
	handleBatchSelectGroup,
	setActiveJawModalTarget,
	pediatricMode,
	isPediatricEffective,
	ADULT_Q1,
	ADULT_Q2,
	ADULT_Q3,
	ADULT_Q4,
	ADULT_FRONT,
	PEDIATRIC_Q5,
	PEDIATRIC_Q6,
	PEDIATRIC_Q7,
	PEDIATRIC_Q8,
	PEDIATRIC_FRONT,
	activeStampTool,
	selectedTeeth,
	onInvertSelection,
	onClearSelection,
}) => {
	const allDentitionTeeth = isPediatricEffective
		? [...PEDIATRIC_Q5, ...PEDIATRIC_Q6, ...PEDIATRIC_Q7, ...PEDIATRIC_Q8]
		: [...ADULT_Q1, ...ADULT_Q2, ...ADULT_Q3, ...ADULT_Q4];

	const handleSanitizeAll = useCallback(() => {
		if (onQuickStateChange) {
			onQuickStateChange(allDentitionTeeth, "Healthy", []);
		}
		handleMarkIntactDentition();
	}, [allDentitionTeeth, onQuickStateChange, handleMarkIntactDentition]);

	const handleWisdomMissing = useCallback(() => {
		const wisdomTeeth = [18, 28, 38, 48];
		if (onQuickStateChange) {
			onQuickStateChange(wisdomTeeth, "Missing", []);
		}
		handleMarkWisdomTeethMissing();
	}, [onQuickStateChange, handleMarkWisdomTeethMissing]);

	const handleInvert = useCallback(() => {
		if (onInvertSelection) {
			onInvertSelection();
			return;
		}
		const selectedSet = new Set(selectedTeeth ?? []);
		const inverted = allDentitionTeeth.filter((t) => !selectedSet.has(t));
		handleBatchSelectGroup(inverted);
		SoundFeedbackService.getInstance().playActionSuccess();
		showToast(
			`Инвертировано: выделено ${inverted.length} из ${allDentitionTeeth.length} зубов`,
			"info",
			3000,
		);
	}, [onInvertSelection, allDentitionTeeth, selectedTeeth, handleBatchSelectGroup]);

	const handleClear = useCallback(() => {
		if (onClearSelection) {
			onClearSelection();
			return;
		}
		handleBatchSelectGroup([]);
		SoundFeedbackService.getInstance().playActionSuccess();
		showToast("Выделение зубов снято", "info", 2000);
	}, [onClearSelection, handleBatchSelectGroup]);

	const handleGroupAction = useCallback(
		(teeth: number[]) => {
			if (activeStampTool && onQuickStateChange) {
				onQuickStateChange(teeth, activeStampTool, []);
				SoundFeedbackService.getInstance().playActionSuccess();
				const label = TOOTH_STATE_LABELS[activeStampTool] || activeStampTool;
				showToast(
					`Штамп «${label}» применён ко всем ${teeth.length} зубам целиком (без поверхностей)`,
					"success",
					3500,
				);
				return;
			}
			handleBatchSelectGroup(teeth);
		},
		[activeStampTool, onQuickStateChange, handleBatchSelectGroup],
	);

	const stampHint = activeStampTool
		? ` (Штамп «${TOOTH_STATE_LABELS[activeStampTool] || activeStampTool}» окрасит всю группу)`
		: "";

	return (
		<details className="relative shrink-0">
			<summary
				className="list-none h-7.5 px-2.5 rounded-[8px] bg-[var(--paper-soft,var(--odontogram-surface-hover,#f1f5f9))] border border-[var(--line-subtle,var(--odontogram-border-subtle,#e2e8f0))] hover:text-indigo-600 text-[var(--ink-muted,#64748b)] text-[12.5px] font-medium flex items-center gap-1 cursor-pointer select-none transition-all shrink-0"
				title="Быстрые действия: санация, без 8-ок, инвертировать, квадранты, челюсти"
				data-testid="odontogram-quick-actions-menu"
			>
				<Layers size={13} className="shrink-0 text-indigo-600 dark:text-indigo-400" />
				<span className="hidden sm:inline">Действия</span>
				<ChevronDown size={12} className="shrink-0 opacity-70" />
			</summary>
			<div className="absolute right-0 top-full mt-1.5 z-40 w-72 p-2 rounded-xl shadow-xl bg-[var(--paper,#ffffff)] dark:bg-zinc-900 border border-[var(--odontogram-border-subtle,#e2e8f0)] dark:border-zinc-800 flex flex-col gap-2">
				{onQuickStateChange && (
					<div>
						<div className="text-xs font-bold uppercase tracking-wider text-[var(--odontogram-ink-muted,#64748b)] px-1 mb-1 select-none">
							Пакетные операции
						</div>
						<div className="flex items-center gap-1.5 mb-1.5">
							<button
								type="button"
								onClick={(e) => {
									const details = e.currentTarget.closest("details");
									if (details) details.open = false;
									handleSanitizeAll();
								}}
								className="flex-1 h-7 px-2 rounded-lg text-xs font-black bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-200 border border-emerald-500/30 transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1 active:scale-98"
								title="Физиологическая норма (зубные ряды интактны): вся челюсть моментально помечается здоровой без поверхностей"
								data-testid="mark-intact-dentition-dropdown-btn mark-intact-dentition-btn"
							>
								<Zap size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
								<span>Санирован</span>
							</button>

							{!pediatricMode && (
								<button
									type="button"
									onClick={(e) => {
										const details = e.currentTarget.closest("details");
										if (details) details.open = false;
										handleWisdomMissing();
									}}
									className="flex-1 h-7 px-2 rounded-lg text-xs font-black bg-zinc-500/15 hover:bg-zinc-500/25 text-zinc-800 dark:text-zinc-200 border border-zinc-500/30 transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1 active:scale-98"
									title="Первичная адентия третьих моляров: зубы 18, 28, 38, 48 моментально помечаются отсутствующими без поверхностей"
									data-testid="mark-wisdom-missing-btn"
								>
									<Zap size={13} className="text-zinc-500 shrink-0" />
									<span>Без 8-ок</span>
								</button>
							)}
						</div>

						{/* Инвертировать и снять выделение */}
						<div className="flex items-center gap-1.5">
							<button
								type="button"
								onClick={(e) => {
									const details = e.currentTarget.closest("details");
									if (details) details.open = false;
									handleInvert();
								}}
								className="flex-1 h-7 px-2 rounded-lg text-xs font-bold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-800 dark:text-indigo-200 border border-indigo-500/25 transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1 active:scale-98"
								title="Инвертировать выделение зубов: инвертирует текущий выбор относительно всех зубов челюсти"
								data-testid="invert-selection-btn invert-selection-dropdown-btn"
							>
								<ArrowLeftRight size={12} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
								<span>Инвертировать</span>
							</button>

							<button
								type="button"
								onClick={(e) => {
									const details = e.currentTarget.closest("details");
									if (details) details.open = false;
									handleClear();
								}}
								className="h-7 px-2.5 rounded-lg text-xs font-bold bg-zinc-500/10 hover:bg-zinc-500/20 text-zinc-700 dark:text-zinc-300 border border-zinc-500/20 transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1 active:scale-98"
								title="Снять выделение со всех зубов"
								data-testid="clear-selection-btn"
							>
								<X size={12} className="text-zinc-500 shrink-0" />
								<span>Снять</span>
							</button>
						</div>
					</div>
				)}

				<div>
					<div className="text-xs font-bold uppercase tracking-wider text-[var(--odontogram-ink-muted,#64748b)] px-1 mb-1 select-none flex items-center justify-between">
						<span>Выбор квадрантов и фронта</span>
						{activeStampTool && (
							<span className="text-amber-600 dark:text-amber-400 font-bold normal-case text-2xs">
								штамп активен
							</span>
						)}
					</div>
					<div className="flex items-center gap-1">
						{isPediatricEffective ? (
							<>
								<button
									type="button"
									onClick={(e) => {
										const details = e.currentTarget.closest("details");
										if (details) details.open = false;
										handleGroupAction(PEDIATRIC_Q5);
									}}
									className="flex-1 h-7 rounded text-xs font-bold text-[var(--odontogram-ink-muted,#64748b)] hover:text-[var(--odontogram-ink,#0f172a)] hover:bg-[var(--odontogram-surface,#ffffff)] border border-[var(--odontogram-border-subtle,#e2e8f0)] transition-all cursor-pointer select-none text-center"
									title={`Выбрать Q5 (55–51, В/Ч Правый)${stampHint}`}
									data-testid="batch-select-q5-btn"
								>
									Q5
								</button>
								<button
									type="button"
									onClick={(e) => {
										const details = e.currentTarget.closest("details");
										if (details) details.open = false;
										handleGroupAction(PEDIATRIC_Q6);
									}}
									className="flex-1 h-7 rounded text-xs font-bold text-[var(--odontogram-ink-muted,#64748b)] hover:text-[var(--odontogram-ink,#0f172a)] hover:bg-[var(--odontogram-surface,#ffffff)] border border-[var(--odontogram-border-subtle,#e2e8f0)] transition-all cursor-pointer select-none text-center"
									title={`Выбрать Q6 (61–65, В/Ч Левый)${stampHint}`}
									data-testid="batch-select-q6-btn"
								>
									Q6
								</button>
								<button
									type="button"
									onClick={(e) => {
										const details = e.currentTarget.closest("details");
										if (details) details.open = false;
										handleGroupAction(PEDIATRIC_Q7);
									}}
									className="flex-1 h-7 rounded text-xs font-bold text-[var(--odontogram-ink-muted,#64748b)] hover:text-[var(--odontogram-ink,#0f172a)] hover:bg-[var(--odontogram-surface,#ffffff)] border border-[var(--odontogram-border-subtle,#e2e8f0)] transition-all cursor-pointer select-none text-center"
									title={`Выбрать Q7 (71–75, Н/Ч Левый)${stampHint}`}
									data-testid="batch-select-q7-btn"
								>
									Q7
								</button>
								<button
									type="button"
									onClick={(e) => {
										const details = e.currentTarget.closest("details");
										if (details) details.open = false;
										handleGroupAction(PEDIATRIC_Q8);
									}}
									className="flex-1 h-7 rounded text-xs font-bold text-[var(--odontogram-ink-muted,#64748b)] hover:text-[var(--odontogram-ink,#0f172a)] hover:bg-[var(--odontogram-surface,#ffffff)] border border-[var(--odontogram-border-subtle,#e2e8f0)] transition-all cursor-pointer select-none text-center"
									title={`Выбрать Q8 (85–81, Н/Ч Правый)${stampHint}`}
									data-testid="batch-select-q8-btn"
								>
									Q8
								</button>
								<button
									type="button"
									onClick={(e) => {
										const details = e.currentTarget.closest("details");
										if (details) details.open = false;
										handleGroupAction(PEDIATRIC_FRONT);
									}}
									className="flex-1 h-7 rounded text-xs font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-500/15 border border-amber-500/30 transition-all cursor-pointer select-none text-center"
									title={`Выбрать детскую фронтальную группу (53–63, 83–73)${stampHint}`}
									data-testid="batch-select-front-btn"
								>
									Фронт
								</button>
							</>
						) : (
							<>
								<button
									type="button"
									onClick={(e) => {
										const details = e.currentTarget.closest("details");
										if (details) details.open = false;
										handleGroupAction(ADULT_Q1);
									}}
									className="flex-1 h-7 rounded text-xs font-bold text-[var(--odontogram-ink-muted,#64748b)] hover:text-[var(--odontogram-ink,#0f172a)] hover:bg-[var(--odontogram-surface,#ffffff)] border border-[var(--odontogram-border-subtle,#e2e8f0)] transition-all cursor-pointer select-none text-center"
									title={`Выбрать Q1 (18–11, В/Ч Правый)${stampHint}`}
									data-testid="batch-select-q1-btn"
								>
									Q1
								</button>
								<button
									type="button"
									onClick={(e) => {
										const details = e.currentTarget.closest("details");
										if (details) details.open = false;
										handleGroupAction(ADULT_Q2);
									}}
									className="flex-1 h-7 rounded text-xs font-bold text-[var(--odontogram-ink-muted,#64748b)] hover:text-[var(--odontogram-ink,#0f172a)] hover:bg-[var(--odontogram-surface,#ffffff)] border border-[var(--odontogram-border-subtle,#e2e8f0)] transition-all cursor-pointer select-none text-center"
									title={`Выбрать Q2 (21–28, В/Ч Левый)${stampHint}`}
									data-testid="batch-select-q2-btn"
								>
									Q2
								</button>
								<button
									type="button"
									onClick={(e) => {
										const details = e.currentTarget.closest("details");
										if (details) details.open = false;
										handleGroupAction(ADULT_Q3);
									}}
									className="flex-1 h-7 rounded text-xs font-bold text-[var(--odontogram-ink-muted,#64748b)] hover:text-[var(--odontogram-ink,#0f172a)] hover:bg-[var(--odontogram-surface,#ffffff)] border border-[var(--odontogram-border-subtle,#e2e8f0)] transition-all cursor-pointer select-none text-center"
									title={`Выбрать Q3 (31–38, Н/Ч Левый)${stampHint}`}
									data-testid="batch-select-q3-btn"
								>
									Q3
								</button>
								<button
									type="button"
									onClick={(e) => {
										const details = e.currentTarget.closest("details");
										if (details) details.open = false;
										handleGroupAction(ADULT_Q4);
									}}
									className="flex-1 h-7 rounded text-xs font-bold text-[var(--odontogram-ink-muted,#64748b)] hover:text-[var(--odontogram-ink,#0f172a)] hover:bg-[var(--odontogram-surface,#ffffff)] border border-[var(--odontogram-border-subtle,#e2e8f0)] transition-all cursor-pointer select-none text-center"
									title={`Выбрать Q4 (48–41, Н/Ч Правый)${stampHint}`}
									data-testid="batch-select-q4-btn"
								>
									Q4
								</button>
								<button
									type="button"
									onClick={(e) => {
										const details = e.currentTarget.closest("details");
										if (details) details.open = false;
										handleGroupAction(ADULT_FRONT);
									}}
									className="flex-1 h-7 rounded text-xs font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-500/15 border border-amber-500/30 transition-all cursor-pointer select-none text-center"
									title={`Выбрать фронтальную группу (13–23, 43–33)${stampHint}`}
									data-testid="batch-select-front-btn"
								>
									Фронт
								</button>
							</>
						)}
					</div>
				</div>

				<div>
					<div className="text-xs font-bold uppercase tracking-wider text-[var(--odontogram-ink-muted,#64748b)] px-1 mb-1 select-none">
						Челюсти и прикус
					</div>
					<div className="flex items-center gap-1.5">
						<button
							type="button"
							onClick={(e) => {
								const details = e.currentTarget.closest("details");
								if (details) details.open = false;
								setActiveJawModalTarget("JU");
							}}
							className="flex-1 h-7 rounded-lg text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition-all cursor-pointer select-none text-center"
							title="Верхняя челюсть (JU / Maxilla): адентия, атрофия, синус-лифтинг"
							data-testid="view-toolbar-jaw-ju-btn"
						>
							В/Ч
						</button>
						<button
							type="button"
							onClick={(e) => {
								const details = e.currentTarget.closest("details");
								if (details) details.open = false;
								setActiveJawModalTarget("JL");
							}}
							className="flex-1 h-7 rounded-lg text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition-all cursor-pointer select-none text-center"
							title="Нижняя челюсть (JL / Mandibula): адентия, атрофия, экзостозы"
							data-testid="view-toolbar-jaw-jl-btn"
						>
							Н/Ч
						</button>
						<button
							type="button"
							onClick={(e) => {
								const details = e.currentTarget.closest("details");
								if (details) details.open = false;
								setActiveJawModalTarget("C");
							}}
							className="flex-1 h-7 rounded-lg text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 transition-all cursor-pointer select-none text-center"
							title="Прикус / Окклюзия (C): ортогнатический, дистальный, мезиальный, глубокий"
							data-testid="view-toolbar-jaw-c-btn"
						>
							Прикус
						</button>
					</div>
				</div>
			</div>
		</details>
	);
});
OdontogramToolbarQuickActions.displayName = "OdontogramToolbarQuickActions";
