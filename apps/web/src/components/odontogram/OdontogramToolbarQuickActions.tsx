/**
 * DENTE Dental CRM — Odontogram Toolbar Quick Actions Dropdown
 * Provides batch quadrant selection, jaw/occlusion launchers, and intact dentition shortcuts.
 * Consolidated SSOT under Mandate 8bd / 8bi / 8am (zero micro-shredder files).
 */

import { ArrowLeftRight, ChevronDown, Layers, ShieldCheck, Sparkles, X } from "lucide-react";
import React from "react";
import { TOOTH_STATE_LABELS } from "./chart/toothChartTypes";
import type { ToothState } from "./ToothChart";
import type { OdontogramToolbarQuickActionsProps } from "./quickActionsTypes";
import { useQuickActionsHandlers } from "./useQuickActionsHandlers";

export type { OdontogramToolbarQuickActionsProps };

export interface QuickActionsBatchOpsProps {
	readonly pediatricMode?: boolean | undefined;
	readonly onSanitizeAll: () => void;
	readonly onWisdomMissing: () => void;
	readonly onInvert: () => void;
	readonly onClear: () => void;
	readonly onFrontalHygiene?: (() => void) | undefined;
}

export const QuickActionsBatchOps: React.FC<QuickActionsBatchOpsProps> = ({
	pediatricMode,
	onSanitizeAll,
	onWisdomMissing,
	onInvert,
	onClear,
	onFrontalHygiene,
}) => {
	const closeDetails = (e: React.MouseEvent) => {
		const details = e.currentTarget.closest("details");
		if (details) details.open = false;
	};

	return (
		<div>
			<div className="text-xs font-bold text-[var(--odontogram-ink-muted,#64748b)] px-1 mb-1 select-none">
				Пакетные операции
			</div>
			<div className="flex items-center gap-1.5 mb-1.5">
				<button
					type="button"
					onClick={(e) => {
						closeDetails(e);
						onSanitizeAll();
					}}
					className="flex-1 min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 px-2.5 rounded-lg text-xs font-black bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-200 border border-emerald-500/30 transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1 active:scale-98"
					title="Физиологическая норма: вся челюсть помечается здоровой"
					data-testid="mark-intact-dentition-dropdown-btn"
				>
					<ShieldCheck
						size={13}
						className="text-emerald-600 dark:text-emerald-400 shrink-0"
					/>
					<span>Санирован</span>
				</button>
				{!pediatricMode && (
					<button
						type="button"
						onClick={(e) => {
							closeDetails(e);
							onWisdomMissing();
						}}
						className="flex-1 min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 px-2.5 rounded-lg text-xs font-black bg-zinc-500/15 hover:bg-zinc-500/25 text-zinc-800 dark:text-zinc-200 border border-zinc-500/30 transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1 active:scale-98"
						title="Первичная адентия третьих моляров (18, 28, 38, 48)"
						data-testid="mark-wisdom-missing-btn"
					>
						<X size={13} className="text-zinc-500 shrink-0" />
						<span>Без 8-ок</span>
					</button>
				)}
			</div>
			{onFrontalHygiene && (
				<div className="mb-1.5">
					<button
						type="button"
						onClick={(e) => {
							closeDetails(e);
							onFrontalHygiene();
						}}
						className="w-full min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 px-2.5 rounded-lg text-xs font-black bg-teal-500/15 hover:bg-teal-500/25 text-teal-800 dark:text-teal-200 border border-teal-500/30 transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5 active:scale-98"
						title={
							pediatricMode
								? "Пакетная профгигиена фронтального сектора (53–63, 83–73)"
								: "Пакетная профгигиена фронтального сектора (13–23, 33–43): снятие налета и зубного камня"
						}
						data-testid="mark-frontal-hygiene-btn"
					>
						<Sparkles
							size={13}
							className="text-teal-600 dark:text-teal-400 shrink-0"
						/>
						<span>Пакетная гигиена (13–23, 33–43)</span>
					</button>
				</div>
			)}
			<div className="flex items-center gap-1.5">
				<button
					type="button"
					onClick={(e) => {
						closeDetails(e);
						onInvert();
					}}
					className="flex-1 min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 px-2.5 rounded-lg text-xs font-bold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-800 dark:text-indigo-200 border border-indigo-500/25 transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1 active:scale-98"
					title="Инвертировать выделение зубов"
					data-testid="invert-selection-dropdown-btn"
				>
					<ArrowLeftRight
						size={12}
						className="text-indigo-600 dark:text-indigo-400 shrink-0"
					/>
					<span>Инвертировать</span>
				</button>
				<button
					type="button"
					onClick={(e) => {
						closeDetails(e);
						onClear();
					}}
					className="min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 px-3 rounded-lg text-xs font-bold bg-zinc-500/10 hover:bg-zinc-500/20 text-zinc-700 dark:text-zinc-300 border border-zinc-500/20 transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1 active:scale-98"
					title="Снять выделение со всех зубов"
					data-testid="clear-selection-btn"
				>
					<X size={12} className="text-zinc-500 shrink-0" />
					<span>Снять</span>
				</button>
			</div>
		</div>
	);
};

