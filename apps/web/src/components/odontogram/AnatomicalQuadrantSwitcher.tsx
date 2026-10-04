/**
 * DENTE Dental CRM — Anatomical Quadrant Switcher & Navigation
 *
 * Provides responsive quadrant selection bar (All, Q1..Q8) and
 * adjacent quadrant prev/next pagination controls for mobile and desktop viewports.
 */

import React from "react";
import {
	type OdontogramQuadrantId,
	getAdjacentQuadrant,
	getQuadrantTitle,
	isQuadrantTop,
} from "./ToothChart";
import { MobileQuadrantTabs } from "./MobileQuadrantTabs";

export interface AnatomicalQuadrantSwitcherProps {
	currentQuadrant: OdontogramQuadrantId;
	onSelectQuadrant: (q: OdontogramQuadrantId) => void;
	isPediatricEffective: boolean;
	isMixedEffective: boolean;
	showWisdomTeeth?: boolean;
}

export const AnatomicalQuadrantSwitcher: React.FC<AnatomicalQuadrantSwitcherProps> = ({
	currentQuadrant,
	onSelectQuadrant,
	isPediatricEffective,
	isMixedEffective,
	showWisdomTeeth = true,
}) => {
	const allTeethCount = isMixedEffective
		? "24"
		: isPediatricEffective
			? "20"
			: showWisdomTeeth
				? "32"
				: "28";

	return (
		<div
			className="odontogram-quadrant-bar mb-2 select-none w-full"
			data-testid="odontogram-quadrant-bar"
		>
			{/* Mobile 2x2 Quadrant Tabs per Apple HIG (< 768px) */}
			<div className="block sm:hidden w-full mb-1">
				<MobileQuadrantTabs
					currentQuadrant={currentQuadrant}
					onSelectQuadrant={onSelectQuadrant}
					isPediatricEffective={isPediatricEffective}
					isMixedEffective={isMixedEffective}
					showAllOption={true}
				/>
			</div>

			<div className="hidden sm:flex items-center gap-1.5 sm:gap-2 flex-nowrap overflow-x-auto no-scrollbar py-0.5 w-full">
				<button
					type="button"
					onClick={() => onSelectQuadrant("all")}
					className={`min-h-[32px] h-8 px-2.5 sm:px-3.5 py-1 rounded-xl text-xs font-black border transition-all cursor-pointer select-none shrink-0 flex items-center justify-center whitespace-nowrap ${
						currentQuadrant === "all"
							? "bg-[var(--teal)] text-[var(--on-teal,#ffffff)] font-black border-[var(--teal-dark,var(--teal))] shadow-xs"
							: "bg-[var(--odontogram-surface)] text-[var(--odontogram-ink-muted)] hover:text-[var(--odontogram-ink)] border-[var(--odontogram-border)] hover:bg-[var(--odontogram-surface-hover)]"
					}`}
					title="Показать полную зубную формулу (все зубы)"
					data-testid="quadrant-btn-all"
				>
					Все ({allTeethCount})
				</button>

				<div className="h-4 w-px bg-[var(--odontogram-border)] mx-0.5 shrink-0" />

				{/* Quadrant buttons in a sleek horizontal scrollable strip */}
				<div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap shrink-0">
					{/* Upper Right Quadrant: Q1 18–11 (or Q5 55–51) */}
					<button
						type="button"
						onClick={() => onSelectQuadrant(isPediatricEffective ? "Q5" : "Q1")}
						className={`quadrant-btn min-h-[32px] h-8 px-2.5 sm:px-3 py-1 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-between gap-1.5 sm:gap-2 border transition-all cursor-pointer select-none shrink-0 whitespace-nowrap ${
							currentQuadrant === (isPediatricEffective ? "Q5" : "Q1")
								? "bg-indigo-600 text-white font-black border-indigo-700 shadow-xs ring-2 ring-indigo-400/40"
								: "bg-[var(--odontogram-surface)] text-[var(--odontogram-ink)] border-[var(--odontogram-border)] hover:border-indigo-400 hover:bg-[var(--odontogram-surface-hover)]"
						}`}
						title={
							isPediatricEffective
								? "Q5 55–51 (Верхняя челюсть, Правый)"
								: "Q1 18–11 (Верхняя челюсть, Правый)"
						}
						data-testid={isPediatricEffective ? "quadrant-btn-Q5" : "quadrant-btn-Q1"}
					>
						<span className="font-extrabold whitespace-nowrap">
							{isPediatricEffective ? "Q5 55–51" : "Q1 18–11"}
						</span>
						<span className="text-[10px] px-1 py-0.5 rounded bg-black/20 font-mono font-black uppercase shrink-0">
							ВЧ·П
						</span>
					</button>

					{/* Upper Left Quadrant: Q2 21–28 (or Q6 61–65) */}
					<button
						type="button"
						onClick={() => onSelectQuadrant(isPediatricEffective ? "Q6" : "Q2")}
						className={`quadrant-btn min-h-[32px] h-8 px-2.5 sm:px-3 py-1 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-between gap-1.5 sm:gap-2 border transition-all cursor-pointer select-none shrink-0 whitespace-nowrap ${
							currentQuadrant === (isPediatricEffective ? "Q6" : "Q2")
								? "bg-indigo-600 text-white font-black border-indigo-700 shadow-xs ring-2 ring-indigo-400/40"
								: "bg-[var(--odontogram-surface)] text-[var(--odontogram-ink)] border-[var(--odontogram-border)] hover:border-indigo-400 hover:bg-[var(--odontogram-surface-hover)]"
						}`}
						title={
							isPediatricEffective
								? "Q6 61–65 (Верхняя челюсть, Левый)"
								: "Q2 21–28 (Верхняя челюсть, Левый)"
						}
						data-testid={isPediatricEffective ? "quadrant-btn-Q6" : "quadrant-btn-Q2"}
					>
						<span className="font-extrabold whitespace-nowrap">
							{isPediatricEffective ? "Q6 61–65" : "Q2 21–28"}
						</span>
						<span className="text-[10px] px-1 py-0.5 rounded bg-black/20 font-mono font-black uppercase shrink-0">
							ВЧ·Л
						</span>
					</button>

					{/* Lower Right Quadrant: Q4 48–41 (or Q8 85–81) */}
					<button
						type="button"
						onClick={() => onSelectQuadrant(isPediatricEffective ? "Q8" : "Q4")}
						className={`quadrant-btn min-h-[32px] h-8 px-2.5 sm:px-3 py-1 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-between gap-1.5 sm:gap-2 border transition-all cursor-pointer select-none shrink-0 whitespace-nowrap ${
							currentQuadrant === (isPediatricEffective ? "Q8" : "Q4")
								? "bg-indigo-600 text-white font-black border-indigo-700 shadow-xs ring-2 ring-indigo-400/40"
								: "bg-[var(--odontogram-surface)] text-[var(--odontogram-ink)] border-[var(--odontogram-border)] hover:border-indigo-400 hover:bg-[var(--odontogram-surface-hover)]"
						}`}
						title={
							isPediatricEffective
								? "Q8 85–81 (Нижняя челюсть, Правый)"
								: "Q4 48–41 (Нижняя челюсть, Правый)"
						}
						data-testid={isPediatricEffective ? "quadrant-btn-Q8" : "quadrant-btn-Q4"}
					>
						<span className="font-extrabold whitespace-nowrap">
							{isPediatricEffective ? "Q8 85–81" : "Q4 48–41"}
						</span>
						<span className="text-[10px] px-1 py-0.5 rounded bg-black/20 font-mono font-black uppercase shrink-0">
							НЧ·П
						</span>
					</button>

					{/* Lower Left Quadrant: Q3 31–38 (or Q7 71–75) */}
					<button
						type="button"
						onClick={() => onSelectQuadrant(isPediatricEffective ? "Q7" : "Q3")}
						className={`quadrant-btn min-h-[32px] h-8 px-2.5 sm:px-3 py-1 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-between gap-1.5 sm:gap-2 border transition-all cursor-pointer select-none shrink-0 whitespace-nowrap ${
							currentQuadrant === (isPediatricEffective ? "Q7" : "Q3")
								? "bg-indigo-600 text-white font-black border-indigo-700 shadow-xs ring-2 ring-indigo-400/40"
								: "bg-[var(--odontogram-surface)] text-[var(--odontogram-ink)] border-[var(--odontogram-border)] hover:border-indigo-400 hover:bg-[var(--odontogram-surface-hover)]"
						}`}
						title={
							isPediatricEffective
								? "Q7 71–75 (Нижняя челюсть, Левый)"
								: "Q3 31–38 (Нижняя челюсть, Левый)"
						}
						data-testid={isPediatricEffective ? "quadrant-btn-Q7" : "quadrant-btn-Q3"}
					>
						<span className="font-extrabold whitespace-nowrap">
							{isPediatricEffective ? "Q7 71–75" : "Q3 31–38"}
						</span>
						<span className="text-[10px] px-1 py-0.5 rounded bg-black/20 font-mono font-black uppercase shrink-0">
							НЧ·Л
						</span>
					</button>
				</div>
			</div>
		</div>
	);
};

