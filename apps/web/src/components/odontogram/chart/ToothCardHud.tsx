import type React from "react";
import { memo, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import type { ToothState, RootResorptionStage } from "./toothChartTypes";

export interface ToothCardHudProps {
	number: number;
	isTop: boolean;
	isPrimary: boolean;
	surfaces?: readonly string[] | undefined;
	selectedTeeth?: number[] | undefined;
	rootResorptionStage?: RootResorptionStage | number | undefined;
	onQuickStateChange: (targets: number[], state: ToothState, surfaces?: readonly string[] | undefined) => void;
	onResorptionChange?: ((targets: number[], stage: RootResorptionStage) => void) | undefined;
}

export const ToothCardHud: React.FC<ToothCardHudProps> = memo(({
	number,
	isTop,
	isPrimary,
	surfaces,
	selectedTeeth,
	rootResorptionStage,
	onQuickStateChange,
	onResorptionChange,
}) => {
	const [isMenuOpen, setIsMenuOpen] = useState(false);

	const isLeftMolar = (number >= 16 && number <= 18) || (number >= 46 && number <= 48) || (number >= 54 && number <= 55) || (number >= 84 && number <= 85);
	const isRightMolar = (number >= 26 && number <= 28) || (number >= 36 && number <= 38) || (number >= 64 && number <= 65) || (number >= 74 && number <= 75);
	const hudAlignClass = isLeftMolar
		? "left-0"
		: isRightMolar
		? "right-0"
		: "left-1/2 -translate-x-1/2";

	const getTargets = () =>
		selectedTeeth?.includes(number) && selectedTeeth.length > 0 ? selectedTeeth : [number];

	return (
		<div
			className={`tooth-hover-quick-hud absolute ${hudAlignClass} hidden group-hover:flex group-hover/badge:flex transition-all duration-200 z-40 items-center gap-1.5 px-2 py-1.5 rounded-2xl bg-[var(--odontogram-paper)]/95 border border-[var(--odontogram-border-strong)] shadow-2xl backdrop-blur-xl pointer-events-auto whitespace-nowrap ${
				isTop ? "bottom-full mb-2" : "top-full mt-2"
			}`}
			onClick={(e) => e.stopPropagation()}
		>
			{isPrimary ? (
				<>
					{/* Primary 1-2 Focus Actions per Miller/Hick Law */}
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onQuickStateChange(getTargets(), "Caries", surfaces);
						}}
						className="px-2.5 py-1.5 min-h-[36px] min-w-[36px] rounded-lg bg-amber-500/15 hover:bg-amber-500 text-amber-800 dark:text-amber-300 hover:text-white border border-amber-500/40 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all hover:scale-105 active:scale-95 touch-manipulation"
						title="Кариес молочного зуба"
						data-testid={`quick-caries-${number}`}
					>
						<span className="w-2 h-2 rounded-full bg-amber-500 inline-block shadow-xs shrink-0" />
						<span>Кариес</span>
					</button>

					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onQuickStateChange(getTargets(), "Filled", surfaces);
						}}
						className="px-2.5 py-1.5 min-h-[36px] min-w-[36px] rounded-lg bg-blue-500/15 hover:bg-blue-500 text-blue-800 dark:text-blue-300 hover:text-white border border-blue-500/40 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all hover:scale-105 active:scale-95 touch-manipulation"
						title="Пломба стеклоиономерным цементом (СИЦ / Композит)"
						data-testid={`quick-filled-${number}`}
					>
						<span className="w-2 h-2 rounded-full bg-blue-500 inline-block shadow-xs shrink-0" />
						<span>Пломба / СИЦ</span>
					</button>

					{/* Quick Secondary Actions */}
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onQuickStateChange(getTargets(), "Pulpitis", surfaces);
						}}
						className="px-2.5 py-1.5 min-h-[36px] min-w-[36px] rounded-lg bg-rose-500/15 hover:bg-rose-500 text-rose-800 dark:text-rose-300 hover:text-white border border-rose-500/40 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all hover:scale-105 active:scale-95 touch-manipulation"
						title="Витальная пульпотомия молочного зуба (Biodentine/MTA)"
						data-testid={`quick-pulpotomy-${number}`}
					>
						<span className="w-2 h-2 rounded-full bg-rose-500 inline-block shadow-xs shrink-0" />
						<span>Пульпотомия</span>
					</button>

					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onQuickStateChange(getTargets(), "Crown", surfaces);
						}}
						className="px-2.5 py-1.5 min-h-[36px] min-w-[36px] rounded-lg bg-amber-500/15 hover:bg-amber-500 text-amber-800 dark:text-amber-300 hover:text-white border border-amber-500/40 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all hover:scale-105 active:scale-95 touch-manipulation"
						title="Эстетическая циркониевая коронка NuSmile / 3M"
						data-testid={`quick-nusmile-${number}`}
					>
						<span className="w-2 h-2 rounded-full bg-amber-500 inline-block shadow-xs shrink-0" />
						<span>Коронка NuSmile</span>
					</button>

					{onResorptionChange && (
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								const currentStage = (rootResorptionStage ?? 0) as RootResorptionStage;
								const stages: RootResorptionStage[] = [0, 25, 50, 75, 100];
								const nextIdx = (stages.indexOf(currentStage) + 1) % stages.length;
								const nextStage = stages[nextIdx] ?? 0;
								onResorptionChange(getTargets(), nextStage);
							}}
							className="px-2.5 py-1.5 min-h-[36px] min-w-[36px] rounded-lg bg-orange-500/15 hover:bg-orange-500 text-orange-800 dark:text-orange-300 hover:text-white border border-orange-500/40 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all hover:scale-105 active:scale-95 touch-manipulation"
							title={`Сменить стадию физиологической резорбции корня (текущая: ${rootResorptionStage ?? 0}%)`}
							data-testid={`quick-resorption-${number}`}
						>
							<span className="w-2 h-2 rounded-full bg-orange-500 inline-block shadow-xs shrink-0" />
							<span>Резорбция {rootResorptionStage ? `${rootResorptionStage}%` : "R+"}</span>
						</button>
					)}

					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onQuickStateChange(getTargets(), "Missing", surfaces);
						}}
						className="px-2.5 py-1.5 min-h-[36px] min-w-[36px] rounded-lg bg-slate-500/15 hover:bg-slate-600 text-slate-800 dark:text-slate-300 hover:text-white border border-slate-500/40 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all hover:scale-105 active:scale-95 touch-manipulation"
						title="Физиологическая смена зуба (выпал / эксфолиация)"
						data-testid={`quick-exfoliated-${number}`}
					>
						<span className="w-2 h-2 rounded-full bg-slate-500 inline-block shadow-xs shrink-0" />
						<span>Смена (Выпал)</span>
					</button>

					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onQuickStateChange(getTargets(), "Healthy", surfaces);
						}}
						className="px-2.5 py-1.5 min-h-[36px] min-w-[36px] rounded-lg bg-emerald-500/15 hover:bg-emerald-500 text-emerald-800 dark:text-emerald-300 hover:text-white border border-emerald-500/40 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all hover:scale-105 active:scale-95 touch-manipulation"
						title="Здоровый интактный молочный зуб"
						data-testid={`quick-healthy-${number}`}
					>
						<span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shadow-xs shrink-0" />
						<span>Здоров</span>
					</button>
				</>
			) : (
				<>
					{/* Adult Dominant Quick Actions (Miller/Hick law) */}
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onQuickStateChange(getTargets(), "Caries", surfaces);
						}}
						className="px-2.5 py-1.5 min-h-[36px] min-w-[36px] rounded-lg bg-amber-500/15 hover:bg-amber-500 text-amber-800 dark:text-amber-300 hover:text-white border border-amber-500/40 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all hover:scale-105 active:scale-95 touch-manipulation shrink-0 flex-shrink-0 whitespace-nowrap"
						title="Кариес"
						data-testid={`quick-caries-${number}`}
					>
						<span className="w-2 h-2 rounded-full bg-amber-500 inline-block shadow-xs shrink-0" />
						<span className="whitespace-nowrap shrink-0 font-bold">Кариес</span>
					</button>

					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onQuickStateChange(getTargets(), "Filled", surfaces);
						}}
						className="px-2.5 py-1.5 min-h-[36px] min-w-[36px] rounded-lg bg-blue-500/15 hover:bg-blue-500 text-blue-800 dark:text-blue-300 hover:text-white border border-blue-500/40 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all hover:scale-105 active:scale-95 touch-manipulation shrink-0 flex-shrink-0 whitespace-nowrap"
						title="Пломба"
						data-testid={`quick-filled-${number}`}
					>
						<span className="w-2 h-2 rounded-full bg-blue-500 inline-block shadow-xs shrink-0" />
						<span className="whitespace-nowrap shrink-0 font-bold">Пломба</span>
					</button>

					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onQuickStateChange(getTargets(), "Pulpitis", surfaces);
						}}
						className="px-2.5 py-1.5 min-h-[36px] min-w-[36px] rounded-lg bg-rose-500/15 hover:bg-rose-500 text-rose-800 dark:text-rose-300 hover:text-white border border-rose-500/40 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all hover:scale-105 active:scale-95 touch-manipulation shrink-0 flex-shrink-0 whitespace-nowrap"
						title="Пульпит"
						data-testid={`quick-pulpitis-${number}`}
					>
						<span className="w-2 h-2 rounded-full bg-rose-500 inline-block shadow-xs shrink-0" />
						<span className="whitespace-nowrap shrink-0 font-bold">Пульпит</span>
					</button>

					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onQuickStateChange(getTargets(), "Crown", surfaces);
						}}
						className="px-2.5 py-1.5 min-h-[36px] min-w-[36px] rounded-lg bg-amber-500/15 hover:bg-amber-500 text-amber-800 dark:text-amber-300 hover:text-white border border-amber-500/40 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all hover:scale-105 active:scale-95 touch-manipulation shrink-0 flex-shrink-0 whitespace-nowrap"
						title="Коронка"
						data-testid={`quick-crown-${number}`}
					>
						<span className="w-2 h-2 rounded-full bg-amber-500 inline-block shadow-xs shrink-0" />
						<span className="whitespace-nowrap shrink-0 font-bold">Коронка</span>
					</button>

					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onQuickStateChange(getTargets(), "Implant", surfaces);
						}}
						className="px-2.5 py-1.5 min-h-[36px] min-w-[36px] rounded-lg bg-indigo-500/15 hover:bg-indigo-500 text-indigo-800 dark:text-indigo-300 hover:text-white border border-indigo-500/40 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all hover:scale-105 active:scale-95 touch-manipulation shrink-0 flex-shrink-0 whitespace-nowrap"
						title="Имплантат"
						data-testid={`quick-implant-${number}`}
					>
						<span className="w-2 h-2 rounded-full bg-indigo-500 inline-block shadow-xs shrink-0" />
						<span className="whitespace-nowrap shrink-0 font-bold">Имплант</span>
					</button>

					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onQuickStateChange(getTargets(), "Missing", surfaces);
						}}
						className="px-2.5 py-1.5 min-h-[36px] min-w-[36px] rounded-lg bg-red-600/15 hover:bg-red-600 text-red-800 dark:text-red-300 hover:text-white border border-red-500/40 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all hover:scale-105 active:scale-95 touch-manipulation shrink-0 flex-shrink-0 whitespace-nowrap"
						title="Удален"
						data-testid={`quick-missing-${number}`}
					>
						<span className="w-2 h-2 rounded-full bg-red-600 inline-block shadow-xs shrink-0" />
						<span className="whitespace-nowrap shrink-0 font-bold">Удален</span>
					</button>

					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onQuickStateChange(getTargets(), "Healthy", surfaces);
						}}
						className="px-2.5 py-1.5 min-h-[36px] min-w-[36px] rounded-lg bg-emerald-500/15 hover:bg-emerald-500 text-emerald-800 dark:text-emerald-300 hover:text-white border border-emerald-500/40 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all hover:scale-105 active:scale-95 touch-manipulation shrink-0 flex-shrink-0 whitespace-nowrap"
						title="Здоров (Интактный)"
						data-testid={`quick-healthy-${number}`}
					>
						<span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shadow-xs shrink-0" />
						<span className="whitespace-nowrap shrink-0 font-bold">Здоров</span>
					</button>
				</>
			)}
		</div>
	);
});
ToothCardHud.displayName = "ToothCardHud";
