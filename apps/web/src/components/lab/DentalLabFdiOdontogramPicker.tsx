import React from "react";
import type { JawScope } from "./labMath";

export interface DentalLabFdiOdontogramPickerProps {
	selectedTeeth: number[];
	setSelectedTeeth: (teeth: number[]) => void;
	toggleTooth: (tooth: number) => void;
	selectQuadrant: (teeth: number[]) => void;
	jawScope?: JawScope | null;
}

export function DentalLabFdiOdontogramPicker({
	selectedTeeth,
	setSelectedTeeth,
	toggleTooth,
	selectQuadrant,
	jawScope = null,
}: DentalLabFdiOdontogramPickerProps) {
	return (
		<div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-4 sm:p-5 space-y-4">
			<div className="flex items-center justify-between flex-wrap gap-2.5">
				<div className="flex items-center gap-2">
					<span className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100">
						Зубная формула (FDI ISO 3950)
					</span>
					<span className="text-xs px-3 py-1 rounded-full bg-[var(--teal-surface)] text-[var(--teal)] border border-[var(--teal-soft)] font-bold">
						{jawScope
							? `Наряд на челюсть: ${jawScope === "upper" ? "Верхняя челюсть (В/Ч)" : jawScope === "lower" ? "Нижняя челюсть (Н/Ч)" : "Обе челюсти (В/Ч + Н/Ч)"}${selectedTeeth.length > 0 ? ` · зубы ${selectedTeeth.join(", ")}` : ""}`
							: selectedTeeth.length > 0
							? `Выбрано: ${selectedTeeth.join(", ")} (${selectedTeeth.length} ед.)`
							: "Выберите челюсть целиком или зубы"}
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

			{/* Quadrant Visual Grid with >= 34x34px tooth buttons (1-touch interactive FDI formula) */}
			<div className="space-y-4 select-none pt-1">
				{/* Desktop & Tablet View (16-teeth horizontal arch per jaw with distinct 4-quadrant separation) */}
				<div className="hidden md:block space-y-3.5">
					{/* Upper Maxilla: Q1 (18-11) and Q2 (21-28) */}
					<div className="p-3 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 shadow-xs overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
						<div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-2 px-2 min-w-[560px]">
							<span>1-й квадрант (18–11) • Верхний правый</span>
							<span>2-й квадрант (21–28) • Верхний левый</span>
						</div>
						<div className="flex items-center gap-1.5 justify-center min-w-[560px]">
							{/* Q1: 18 to 11 */}
							<div className="flex items-center gap-1.5">
								{[18, 17, 16, 15, 14, 13, 12, 11].map((t) => (
									<button
										key={t}
										type="button"
										onClick={() => toggleTooth(t)}
										className={`lab-tooth-btn shrink-0 ${selectedTeeth.includes(t) ? "is-selected" : ""}`}
										title={`Зуб ${t} (Q1)`}
									>
										{t}
									</button>
								))}
							</div>

							{/* Vertical Midline Divider */}
							<div className="flex flex-col items-center justify-center px-2 shrink-0">
								<div className="w-0.5 h-10 bg-teal-500/60 dark:bg-teal-400/60 rounded-full" />
								<span className="text-[10px] font-mono font-black text-teal-600 dark:text-teal-400 mt-0.5">FDI</span>
							</div>

							{/* Q2: 21 to 28 */}
							<div className="flex items-center gap-1.5">
								{[21, 22, 23, 24, 25, 26, 27, 28].map((t) => (
									<button
										key={t}
										type="button"
										onClick={() => toggleTooth(t)}
										className={`lab-tooth-btn shrink-0 ${selectedTeeth.includes(t) ? "is-selected" : ""}`}
										title={`Зуб ${t} (Q2)`}
									>
										{t}
									</button>
								))}
							</div>
						</div>
					</div>

					{/* Lower Mandible: Q4 (48-41) and Q3 (31-38) */}
					<div className="p-3 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 shadow-xs overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
						<div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-2 px-2 min-w-[560px]">
							<span>4-й квадрант (48–41) • Нижний правый</span>
							<span>3-й квадрант (31–38) • Нижний левый</span>
						</div>
						<div className="flex items-center gap-1.5 justify-center min-w-[560px]">
							{/* Q4: 48 to 41 */}
							<div className="flex items-center gap-1.5">
								{[48, 47, 46, 45, 44, 43, 42, 41].map((t) => (
									<button
										key={t}
										type="button"
										onClick={() => toggleTooth(t)}
										className={`lab-tooth-btn shrink-0 ${selectedTeeth.includes(t) ? "is-selected" : ""}`}
										title={`Зуб ${t} (Q4)`}
									>
										{t}
									</button>
								))}
							</div>

							{/* Vertical Midline Divider */}
							<div className="flex flex-col items-center justify-center px-2 shrink-0">
								<div className="w-0.5 h-10 bg-teal-500/60 dark:bg-teal-400/60 rounded-full" />
								<span className="text-[10px] font-mono font-black text-teal-600 dark:text-teal-400 mt-0.5">FDI</span>
							</div>

							{/* Q3: 31 to 38 */}
							<div className="flex items-center gap-1.5">
								{[31, 32, 33, 34, 35, 36, 37, 38].map((t) => (
									<button
										key={t}
										type="button"
										onClick={() => toggleTooth(t)}
										className={`lab-tooth-btn shrink-0 ${selectedTeeth.includes(t) ? "is-selected" : ""}`}
										title={`Зуб ${t} (Q3)`}
									>
										{t}
									</button>
								))}
							</div>
						</div>
					</div>
				</div>

				{/* Mobile & Small Screen View (Clean 4 Quadrants: Q1, Q2, Q4, Q3 with min 32-34px tactile buttons) */}
				<div className="block md:hidden space-y-3">
					{/* Upper Maxilla: Q1 (18-11) */}
					<div className="p-2.5 sm:p-3 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
						<div className="text-xs font-bold text-slate-600 dark:text-slate-300">
							1-й квадрант Q1 (18–11) • Верхний правый
						</div>
						<div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-1 touch-pan-x">
							<div className="grid grid-cols-8 gap-1 sm:gap-1.5 min-w-[260px] pr-2 sm:pr-0">
								{[18, 17, 16, 15, 14, 13, 12, 11].map((t) => (
									<button
										key={t}
										type="button"
										onClick={() => toggleTooth(t)}
										className={`lab-tooth-btn !min-w-[28px] xs:!min-w-[32px] sm:!min-w-[34px] !min-h-[38px] !w-full !px-0 text-xs font-bold ${selectedTeeth.includes(t) ? "is-selected" : ""}`}
										title={`Зуб ${t}`}
									>
										{t}
									</button>
								))}
							</div>
						</div>
					</div>

					{/* Upper Maxilla: Q2 (21-28) */}
					<div className="p-2.5 sm:p-3 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
						<div className="text-xs font-bold text-slate-600 dark:text-slate-300">
							2-й квадрант Q2 (21–28) • Верхний левый
						</div>
						<div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-1 touch-pan-x">
							<div className="grid grid-cols-8 gap-1 sm:gap-1.5 min-w-[260px] pr-2 sm:pr-0">
								{[21, 22, 23, 24, 25, 26, 27, 28].map((t) => (
									<button
										key={t}
										type="button"
										onClick={() => toggleTooth(t)}
										className={`lab-tooth-btn !min-w-[28px] xs:!min-w-[32px] sm:!min-w-[34px] !min-h-[38px] !w-full !px-0 text-xs font-bold ${selectedTeeth.includes(t) ? "is-selected" : ""}`}
										title={`Зуб ${t}`}
									>
										{t}
									</button>
								))}
							</div>
						</div>
					</div>

					{/* Lower Mandible: Q4 (48-41) */}
					<div className="p-2.5 sm:p-3 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
						<div className="text-xs font-bold text-slate-600 dark:text-slate-300">
							4-й квадрант Q4 (48–41) • Нижний правый
						</div>
						<div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-1 touch-pan-x">
							<div className="grid grid-cols-8 gap-1 sm:gap-1.5 min-w-[260px] pr-2 sm:pr-0">
								{[48, 47, 46, 45, 44, 43, 42, 41].map((t) => (
									<button
										key={t}
										type="button"
										onClick={() => toggleTooth(t)}
										className={`lab-tooth-btn !min-w-[28px] xs:!min-w-[32px] sm:!min-w-[34px] !min-h-[38px] !w-full !px-0 text-xs font-bold ${selectedTeeth.includes(t) ? "is-selected" : ""}`}
										title={`Зуб ${t}`}
									>
										{t}
									</button>
								))}
							</div>
						</div>
					</div>

					{/* Lower Mandible: Q3 (31-38) */}
					<div className="p-2.5 sm:p-3 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
						<div className="text-xs font-bold text-slate-600 dark:text-slate-300">
							3-й квадрант Q3 (31–38) • Нижний левый
						</div>
						<div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-1 touch-pan-x">
							<div className="grid grid-cols-8 gap-1 sm:gap-1.5 min-w-[260px] pr-2 sm:pr-0">
								{[31, 32, 33, 34, 35, 36, 37, 38].map((t) => (
									<button
										key={t}
										type="button"
										onClick={() => toggleTooth(t)}
										className={`lab-tooth-btn !min-w-[28px] xs:!min-w-[32px] sm:!min-w-[34px] !min-h-[38px] !w-full !px-0 text-xs font-bold ${selectedTeeth.includes(t) ? "is-selected" : ""}`}
										title={`Зуб ${t}`}
									>
										{t}
									</button>
								))}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