export interface QuadrantFocusedHeaderProps {
	currentQuadrant: OdontogramQuadrantId;
	onSelectQuadrant: (q: OdontogramQuadrantId) => void;
	isPediatricEffective: boolean;
	isMixedEffective?: boolean;
}

export const QuadrantFocusedHeader: React.FC<QuadrantFocusedHeaderProps> = ({
	currentQuadrant,
	onSelectQuadrant,
	isPediatricEffective,
	isMixedEffective = false,
}) => {
	return (
		<div className="w-full flex flex-col gap-2 mb-2 items-center">
			{/* Mobile 2x2 Anatomical Quadrant Switcher per Apple HIG (< 768px) */}
			<div className="w-full sm:hidden">
				<MobileQuadrantTabs
					currentQuadrant={currentQuadrant}
					onSelectQuadrant={onSelectQuadrant}
					isPediatricEffective={isPediatricEffective}
					isMixedEffective={isMixedEffective}
					showAllOption={true}
				/>
			</div>

			{/* Desktop pagination bar (hidden on mobile) */}
			<div className="hidden sm:flex items-center justify-between w-full max-w-lg px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-[var(--odontogram-surface)] border border-[var(--odontogram-border-subtle)] gap-1.5">
				<button
					type="button"
					onClick={() =>
						onSelectQuadrant(
							getAdjacentQuadrant(currentQuadrant, "prev", isPediatricEffective),
						)
					}
					className="min-h-[32px] min-w-[44px] px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--odontogram-paper)] hover:bg-[var(--odontogram-surface-hover)] text-[var(--odontogram-ink)] border border-[var(--odontogram-border-subtle)] flex items-center justify-center gap-1 cursor-pointer transition-colors shrink-0 shadow-2xs"
					title="Предыдущий квадрант"
					data-testid="quadrant-prev-btn"
				>
					<span>←</span>
					<span> Пред.</span>
				</button>
				<div className="flex flex-col items-center justify-center min-w-0 flex-1 px-1 text-center">
					<span className="text-xs sm:text-sm font-black text-[var(--odontogram-ink)] leading-tight text-center">
						{getQuadrantTitle(currentQuadrant, isPediatricEffective)}
					</span>
				</div>
				<button
					type="button"
					onClick={() =>
						onSelectQuadrant(
							getAdjacentQuadrant(currentQuadrant, "next", isPediatricEffective),
						)
					}
					className="min-h-[32px] min-w-[44px] px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--odontogram-paper)] hover:bg-[var(--odontogram-surface-hover)] text-[var(--odontogram-ink)] border border-[var(--odontogram-border-subtle)] flex items-center justify-center gap-1 cursor-pointer transition-colors shrink-0 shadow-2xs"
					title="Следующий квадрант"
					data-testid="quadrant-next-btn"
				>
					<span>След. </span>
					<span>→</span>
				</button>
			</div>
		</div>
	);
};
