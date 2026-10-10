import React, { memo } from "react";
import { Activity } from "lucide-react";
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
	const stateLabel = state
		? TOOTH_STATE_LABELS[state] ?? TOOTH_STATE_LABELS[String(state).toLowerCase()] ?? "интактный"
		: "интактный";

	return (
		<div
			className={`tooth-hover-quick-hud absolute tooth-card-hud-compact ${hudAlignClass} hidden group-hover/badge:flex flex-col transition-all duration-150 z-50 p-1.5 rounded-xl bg-[var(--odontogram-paper)]/95 border border-[var(--odontogram-border-strong)] shadow-xl backdrop-blur-md pointer-events-auto whitespace-nowrap w-[216px] min-w-[216px] max-w-[226px] box-border ${
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

					{/* Молочный прикус: Эндодонтия (Пульпотомия & Периодонтит) */}
					<div className="grid grid-cols-2 gap-1 mb-1">
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								onQuickStateChange(getTargets(), "Pulpitis", useSurfaces ? surfaces : undefined);
							}}
							className="!min-h-[24px] !h-[24px] px-1 rounded-md bg-rose-500/15 hover:bg-rose-500 text-rose-800 dark:text-rose-300 hover:text-white border border-rose-500/40 !text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 touch-manipulation"
							title="Витальная пульпотомия молочного зуба (Biodentine/MTA)"
							data-testid={`quick-pulpotomy-${number}`}
						>
							<span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block shadow-xs shrink-0" />
							<span>Пульп</span>
						</button>

						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								onQuickStateChange(getTargets(), "Periodontitis", useSurfaces ? surfaces : undefined);
							}}
							className="!min-h-[24px] !h-[24px] px-1 rounded-md bg-[#ea580c]/15 hover:bg-[#ea580c] text-[#c2410c] dark:text-orange-300 hover:text-white border border-[#ea580c]/40 hover:border-[#ea580c] !text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 touch-manipulation group/pt"
							title="Периодонтит молочного зуба (Pt, K04.4 / K04.5)"
							data-testid={`quick-periodontitis-${number}`}
						>
							<Activity className="w-3 h-3 text-[#ea580c] group-hover/pt:text-white shrink-0" />
							<span>Перио</span>
							<span className="px-1 py-0.2 rounded text-[8px] font-black bg-[#ea580c]/20 dark:bg-[#ea580c]/30 text-[#ea580c] dark:text-orange-200 group-hover/pt:bg-white/20 group-hover/pt:text-white border border-[#ea580c]/30 leading-none">Pt</span>
						</button>
					</div>

					{/* Молочный прикус: Вторичные компактные действия */}
					<div className="grid grid-cols-3 gap-1">
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								onQuickStateChange(getTargets(), "Crown", []);
							}}
							className="!min-h-[24px] !h-[24px] px-1 rounded-md bg-amber-500/10 hover:bg-amber-500 text-amber-800 dark:text-amber-300 hover:text-white border border-amber-500/30 !text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 touch-manipulation"
							title="Эстетическая циркониевая коронка NuSmile / 3M"
							data-testid={`quick-nusmile-${number}`}
						>
							<span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block shrink-0" />
							<span>Коронка</span>
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
								className="!min-h-[24px] !h-[24px] px-1 rounded-md bg-orange-500/10 hover:bg-orange-500 text-orange-800 dark:text-orange-300 hover:text-white border border-orange-500/30 !text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 touch-manipulation"
								title={`Сменить стадию физиологической резорбции корня (текущая: ${rootResorptionStage ?? 0}%)`}
								data-testid={`quick-resorption-${number}`}
							>
								<span className="w-1.5 h-1.5 rounded-full bg-orange-500 inline-block shrink-0" />
								<span>{rootResorptionStage ? `R${rootResorptionStage}%` : "R+"}</span>
							</button>
						)}

						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								onQuickStateChange(getTargets(), "Missing", []);
							}}
							className="!min-h-[24px] !h-[24px] px-1 rounded-md bg-slate-500/10 hover:bg-slate-600 text-slate-800 dark:text-slate-300 hover:text-white border border-slate-500/30 !text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 touch-manipulation"
							title="Физиологическая смена зуба (выпал / эксфолиация)"
							data-testid={`quick-exfoliated-${number}`}
						>
							<span className="w-1.5 h-1.5 rounded-full bg-slate-500 inline-block shrink-0" />
							<span>Смена</span>
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

					{/* Постоянный прикус: Эндодонтия (Пульпит & Периодонтит) */}
					<div className="grid grid-cols-2 gap-1 mb-1">
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								onQuickStateChange(getTargets(), "Pulpitis", useSurfaces ? surfaces : undefined);
							}}
							className="!min-h-[24px] !h-[24px] px-1 rounded-md bg-rose-500/15 hover:bg-rose-500 text-rose-800 dark:text-rose-300 hover:text-white border border-rose-500/40 !text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 touch-manipulation"
							title="Пульпит (K04.0)"
							data-testid={`quick-pulpitis-${number}`}
						>
							<span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block shadow-xs shrink-0" />
							<span>Пульпит</span>
						</button>

						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								onQuickStateChange(getTargets(), "Periodontitis", useSurfaces ? surfaces : undefined);
							}}
							className="!min-h-[24px] !h-[24px] px-1 rounded-md bg-[#ea580c]/15 hover:bg-[#ea580c] text-[#c2410c] dark:text-orange-300 hover:text-white border border-[#ea580c]/40 hover:border-[#ea580c] !text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 touch-manipulation group/pt"
							title="Периодонтит (Pt, K04.4 / K04.5 Хронический апикальный периодонтит)"
							data-testid={`quick-periodontitis-${number}`}
						>
							<Activity className="w-3 h-3 text-[#ea580c] group-hover/pt:text-white shrink-0" />
							<span>Периодонтит</span>
							<span className="px-1 py-0.2 rounded text-[8px] font-black bg-[#ea580c]/20 dark:bg-[#ea580c]/30 text-[#ea580c] dark:text-orange-200 group-hover/pt:bg-white/20 group-hover/pt:text-white border border-[#ea580c]/30 leading-none">Pt</span>
						</button>
					</div>

					{/* Постоянный прикус: Ортопедия и Хирургия (Коронка, Имплант, Удален) */}
					<div className="grid grid-cols-3 gap-1">
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								onQuickStateChange(getTargets(), "Crown", []);
							}}
							className="!min-h-[24px] !h-[24px] px-1 rounded-md bg-amber-500/10 hover:bg-amber-500 text-amber-800 dark:text-amber-300 hover:text-white border border-amber-500/30 !text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 touch-manipulation"
							title="Коронка"
							data-testid={`quick-crown-${number}`}
						>
							<span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block shrink-0" />
							<span>Коронка</span>
						</button>

						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								onQuickStateChange(getTargets(), "Implant", []);
							}}
							className="!min-h-[24px] !h-[24px] px-1 rounded-md bg-indigo-500/10 hover:bg-indigo-500 text-indigo-800 dark:text-indigo-300 hover:text-white border border-indigo-500/30 !text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 touch-manipulation"
							title="Имплантат"
							data-testid={`quick-implant-${number}`}
						>
							<span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block shrink-0" />
							<span>Имплант</span>
						</button>

						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								onQuickStateChange(getTargets(), "Missing", []);
							}}
							className="!min-h-[24px] !h-[24px] px-1 rounded-md bg-red-600/10 hover:bg-red-600 text-red-800 dark:text-red-300 hover:text-white border border-red-500/30 !text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 touch-manipulation"
							title="Удален"
							data-testid={`quick-missing-${number}`}
						>
							<span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block shrink-0" />
							<span>Удален</span>
						</button>
					</div>
				</>
			)}
		</div>
	);
});
ToothCardHud.displayName = "ToothCardHud";
