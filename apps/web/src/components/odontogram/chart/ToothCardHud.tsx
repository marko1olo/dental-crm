import React, { memo } from "react";
import {
	type ToothState,
	type RootResorptionStage,
	TOOTH_STATE_LABELS,
} from "./toothChartTypes";

export interface ToothCardHudProps {
	number: number;
	isTop: boolean;
	isPrimary: boolean;
	state?: ToothState | undefined;
	surfaces?: readonly string[] | undefined;
	selectedTeeth?: number[] | undefined;
	rootResorptionStage?: RootResorptionStage | number | undefined;
	useSurfaces?: boolean | undefined;
	onQuickStateChange: (
		targets: number[],
		state: ToothState,
		surfaces?: readonly string[] | undefined,
	) => void;
	onResorptionChange?: ((targets: number[], stage: RootResorptionStage) => void) | undefined;
}

export const ToothCardHud: React.FC<ToothCardHudProps> = memo(({
	number,
	isTop,
	isPrimary,
	state,
	surfaces,
	selectedTeeth,
	rootResorptionStage,
	useSurfaces,
	onQuickStateChange,
	onResorptionChange,
}) => {
	const isLeftMolar =
		(number >= 16 && number <= 18) ||
		(number >= 46 && number <= 48) ||
		(number >= 54 && number <= 55) ||
		(number >= 84 && number <= 85);
	const isRightMolar =
		(number >= 26 && number <= 28) ||
		(number >= 36 && number <= 38) ||
		(number >= 64 && number <= 65) ||
		(number >= 74 && number <= 75);

	const hudAlignClass = isLeftMolar
		? "left-0"
		: isRightMolar
		? "right-0"
		: "left-1/2 -translate-x-1/2";

	const getTargets = () =>
		selectedTeeth?.includes(number) && selectedTeeth.length > 0 ? selectedTeeth : [number];

	const surfaceBadge = surfaces && surfaces.length > 0 ? surfaces.join("") : null;
	const stateLabel = state ? TOOTH_STATE_LABELS[state] ?? state : "интактный";

	return (
		<div
			className={`tooth-hover-quick-hud tooth-card-hud-compact absolute ${hudAlignClass} hidden group-hover:flex group-hover/badge:flex flex-col transition-all duration-150 z-50 p-1.5 rounded-xl bg-[var(--odontogram-paper)]/95 border border-[var(--odontogram-border-strong)] shadow-xl backdrop-blur-md pointer-events-auto whitespace-nowrap w-[210px] min-w-[210px] max-w-[220px] box-border ${
				isTop ? "top-full mt-1.5" : "bottom-full mb-1.5"
			}`}
			onClick={(e) => e.stopPropagation()}
			data-testid={`tooth-card-hud-${number}`}
		>
			{/* Компактный заголовок: Номер зуба + статус + поверхности (если есть) */}
			<div className="flex items-center justify-between gap-1 px-1 pb-1 mb-1 border-b border-[var(--line,#e2e8f0)] text-left select-none">
				<div className="flex items-center gap-1 min-w-0">
					<span className="font-mono font-black text-xs text-[var(--odontogram-ink,#0f172a)]">
						{`Зуб ${number}`}
					</span>
					<span className="text-[10px] font-semibold text-[var(--odontogram-ink-muted,#64748b)] truncate capitalize max-w-[120px]">
						{`· ${stateLabel}`}
					</span>
				</div>
				{surfaceBadge && (
					<span className="px-1 py-0.2 rounded text-[9px] font-mono font-black bg-teal-500/15 text-teal-800 dark:text-teal-300 border border-teal-500/30 shrink-0">
						{surfaceBadge}
					</span>
				)}
			</div>

			{isPrimary ? (
				<>
					{/* Молочный прикус: Hot Path (Кариес, Пломба, Здоров) */}
					<div className="grid grid-cols-3 gap-1 mb-1">
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								onQuickStateChange(getTargets(), "Caries", useSurfaces ? surfaces : undefined);
							}}
							className="!min-h-[26px] !h-[26px] px-1 rounded-md bg-amber-500/15 hover:bg-amber-500 text-amber-800 dark:text-amber-300 hover:text-white border border-amber-500/40 !text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 touch-manipulation"
							title="Кариес молочного зуба"
							data-testid={`quick-caries-${number}`}
						>
							<span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block shadow-xs shrink-0" />
							<span>Кариес</span>
						</button>

						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								onQuickStateChange(getTargets(), "Filled", useSurfaces ? surfaces : undefined);
							}}
							className="!min-h-[26px] !h-[26px] px-1 rounded-md bg-blue-500/15 hover:bg-blue-500 text-blue-800 dark:text-blue-300 hover:text-white border border-blue-500/40 !text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 touch-manipulation"
							title="Пломба стеклоиономерным цементом (СИЦ / Композит)"
							data-testid={`quick-filled-${number}`}
						>
							<span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block shadow-xs shrink-0" />
							<span>Пломба</span>
						</button>

						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								onQuickStateChange(getTargets(), "Healthy", []);
							}}
							className="!min-h-[26px] !h-[26px] px-1 rounded-md bg-emerald-500/15 hover:bg-emerald-500 text-emerald-800 dark:text-emerald-300 hover:text-white border border-emerald-500/40 !text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 touch-manipulation"
							title="Здоровый интактный молочный зуб"
							data-testid={`quick-healthy-${number}`}
						>
							<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shadow-xs shrink-0" />
							<span>Здоров</span>
						</button>
					</div>

					{/* Молочный прикус: Вторичные компактные действия */}
					<div className="grid grid-cols-4 gap-0.5">
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								onQuickStateChange(getTargets(), "Pulpitis", useSurfaces ? surfaces : undefined);
							}}
							className="!min-h-[22px] !h-[22px] px-0.5 rounded bg-rose-500/10 hover:bg-rose-500 text-rose-800 dark:text-rose-300 hover:text-white border border-rose-500/30 !text-[9px] font-bold flex items-center justify-center cursor-pointer transition-all active:scale-95 truncate touch-manipulation"
							title="Витальная пульпотомия молочного зуба (Biodentine/MTA)"
							data-testid={`quick-pulpotomy-${number}`}
						>
							Пульп
						</button>

						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								onQuickStateChange(getTargets(), "Crown", []);
							}}
							className="!min-h-[22px] !h-[22px] px-0.5 rounded bg-amber-500/10 hover:bg-amber-500 text-amber-800 dark:text-amber-300 hover:text-white border border-amber-500/30 !text-[9px] font-bold flex items-center justify-center cursor-pointer transition-all active:scale-95 truncate touch-manipulation"
							title="Эстетическая циркониевая коронка NuSmile / 3M"
							data-testid={`quick-nusmile-${number}`}
						>
							Коронка
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
								className="!min-h-[22px] !h-[22px] px-0.5 rounded bg-orange-500/10 hover:bg-orange-500 text-orange-800 dark:text-orange-300 hover:text-white border border-orange-500/30 !text-[9px] font-bold flex items-center justify-center cursor-pointer transition-all active:scale-95 truncate touch-manipulation"
								title={`Сменить стадию физиологической резорбции корня (текущая: ${rootResorptionStage ?? 0}%)`}
								data-testid={`quick-resorption-${number}`}
							>
								{rootResorptionStage ? `R${rootResorptionStage}%` : "R+"}
							</button>
						)}

						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								onQuickStateChange(getTargets(), "Missing", []);
							}}
							className="!min-h-[22px] !h-[22px] px-0.5 rounded bg-slate-500/10 hover:bg-slate-600 text-slate-800 dark:text-slate-300 hover:text-white border border-slate-500/30 !text-[9px] font-bold flex items-center justify-center cursor-pointer transition-all active:scale-95 truncate touch-manipulation"
							title="Физиологическая смена зуба (выпал / эксфолиация)"
							data-testid={`quick-exfoliated-${number}`}
						>
							Смена
						</button>
					</div>
				</>
			) : (
				<>
					{/* Постоянный прикус: Hot Path (Кариес, Пломба, Здоров) */}
					<div className="grid grid-cols-3 gap-1 mb-1">
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								onQuickStateChange(getTargets(), "Caries", useSurfaces ? surfaces : undefined);
							}}
							className="!min-h-[26px] !h-[26px] px-1 rounded-md bg-amber-500/15 hover:bg-amber-500 text-amber-800 dark:text-amber-300 hover:text-white border border-amber-500/40 !text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 touch-manipulation shrink-0"
							title="Кариес"
							data-testid={`quick-caries-${number}`}
						>
							<span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block shadow-xs shrink-0" />
							<span>Кариес</span>
						</button>

						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								onQuickStateChange(getTargets(), "Filled", useSurfaces ? surfaces : undefined);
							}}
							className="!min-h-[26px] !h-[26px] px-1 rounded-md bg-blue-500/15 hover:bg-blue-500 text-blue-800 dark:text-blue-300 hover:text-white border border-blue-500/40 !text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 touch-manipulation shrink-0"
							title="Пломба"
							data-testid={`quick-filled-${number}`}
						>
							<span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block shadow-xs shrink-0" />
							<span>Пломба</span>
						</button>

						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								onQuickStateChange(getTargets(), "Healthy", []);
							}}
							className="!min-h-[26px] !h-[26px] px-1 rounded-md bg-emerald-500/15 hover:bg-emerald-500 text-emerald-800 dark:text-emerald-300 hover:text-white border border-emerald-500/40 !text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 touch-manipulation shrink-0"
							title="Здоров (Интактный)"
							data-testid={`quick-healthy-${number}`}
						>
							<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shadow-xs shrink-0" />
							<span>Здоров</span>
						</button>
					</div>

					{/* Постоянный прикус: Вторичные компактные действия */}
					<div className="grid grid-cols-4 gap-0.5">
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								onQuickStateChange(getTargets(), "Pulpitis", useSurfaces ? surfaces : undefined);
							}}
							className="!min-h-[22px] !h-[22px] px-0.5 rounded bg-rose-500/10 hover:bg-rose-500 text-rose-800 dark:text-rose-300 hover:text-white border border-rose-500/30 !text-[9px] font-bold flex items-center justify-center cursor-pointer transition-all active:scale-95 truncate touch-manipulation"
							title="Пульпит"
							data-testid={`quick-pulpitis-${number}`}
						>
							Пульпит
						</button>

						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								onQuickStateChange(getTargets(), "Crown", []);
							}}
							className="!min-h-[22px] !h-[22px] px-0.5 rounded bg-amber-500/10 hover:bg-amber-500 text-amber-800 dark:text-amber-300 hover:text-white border border-amber-500/30 !text-[9px] font-bold flex items-center justify-center cursor-pointer transition-all active:scale-95 truncate touch-manipulation"
							title="Коронка"
							data-testid={`quick-crown-${number}`}
						>
							Коронка
						</button>

						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								onQuickStateChange(getTargets(), "Implant", []);
							}}
							className="!min-h-[22px] !h-[22px] px-0.5 rounded bg-indigo-500/10 hover:bg-indigo-500 text-indigo-800 dark:text-indigo-300 hover:text-white border border-indigo-500/30 !text-[9px] font-bold flex items-center justify-center cursor-pointer transition-all active:scale-95 truncate touch-manipulation"
							title="Имплантат"
							data-testid={`quick-implant-${number}`}
						>
							Имплант
						</button>

						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								onQuickStateChange(getTargets(), "Missing", []);
							}}
							className="!min-h-[22px] !h-[22px] px-0.5 rounded bg-red-600/10 hover:bg-red-600 text-red-800 dark:text-red-300 hover:text-white border border-red-500/30 !text-[9px] font-bold flex items-center justify-center cursor-pointer transition-all active:scale-95 truncate touch-manipulation"
							title="Удален"
							data-testid={`quick-missing-${number}`}
						>
							Удален
						</button>
					</div>
				</>
			)}
		</div>
	);
});
ToothCardHud.displayName = "ToothCardHud";
