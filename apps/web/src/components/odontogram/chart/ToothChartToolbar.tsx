import type React from "react";
import { memo, useState, useRef, useEffect } from "react";
import { Zap, Sparkles, ChevronDown, MoreHorizontal } from "lucide-react";
import {
	type OdontogramQuadrantId,
	getAdjacentQuadrant,
	isQuadrantTop,
	getQuadrantTitle,
} from "./toothChartTypes";

export interface ToothChartToolbarProps {
	hideExpressActions?: boolean | undefined;
	hideQuadrantSwitcher?: boolean | undefined;
	currentQuadrant: OdontogramQuadrantId;
	isPediatricEffective: boolean;
	isMixedEffective: boolean;
	pediatricMode?: boolean | undefined;
	handleMarkIntactDentition: () => void;
	handleMarkProHygieneDone: () => void;
	handleApplyFastCariesK021: () => void;
	handleMarkWisdomTeethMissing: () => void;
	handleMarkMolarsMissing: () => void;
	handleMarkFrontIntact: () => void;
	handleSelectQuadrant: (q: OdontogramQuadrantId) => void;
}

export const ToothChartToolbar: React.FC<ToothChartToolbarProps> = memo(({
	hideExpressActions,
	hideQuadrantSwitcher,
	currentQuadrant,
	isPediatricEffective,
	isMixedEffective,
	pediatricMode,
	handleMarkIntactDentition,
	handleMarkProHygieneDone,
	handleApplyFastCariesK021,
	handleMarkWisdomTeethMissing,
	handleMarkMolarsMissing,
	handleMarkFrontIntact,
	handleSelectQuadrant,
}) => {
	const [isPresetsOpen, setIsPresetsOpen] = useState(false);
	const presetsRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!isPresetsOpen) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (presetsRef.current && !presetsRef.current.contains(e.target as Node)) {
				setIsPresetsOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isPresetsOpen]);

	return (
		<div
			className="odontogram-unified-toolbar mb-1.5 select-none flex items-center justify-between gap-1.5 flex-nowrap overflow-x-auto no-scrollbar min-h-[32px] sm:min-h-[36px] sm:h-9 py-0.5"
			data-testid="tooth-chart-express-actions"
		>
			{/* Quadrants on the left */}
			{!hideQuadrantSwitcher && (
				<div className="odontogram-quadrant-bar mb-1 select-none min-h-[32px] h-8 sm:h-9 flex items-center gap-1 sm:gap-1.5 flex-nowrap shrink-0" data-testid="odontogram-quadrant-bar">
					<button
						type="button"
						onClick={() => handleSelectQuadrant("all")}
						className={`min-h-[30px] sm:min-h-[32px] h-7.5 sm:h-8 px-2 sm:px-2.5 rounded-lg text-xs font-black border transition-all cursor-pointer select-none shrink-0 flex items-center justify-center whitespace-nowrap ${
							currentQuadrant === "all"
								? "bg-[var(--teal)] text-[var(--on-teal,#ffffff)] font-black border-[var(--teal-dark,var(--teal))] shadow-xs"
								: "bg-[var(--odontogram-surface)] text-[var(--odontogram-ink-muted)] hover:text-[var(--odontogram-ink)] border-[var(--odontogram-border)] hover:bg-[var(--odontogram-surface-hover)]"
						}`}
						title="Показать полную зубную формулу"
						data-testid="quadrant-btn-all"
					>
						<span className="sm:hidden">Все ({isMixedEffective ? "24" : isPediatricEffective ? "20" : "32"})</span>
						<span className="hidden sm:inline">Все зубы ({isMixedEffective ? "24" : isPediatricEffective ? "20" : "32"})</span>
					</button>

					<button
						type="button"
						onClick={() => handleSelectQuadrant(isPediatricEffective ? "Q5" : "Q1")}
						className={`quadrant-btn min-h-[30px] sm:min-h-[32px] h-7.5 sm:h-8 px-2 rounded-lg text-xs font-bold flex items-center gap-1 border transition-all cursor-pointer select-none shrink-0 whitespace-nowrap ${
							currentQuadrant === (isPediatricEffective ? "Q5" : "Q1")
								? "bg-indigo-600 text-white font-black border-indigo-700 shadow-xs ring-1 ring-indigo-400/40"
								: "bg-[var(--odontogram-surface)] text-[var(--odontogram-ink)] border-[var(--odontogram-border)] hover:border-indigo-400 hover:bg-[var(--odontogram-surface-hover)]"
						}`}
						title={isPediatricEffective ? "Q5 55–51 (Верхняя челюсть, Правый)" : "Q1 18–11 (Верхняя челюсть, Правый)"}
						data-testid={isPediatricEffective ? "quadrant-btn-Q5" : "quadrant-btn-Q1"}
					>
						<span className="font-extrabold">{isPediatricEffective ? "Q5" : "Q1"}</span>
						<span className="text-[10px] px-1 py-0.2 rounded bg-black/20 font-mono font-black shrink-0">ВЧ·П</span>
					</button>

					<button
						type="button"
						onClick={() => handleSelectQuadrant(isPediatricEffective ? "Q6" : "Q2")}
						className={`quadrant-btn min-h-[30px] sm:min-h-[32px] h-7.5 sm:h-8 px-2 rounded-lg text-xs font-bold flex items-center gap-1 border transition-all cursor-pointer select-none shrink-0 whitespace-nowrap ${
							currentQuadrant === (isPediatricEffective ? "Q6" : "Q2")
								? "bg-indigo-600 text-white font-black border-indigo-700 shadow-xs ring-1 ring-indigo-400/40"
								: "bg-[var(--odontogram-surface)] text-[var(--odontogram-ink)] border-[var(--odontogram-border)] hover:border-indigo-400 hover:bg-[var(--odontogram-surface-hover)]"
						}`}
						title={isPediatricEffective ? "Q6 61–65 (Верхняя челюсть, Левый)" : "Q2 21–28 (Верхняя челюсть, Левый)"}
						data-testid={isPediatricEffective ? "quadrant-btn-Q6" : "quadrant-btn-Q2"}
					>
						<span className="font-extrabold">{isPediatricEffective ? "Q6" : "Q2"}</span>
						<span className="text-[10px] px-1 py-0.2 rounded bg-black/20 font-mono font-black shrink-0">ВЧ·Л</span>
					</button>

					<button
						type="button"
						onClick={() => handleSelectQuadrant(isPediatricEffective ? "Q8" : "Q4")}
						className={`quadrant-btn min-h-[30px] sm:min-h-[32px] h-7.5 sm:h-8 px-2 rounded-lg text-xs font-bold flex items-center gap-1 border transition-all cursor-pointer select-none shrink-0 whitespace-nowrap ${
							currentQuadrant === (isPediatricEffective ? "Q8" : "Q4")
								? "bg-indigo-600 text-white font-black border-indigo-700 shadow-xs ring-1 ring-indigo-400/40"
								: "bg-[var(--odontogram-surface)] text-[var(--odontogram-ink)] border-[var(--odontogram-border)] hover:border-indigo-400 hover:bg-[var(--odontogram-surface-hover)]"
						}`}
						title={isPediatricEffective ? "Q8 85–81 (Нижняя челюсть, Правый)" : "Q4 48–41 (Нижняя челюсть, Правый)"}
						data-testid={isPediatricEffective ? "quadrant-btn-Q8" : "quadrant-btn-Q4"}
					>
						<span className="font-extrabold">{isPediatricEffective ? "Q8" : "Q4"}</span>
						<span className="text-[10px] px-1 py-0.2 rounded bg-black/20 font-mono font-black shrink-0">НЧ·П</span>
					</button>

					<button
						type="button"
						onClick={() => handleSelectQuadrant(isPediatricEffective ? "Q7" : "Q3")}
						className={`quadrant-btn min-h-[30px] sm:min-h-[32px] h-7.5 sm:h-8 px-2 rounded-lg text-xs font-bold flex items-center gap-1 border transition-all cursor-pointer select-none shrink-0 whitespace-nowrap ${
							currentQuadrant === (isPediatricEffective ? "Q7" : "Q3")
								? "bg-indigo-600 text-white font-black border-indigo-700 shadow-xs ring-1 ring-indigo-400/40"
								: "bg-[var(--odontogram-surface)] text-[var(--odontogram-ink)] border-[var(--odontogram-border)] hover:border-indigo-400 hover:bg-[var(--odontogram-surface-hover)]"
						}`}
						title={isPediatricEffective ? "Q7 71–75 (Нижняя челюсть, Левый)" : "Q3 31–38 (Нижняя челюсть, Левый)"}
						data-testid={isPediatricEffective ? "quadrant-btn-Q7" : "quadrant-btn-Q3"}
					>
						<span className="font-extrabold">{isPediatricEffective ? "Q7" : "Q3"}</span>
						<span className="text-[10px] px-1 py-0.2 rounded bg-black/20 font-mono font-black shrink-0">НЧ·Л</span>
					</button>
				</div>
			)}

			{!hideQuadrantSwitcher && !hideExpressActions && (
				<div className="h-4 w-px bg-[var(--odontogram-border,var(--line))] mx-0.5 shrink-0 hidden sm:block" />
			)}

			{/* Core 1-Click Fast Actions */}
			{!hideExpressActions && (
				<div className="flex items-center gap-1.5 flex-nowrap shrink-0 ml-auto sm:ml-0">
					<button
						type="button"
						onClick={handleMarkIntactDentition}
						className="min-h-[30px] sm:min-h-[32px] h-7.5 sm:h-8 px-2.5 py-0.5 rounded-lg text-xs font-black bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-200 border border-emerald-500/30 flex items-center gap-1.5 transition-all cursor-pointer active:scale-98 shadow-xs shrink-0 whitespace-nowrap"
						title="1-клик Санирован / Интактный зубной ряд: вся формула отмечается здоровой без предупреждений и модалок"
						data-testid="mark-intact-dentition-btn"
						data-action="tooth-chart-mark-intact-btn"
					>
						<Zap size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
						<span>Санирован</span>
					</button>

					<button
						type="button"
						onClick={handleMarkProHygieneDone}
						className="min-h-[30px] sm:min-h-[32px] h-7.5 sm:h-8 px-2.5 py-0.5 rounded-lg text-xs font-black bg-teal-500/15 hover:bg-teal-500/25 text-teal-800 dark:text-teal-200 border border-teal-500/30 flex items-center gap-1.5 transition-all cursor-pointer active:scale-98 shadow-xs shrink-0 whitespace-nowrap"
						title="1-клик Профгигиена выполнена: снятие зубных отложений УЗ + Air-Flow + полировка (A16.07.051) + протокол 043/у"
						data-testid="tooth-chart-mark-pro-hygiene-btn"
						data-action="tooth-chart-mark-pro-hygiene-btn"
					>
						<Sparkles size={13} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<span>Профгигиена</span>
					</button>

					<button
						type="button"
						onClick={handleApplyFastCariesK021}
						className="min-h-[30px] sm:min-h-[32px] h-7.5 sm:h-8 px-2.5 py-0.5 rounded-lg text-xs font-black bg-blue-500/15 hover:bg-blue-500/25 text-blue-800 dark:text-blue-200 border border-blue-500/30 flex items-center gap-1.5 transition-all cursor-pointer active:scale-98 shadow-xs shrink-0 whitespace-nowrap"
						title="1-клик Быстрая пломба/кариес K02.1 для выбранного зуба: протокол 043/у + световая пломба (A16.07.002.001)"
						data-testid="tooth-chart-apply-fast-caries-btn"
						data-action="tooth-chart-apply-fast-caries-btn"
					>
						<Zap size={13} className="text-blue-600 dark:text-blue-400 shrink-0" />
						<span>Пломба K02.1</span>
					</button>

					{/* Dropdown for secondary rare presets (Miller/Hick law) */}
					<div className="relative inline-flex items-center shrink-0" ref={presetsRef}>
						<button
							type="button"
							onClick={() => setIsPresetsOpen((prev) => !prev)}
							className="min-h-[30px] sm:min-h-[32px] h-7.5 sm:h-8 px-2 py-0.5 rounded-lg text-xs font-bold bg-[var(--odontogram-surface)] hover:bg-[var(--odontogram-surface-hover)] text-[var(--odontogram-ink)] border border-[var(--odontogram-border)] flex items-center gap-1 cursor-pointer transition-all shrink-0 shadow-xs"
							data-testid="tooth-chart-presets-menu-btn"
							title="Дополнительные пресеты формулы"
						>
							<MoreHorizontal size={13} className="shrink-0 text-[var(--muted)]" />
							<span className="hidden sm:inline">Пресеты...</span>
							<ChevronDown size={11} className={`transition-transform shrink-0 ${isPresetsOpen ? "rotate-180" : ""}`} />
						</button>

						{isPresetsOpen && (
							<div
								className="absolute right-0 top-full mt-1 z-50 flex flex-col gap-0.5 p-1.5 bg-[var(--paper)] border border-[var(--line)] rounded-xl shadow-xl min-w-[210px] animate-in fade-in duration-100 text-xs"
								role="menu"
							>
								{!isPediatricEffective && (
									<button
										type="button"
										onClick={() => {
											handleMarkWisdomTeethMissing();
											setIsPresetsOpen(false);
										}}
										className="w-full text-left px-2.5 py-1.5 rounded-lg font-medium text-[var(--ink)] hover:bg-[var(--teal-soft,var(--paper-soft))] flex items-center gap-2 cursor-pointer transition-colors"
										data-testid="mark-wisdom-missing-btn"
										data-action="tooth-chart-mark-wisdom-missing-btn"
									>
										<Zap size={13} className="text-zinc-500 shrink-0" />
										<span>Без 8-ок (18, 28, 38, 48)</span>
									</button>
								)}

								{!isPediatricEffective && (
									<button
										type="button"
										onClick={() => {
											handleMarkMolarsMissing();
											setIsPresetsOpen(false);
										}}
										className="w-full text-left px-2.5 py-1.5 rounded-lg font-medium text-[var(--ink)] hover:bg-[var(--teal-soft,var(--paper-soft))] flex items-center gap-2 cursor-pointer transition-colors"
										data-testid="mark-molars-missing-btn"
									>
										<Zap size={13} className="text-amber-500 shrink-0" />
										<span>Без моляров (16, 26, 36, 46)</span>
									</button>
								)}

								<button
									type="button"
									onClick={() => {
										handleMarkFrontIntact();
										setIsPresetsOpen(false);
									}}
									className="w-full text-left px-2.5 py-1.5 rounded-lg font-medium text-[var(--ink)] hover:bg-[var(--teal-soft,var(--paper-soft))] flex items-center gap-2 cursor-pointer transition-colors"
									data-testid="mark-front-intact-btn"
								>
									<Zap size={13} className="text-teal-500 shrink-0" />
									<span>Интактный фронт (13–23, 33–43)</span>
								</button>
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
});
ToothChartToolbar.displayName = "ToothChartToolbar";