export interface AdultQuadrantsButtonsProps {
	readonly stampHint: string;
	readonly onGroupAction: (teeth: number[]) => void;
	readonly ADULT_Q1: number[];
	readonly ADULT_Q2: number[];
	readonly ADULT_Q3: number[];
	readonly ADULT_Q4: number[];
	readonly ADULT_FRONT: number[];
}

export const AdultQuadrantsButtons: React.FC<AdultQuadrantsButtonsProps> = ({
	stampHint,
	onGroupAction,
	ADULT_Q1,
	ADULT_Q2,
	ADULT_Q3,
	ADULT_Q4,
	ADULT_FRONT,
}) => {
	const closeAndAction = (e: React.MouseEvent, teeth: number[]) => {
		const details = e.currentTarget.closest("details");
		if (details) details.open = false;
		onGroupAction(teeth);
	};

	const btnCls =
		"flex-1 min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 rounded-lg text-xs font-bold text-[var(--ink-muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] transition-all cursor-pointer select-none text-center flex items-center justify-center";
	const frontCls = btnCls;

	return (
		<>
			<button
				type="button"
				onClick={(e) => closeAndAction(e, ADULT_Q1)}
				className={btnCls}
				title={`Q1 (18–11)${stampHint}`}
				data-testid="batch-select-q1-btn"
			>
				Q1
			</button>
			<button
				type="button"
				onClick={(e) => closeAndAction(e, ADULT_Q2)}
				className={btnCls}
				title={`Q2 (21–28)${stampHint}`}
				data-testid="batch-select-q2-btn"
			>
				Q2
			</button>
			<button
				type="button"
				onClick={(e) => closeAndAction(e, ADULT_Q3)}
				className={btnCls}
				title={`Q3 (31–38)${stampHint}`}
				data-testid="batch-select-q3-btn"
			>
				Q3
			</button>
			<button
				type="button"
				onClick={(e) => closeAndAction(e, ADULT_Q4)}
				className={btnCls}
				title={`Q4 (48–41)${stampHint}`}
				data-testid="batch-select-q4-btn"
			>
				Q4
			</button>
			<button
				type="button"
				onClick={(e) => closeAndAction(e, ADULT_FRONT)}
				className={frontCls}
				title={`Фронт (13–23, 43–33)${stampHint}`}
				data-testid="batch-select-front-btn"
			>
				Фронт
			</button>
		</>
	);
};

export interface PediatricQuadrantsButtonsProps {
	readonly stampHint: string;
	readonly onGroupAction: (teeth: number[]) => void;
	readonly PEDIATRIC_Q5: number[];
	readonly PEDIATRIC_Q6: number[];
	readonly PEDIATRIC_Q7: number[];
	readonly PEDIATRIC_Q8: number[];
	readonly PEDIATRIC_FRONT: number[];
}

