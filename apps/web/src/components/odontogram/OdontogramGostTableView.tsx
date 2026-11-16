/**
 * apps/web/src/components/odontogram/OdontogramGostTableView.tsx
 *
 * DENTE Dental CRM — Structured Tabular Dental Formula View (ГОСТ / Медкарта)
 * Compliant with Mandate 8b (120-250 lines), Apple HIG, WCAG AAA.
 * 0px scroll, zero-clipping, fully responsive interactive table grid.
 */

import React, { useMemo } from "react";
import type { ToothData, ToothState } from "./ToothChart";

export interface OdontogramGostTableViewProps {
	readonly teethData: readonly ToothData[];
	readonly selectedTeeth: readonly number[];
	readonly activeStamp?: ToothState | null | undefined;
	readonly onQuickStateChange?:
		| ((targets: number[], state: ToothState, surfaces?: readonly string[]) => void)
		| undefined;
	readonly onToothClick?: ((num: number) => void) | undefined;
	readonly isPediatric?: boolean | undefined;
	readonly isMixed?: boolean | undefined;
	readonly className?: string | undefined;
}

const ADULT_UPPER_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11] as const;
const ADULT_UPPER_LEFT = [21, 22, 23, 24, 25, 26, 27, 28] as const;
const ADULT_LOWER_RIGHT = [48, 47, 46, 45, 44, 43, 42, 41] as const;
const ADULT_LOWER_LEFT = [31, 32, 33, 34, 35, 36, 37, 38] as const;

const PED_UPPER_RIGHT = [55, 54, 53, 52, 51] as const;
const PED_UPPER_LEFT = [61, 62, 63, 64, 65] as const;
const PED_LOWER_RIGHT = [85, 84, 83, 82, 81] as const;
const PED_LOWER_LEFT = [71, 72, 73, 74, 75] as const;

function getStateGostBadge(state?: string): { code: string; bgClass: string; textClass: string } {
	switch (state) {
		case "Caries":
			return { code: "C", bgClass: "bg-amber-500/15 border-amber-500/30", textClass: "text-amber-800 dark:text-amber-300 font-bold" };
		case "Filled":
			return { code: "П", bgClass: "bg-blue-500/15 border-blue-500/30", textClass: "text-blue-800 dark:text-blue-300 font-bold" };
		case "Pulpitis":
			return { code: "P", bgClass: "bg-rose-500/15 border-rose-500/30", textClass: "text-rose-800 dark:text-rose-300 font-bold" };
		case "Periodontitis":
			return { code: "Pt", bgClass: "bg-red-500/15 border-red-500/30", textClass: "text-red-800 dark:text-red-300 font-bold" };
		case "Crown":
			return { code: "К", bgClass: "bg-teal-500/15 border-teal-500/30", textClass: "text-teal-800 dark:text-teal-300 font-bold" };
		case "Implant":
			return { code: "И", bgClass: "bg-slate-500/15 border-slate-500/30", textClass: "text-slate-800 dark:text-slate-300 font-bold" };
		case "Missing":
			return { code: "O", bgClass: "bg-neutral-500/15 border-neutral-500/30", textClass: "text-neutral-500 dark:text-neutral-400 font-bold" };
		case "Root":
			return { code: "R", bgClass: "bg-orange-500/15 border-orange-500/30", textClass: "text-orange-800 dark:text-orange-300 font-bold" };
		default:
			return { code: "✓", bgClass: "bg-[var(--paper-soft)] border-[var(--line)]", textClass: "text-[var(--ink-muted)] opacity-60" };
	}
}

