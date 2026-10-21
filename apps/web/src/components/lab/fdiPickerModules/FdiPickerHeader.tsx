import React from "react";
import type { JawScope } from "../labMath";

export interface FdiPickerHeaderProps {
	selectedTeeth: number[];
	setSelectedTeeth: (teeth: number[]) => void;
	selectQuadrant: (teeth: number[]) => void;
	handleConnectBridgeSpan: () => void;
	jawScope?: JawScope | null | undefined;
	constructionType?: string | undefined;
}

export function FdiPickerHeader({
	selectedTeeth,
	setSelectedTeeth,
	selectQuadrant,
	handleConnectBridgeSpan,
	jawScope,
	constructionType,
}: FdiPickerHeaderProps): React.JSX.Element {
	const jawLabel = jawScope
		? `Наряд на челюсть: ${jawScope === "upper" ? "Верхняя челюсть (В/Ч)" : jawScope === "lower" ? "Нижняя челюсть (Н/Ч)" : "Обе челюсти (В/Ч + Н/Ч)"}${selectedTeeth.length > 0 ? ` · зубы ${selectedTeeth.join(", ")}` : ""}`
		: selectedTeeth.length > 0
		? `Выбрано: ${selectedTeeth.join(", ")} (${selectedTeeth.length} ед.)`
		: "Выберите челюсть целиком или зубы";

	return (
		<div className="flex items-center justify-between flex-wrap gap-2.5">
			<div className="flex items-center gap-2">
				<span className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100">
					Зубная формула (FDI ISO 3950)
				</span>
				<span className="text-xs px-3 py-1 rounded-full bg-[var(--teal-surface)] text-[var(--teal)] border border-[var(--teal-soft)] font-bold">
					{jawLabel}
				</span>
			</div>
			<div className="flex items-center gap-1.5 sm:gap-2 text-xs flex-wrap">
				<button
					type="button"
					onClick={() => selectQuadrant([18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28])}
					className="lab-quadrant-btn"
					title="Выбрать верхний зубной ряд (18–28)"
				>
					Верхняя
				</button>
				<button
					type="button"
					onClick={() => selectQuadrant([48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38])}
					className="lab-quadrant-btn"
					title="Выбрать нижний зубной ряд (48–38)"
				>
					Нижняя
				</button>
				{selectedTeeth.length >= 2 && (
					<button
						type="button"
						onClick={handleConnectBridgeSpan}
						className={`lab-quadrant-btn transition-colors ${
							constructionType === "bridge"
								? "bg-teal-600 text-white font-extrabold ring-2 ring-teal-400"
								: "text-teal-700 dark:text-teal-300 font-bold border-teal-300 dark:border-teal-700 bg-teal-50 dark:bg-teal-900/40 hover:bg-teal-100 dark:hover:bg-teal-900/60"
						}`}
						title="Заполнить промежуточные единицы мостовидного протеза между выбранными опорами"
						data-testid="bridge-connect-span-btn"
					>
						Соединить мост
					</button>
				)}
				<button
					type="button"
					onClick={() => setSelectedTeeth([])}
					className="lab-quadrant-clear-btn"
					title="Сбросить выбор зубов"
				>
					Сброс
				</button>
			</div>
		</div>
	);
}