export const PediatricQuadrantsButtons: React.FC<PediatricQuadrantsButtonsProps> = ({
	stampHint,
	onGroupAction,
	PEDIATRIC_Q5,
	PEDIATRIC_Q6,
	PEDIATRIC_Q7,
	PEDIATRIC_Q8,
	PEDIATRIC_FRONT,
}) => {
	const closeAndAction = (e: React.MouseEvent, teeth: number[]) => {
		const details = e.currentTarget.closest("details");
		if (details) details.open = false;
		onGroupAction(teeth);
	};

	const btnCls =
		"flex-1 min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 rounded-lg text-xs font-bold text-[var(--ink-muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] transition-all cursor-pointer select-none text-center flex items-center justify-center";
	const frontCls = btnCls;

	return (
		<>
			<button
				type="button"
				onClick={(e) => closeAndAction(e, PEDIATRIC_Q5)}
				className={btnCls}
				title={`Q5 (55–51)${stampHint}`}
				data-testid="batch-select-q5-btn"
			>
				Q5
			</button>
			<button
				type="button"
				onClick={(e) => closeAndAction(e, PEDIATRIC_Q6)}
				className={btnCls}
				title={`Q6 (61–65)${stampHint}`}
				data-testid="batch-select-q6-btn"
			>
				Q6
			</button>
			<button
				type="button"
				onClick={(e) => closeAndAction(e, PEDIATRIC_Q7)}
				className={btnCls}
				title={`Q7 (71–75)${stampHint}`}
				data-testid="batch-select-q7-btn"
			>
				Q7
			</button>
			<button
				type="button"
				onClick={(e) => closeAndAction(e, PEDIATRIC_Q8)}
				className={btnCls}
				title={`Q8 (85–81)${stampHint}`}
				data-testid="batch-select-q8-btn"
			>
				Q8
			</button>
			<button
				type="button"
				onClick={(e) => closeAndAction(e, PEDIATRIC_FRONT)}
				className={frontCls}
				title={`Фронт (53–63, 83–73)${stampHint}`}
				data-testid="batch-select-front-btn"
			>
				Фронт
			</button>
		</>
	);
};

export interface QuickActionsQuadrantsProps {
	readonly isPediatricEffective: boolean;
	readonly activeStampTool?: ToothState | null | undefined;
	readonly stampHint: string;
	readonly onGroupAction: (teeth: number[]) => void;
	readonly ADULT_Q1: number[];
	readonly ADULT_Q2: number[];
	readonly ADULT_Q3: number[];
	readonly ADULT_Q4: number[];
	readonly ADULT_FRONT: number[];
	readonly PEDIATRIC_Q5: number[];
	readonly PEDIATRIC_Q6: number[];
	readonly PEDIATRIC_Q7: number[];
	readonly PEDIATRIC_Q8: number[];
	readonly PEDIATRIC_FRONT: number[];
}

export const QuickActionsQuadrants: React.FC<QuickActionsQuadrantsProps> = ({
	isPediatricEffective,
	activeStampTool,
	stampHint,
	onGroupAction,
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
}) => {
	return (
		<div>
			<div className="text-xs font-bold text-[var(--odontogram-ink-muted,#64748b)] px-1 mb-1 select-none flex items-center justify-between">
				<span>Выбор квадрантов и фронта</span>
				{activeStampTool && (
					<span className="text-amber-600 dark:text-amber-400 font-bold normal-case text-2xs">
						штамп активен
					</span>
				)}
			</div>
			<div className="flex items-center gap-1">
				{isPediatricEffective ? (
					<PediatricQuadrantsButtons
						stampHint={stampHint}
						onGroupAction={onGroupAction}
						PEDIATRIC_Q5={PEDIATRIC_Q5}
						PEDIATRIC_Q6={PEDIATRIC_Q6}
						PEDIATRIC_Q7={PEDIATRIC_Q7}
						PEDIATRIC_Q8={PEDIATRIC_Q8}
						PEDIATRIC_FRONT={PEDIATRIC_FRONT}
					/>
				) : (
					<AdultQuadrantsButtons
						stampHint={stampHint}
						onGroupAction={onGroupAction}
						ADULT_Q1={ADULT_Q1}
						ADULT_Q2={ADULT_Q2}
						ADULT_Q3={ADULT_Q3}
						ADULT_Q4={ADULT_Q4}
						ADULT_FRONT={ADULT_FRONT}
					/>
				)}
			</div>
		</div>
	);
};

export interface QuickActionsJawsProps {
	readonly onSelectJaw: (target: "JU" | "JL" | "C") => void;
}

export const QuickActionsJaws: React.FC<QuickActionsJawsProps> = ({
	onSelectJaw,
}) => {
	const closeAndSelect = (e: React.MouseEvent, target: "JU" | "JL" | "C") => {
		const details = e.currentTarget.closest("details");
		if (details) details.open = false;
		onSelectJaw(target);
	};

	return (
		<div>
			<div className="text-xs font-bold text-[var(--odontogram-ink-muted,#64748b)] px-1 mb-1 select-none">
				Челюсти и прикус
			</div>
			<div className="flex items-center gap-1.5">
				<button
					type="button"
					onClick={(e) => closeAndSelect(e, "JU")}
					className="flex-1 min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 px-2.5 rounded-lg text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition-all cursor-pointer select-none text-center flex items-center justify-center"
					title="Верхняя челюсть (JU / Maxilla)"
					data-testid="view-toolbar-jaw-ju-btn"
				>
					В/Ч
				</button>
				<button
					type="button"
					onClick={(e) => closeAndSelect(e, "JL")}
					className="flex-1 min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 px-2.5 rounded-lg text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition-all cursor-pointer select-none text-center flex items-center justify-center"
					title="Нижняя челюсть (JL / Mandibula)"
					data-testid="view-toolbar-jaw-jl-btn"
				>
					Н/Ч
				</button>
				<button
					type="button"
					onClick={(e) => closeAndSelect(e, "C")}
					className="flex-1 min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 px-2.5 rounded-lg text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 transition-all cursor-pointer select-none text-center flex items-center justify-center"
					title="Прикус / Окклюзия (C)"
					data-testid="view-toolbar-jaw-c-btn"
				>
					Прикус
				</button>
			</div>
		</div>
	);
};