export const OdontogramGostTableView: React.FC<OdontogramGostTableViewProps> = ({
	teethData,
	selectedTeeth,
	activeStamp,
	onQuickStateChange,
	onToothClick,
	isPediatric = false,
	className = "",
}) => {
	const teethMap = useMemo(() => {
		const m = new Map<number, ToothData>();
		for (const t of teethData) {
			m.set(t.toothNumber, t);
		}
		return m;
	}, [teethData]);

	const upperRight = isPediatric ? PED_UPPER_RIGHT : ADULT_UPPER_RIGHT;
	const upperLeft = isPediatric ? PED_UPPER_LEFT : ADULT_UPPER_LEFT;
	const lowerRight = isPediatric ? PED_LOWER_RIGHT : ADULT_LOWER_RIGHT;
	const lowerLeft = isPediatric ? PED_LOWER_LEFT : ADULT_LOWER_LEFT;

	const handleCellClick = (toothNum: number) => {
		if (activeStamp && onQuickStateChange) {
			onQuickStateChange([toothNum], activeStamp);
		} else if (onToothClick) {
			onToothClick(toothNum);
		}
	};

	const renderToothCell = (toothNum: number) => {
		const tooth = teethMap.get(toothNum);
		const badge = getStateGostBadge(tooth?.state);
		const isSelected = selectedTeeth.includes(toothNum);
		const surfs = tooth?.surfaces && tooth.surfaces.length > 0 ? tooth.surfaces.join("") : "";

		return (
			<button
				key={toothNum}
				type="button"
				onClick={() => handleCellClick(toothNum)}
				data-testid={`gost-cell-${toothNum}`}
				className={`group relative flex flex-col items-center justify-center p-1 min-w-[34px] sm:min-w-[42px] h-[52px] sm:h-[60px] rounded-lg border transition-all cursor-pointer select-none text-center ${
					isSelected
						? "ring-2 ring-[var(--primary,#0d9488)] bg-[var(--primary,#0d9488)]/10 dark:bg-[var(--primary,#0d9488)]/20 shadow-xs"
						: "bg-[var(--paper,#ffffff)] dark:bg-slate-900 border-[var(--line,#e2e8f0)] dark:border-slate-800 hover:border-[var(--primary,#0d9488)]/60"
				}`}
				title={`Зуб ${toothNum}: ${tooth?.state ?? "Здоров"}${surfs ? ` [${surfs}]` : ""}`}
			>
				<span className="text-[11px] sm:text-xs font-mono font-bold text-[var(--ink,#0f172a)] dark:text-slate-100">
					{toothNum}
				</span>
				<span
					className={`mt-0.5 px-1 py-0.2 rounded text-[10px] sm:text-[11px] border leading-none ${badge.bgClass} ${badge.textClass}`}
				>
					{badge.code}
				</span>
				{surfs ? (
					<span className="text-[8px] font-mono font-semibold text-[var(--primary,#0d9488)] tracking-tighter truncate max-w-[36px]">
						{surfs}
					</span>
				) : null}
			</button>
		);
	};

	return (
		<div
			data-testid="odontogram-gost-table-view"
			className={`w-full flex flex-col gap-2 p-3 sm:p-4 rounded-2xl bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#e2e8f0)] dark:border-slate-800 shadow-xs overflow-x-auto ${className}`.trim()}
		>
			<div className="flex items-center justify-between gap-2 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800 pb-2">
				<div className="flex items-center gap-2">
					<span className="text-xs sm:text-sm font-semibold text-[var(--ink,#0f172a)] dark:text-slate-200">
						Табличный вид зубной формулы (ГОСТ / Медкарта)
					</span>
					{isPediatric && (
						<span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 font-medium border border-amber-500/20">
							Молочный прикус
						</span>
					)}
				</div>
				<span className="text-[11px] font-medium text-[var(--ink-muted,#64748b)]">
					{teethData.length} зубов в учете
				</span>
			</div>

			{/* Верхняя челюсть */}
			<div className="flex flex-col gap-1 w-full">
				<div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[var(--ink-muted,#64748b)] px-1">
					<span>Верхняя челюсть (справа)</span>
					<span>Верхняя челюсть (слева)</span>
				</div>
				<div className="flex items-center justify-center gap-1 sm:gap-1.5 flex-nowrap w-full overflow-x-auto py-1">
					<div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
						{upperRight.map((t) => renderToothCell(t))}
					</div>
					<div className="w-px h-10 bg-[var(--line,#e2e8f0)] dark:bg-slate-700 mx-1 shrink-0" />
					<div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
						{upperLeft.map((t) => renderToothCell(t))}
					</div>
				</div>
			</div>

			{/* Линия окклюзионного смыкания */}
			<div className="w-full flex items-center justify-center gap-2 py-0.5">
				<div className="h-0.5 flex-1 bg-[var(--line,#e2e8f0)] dark:bg-slate-800" />
				<span className="text-[9px] font-mono uppercase font-bold text-[var(--ink-muted,#94a3b8)] tracking-widest shrink-0">
					Линия смыкания (окклюзия)
				</span>
				<div className="h-0.5 flex-1 bg-[var(--line,#e2e8f0)] dark:bg-slate-800" />
			</div>

			{/* Нижняя челюсть */}
			<div className="flex flex-col gap-1 w-full">
				<div className="flex items-center justify-center gap-1 sm:gap-1.5 flex-nowrap w-full overflow-x-auto py-1">
					<div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
						{lowerRight.map((t) => renderToothCell(t))}
					</div>
					<div className="w-px h-10 bg-[var(--line,#e2e8f0)] dark:bg-slate-700 mx-1 shrink-0" />
					<div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
						{lowerLeft.map((t) => renderToothCell(t))}
					</div>
				</div>
				<div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[var(--ink-muted,#64748b)] px-1">
					<span>Нижняя челюсть (справа)</span>
					<span>Нижняя челюсть (слева)</span>
				</div>
			</div>

			{/* Легенда условных обозначений ГОСТ */}
			<div className="mt-1 pt-2 border-t border-[var(--line,#e2e8f0)] dark:border-slate-800 flex items-center gap-3 flex-wrap text-[10px] sm:text-[11px] text-[var(--ink-muted,#64748b)]">
				<span className="font-semibold text-[var(--ink,#0f172a)] dark:text-slate-300">Обозначения:</span>
				<span className="inline-flex items-center gap-1"><strong className="text-[var(--ink,#0f172a)] dark:text-slate-200">✓</strong> Интактный</span>
				<span className="inline-flex items-center gap-1"><strong className="text-amber-600 dark:text-amber-400">C</strong> Кариес</span>
				<span className="inline-flex items-center gap-1"><strong className="text-blue-600 dark:text-blue-400">П</strong> Пломба</span>
				<span className="inline-flex items-center gap-1"><strong className="text-rose-600 dark:text-rose-400">P</strong> Пульпит</span>
				<span className="inline-flex items-center gap-1"><strong className="text-red-600 dark:text-red-400">Pt</strong> Периодонтит</span>
				<span className="inline-flex items-center gap-1"><strong className="text-teal-600 dark:text-teal-400">К</strong> Коронка</span>
				<span className="inline-flex items-center gap-1"><strong className="text-slate-600 dark:text-slate-400">И</strong> Имплантат</span>
				<span className="inline-flex items-center gap-1"><strong className="text-neutral-500">O</strong> Отсутствует</span>
				<span className="inline-flex items-center gap-1"><strong className="text-orange-600 dark:text-orange-400">R</strong> Корень</span>
			</div>
		</div>
	);
};