export const OdontogramToolbarQuickActions: React.FC<OdontogramToolbarQuickActionsProps> =
	React.memo((props) => {
		const allDentitionTeeth = props.isPediatricEffective
			? [
					...props.PEDIATRIC_Q5,
					...props.PEDIATRIC_Q6,
					...props.PEDIATRIC_Q7,
					...props.PEDIATRIC_Q8,
				]
			: [
					...props.ADULT_Q1,
					...props.ADULT_Q2,
					...props.ADULT_Q3,
					...props.ADULT_Q4,
				];

		const handlers = useQuickActionsHandlers({
			allDentitionTeeth,
			activeStampTool: props.activeStampTool,
			selectedTeeth: props.selectedTeeth,
			onQuickStateChange: props.onQuickStateChange,
			handleMarkIntactDentition: props.handleMarkIntactDentition,
			handleMarkWisdomTeethMissing: props.handleMarkWisdomTeethMissing,
			handleMarkFrontalHygiene: props.handleMarkFrontalHygiene,
			handleBatchSelectGroup: props.handleBatchSelectGroup,
			onInvertSelection: props.onInvertSelection,
			onClearSelection: props.onClearSelection,
		});

		const stampHint = props.activeStampTool
			? ` (Штамп «${TOOTH_STATE_LABELS[props.activeStampTool] || props.activeStampTool}» окрасит всю группу)`
			: "";

		return (
			<details className="relative shrink-0">
				<summary
					className="list-none odontogram-tools-trigger-btn"
					title="Выделение квадрантов, челюстей, инверсия и санация"
					data-testid="odontogram-quick-actions-menu"
				>
					<Layers size={14} className="shrink-0 text-[var(--muted,#64748b)]" />
					<span className="hidden sm:inline font-bold">Выделение</span>
					<ChevronDown
						size={13}
						className="shrink-0 text-[var(--muted,#64748b)]"
					/>
				</summary>
				<div className="absolute right-0 top-full mt-1.5 z-40 w-72 p-2 rounded-xl shadow-xl bg-[var(--paper,#ffffff)] dark:bg-zinc-900 border border-[var(--odontogram-border-subtle,#e2e8f0)] dark:border-zinc-800 flex flex-col gap-2">
					{props.onQuickStateChange && (
						<QuickActionsBatchOps
							pediatricMode={props.pediatricMode}
							onSanitizeAll={handlers.handleSanitizeAll}
							onFrontalHygiene={handlers.handleFrontalHygiene}
							onWisdomMissing={handlers.handleWisdomMissing}
							onInvert={handlers.handleInvert}
							onClear={handlers.handleClear}
						/>
					)}
					<QuickActionsQuadrants
						isPediatricEffective={props.isPediatricEffective}
						activeStampTool={props.activeStampTool}
						stampHint={stampHint}
						onGroupAction={handlers.handleGroupAction}
						ADULT_Q1={props.ADULT_Q1}
						ADULT_Q2={props.ADULT_Q2}
						ADULT_Q3={props.ADULT_Q3}
						ADULT_Q4={props.ADULT_Q4}
						ADULT_FRONT={props.ADULT_FRONT}
						PEDIATRIC_Q5={props.PEDIATRIC_Q5}
						PEDIATRIC_Q6={props.PEDIATRIC_Q6}
						PEDIATRIC_Q7={props.PEDIATRIC_Q7}
						PEDIATRIC_Q8={props.PEDIATRIC_Q8}
						PEDIATRIC_FRONT={props.PEDIATRIC_FRONT}
					/>
					<QuickActionsJaws onSelectJaw={props.setActiveJawModalTarget} />
				</div>
			</details>
		);
	});
OdontogramToolbarQuickActions.displayName = "OdontogramToolbarQuickActions";
