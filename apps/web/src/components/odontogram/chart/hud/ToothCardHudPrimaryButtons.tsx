import React, { memo } from "react";
import { Activity } from "lucide-react";
import type { ToothState, RootResorptionStage } from "../toothChartTypes";

export interface ToothCardHudPrimaryButtonsProps {
	number: number;
	surfaces?: readonly string[] | undefined;
	rootResorptionStage?: RootResorptionStage | number | undefined;
	useSurfaces?: boolean | undefined;
	getTargets: () => number[];
	onQuickStateChange: (targets: number[], state: ToothState, surfaces?: readonly string[] | undefined) => void;
	onResorptionChange?: ((targets: number[], stage: RootResorptionStage) => void) | undefined;
}

export const ToothCardHudPrimaryButtons: React.FC<ToothCardHudPrimaryButtonsProps> = memo(({
	number,
	surfaces,
	rootResorptionStage,
	useSurfaces,
	getTargets,
	onQuickStateChange,
	onResorptionChange,
}) => {
	const handleState = (st: ToothState, surfs?: readonly string[]) => {
		onQuickStateChange(getTargets(), st, surfs);
	};

	const nextResorption = () => {
		const stages: RootResorptionStage[] = [0, 25, 50, 75, 100];
		const nextIdx = (stages.indexOf((rootResorptionStage ?? 0) as RootResorptionStage) + 1) % stages.length;
		onResorptionChange?.(getTargets(), stages[nextIdx] ?? 0);
	};

	return (
		<>
			{/* Молочный прикус: Hot Path */}
			<div className="grid grid-cols-3 gap-1 mb-1">
				<button type="button" onClick={(e) => { e.stopPropagation(); handleState("Caries", useSurfaces ? surfaces : undefined); }} className="!min-h-[26px] !h-[26px] px-1 rounded-md bg-amber-500/15 hover:bg-amber-500 text-amber-900 dark:text-amber-300 hover:text-white border border-amber-500/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500 !text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all duration-150 active:scale-95 touch-manipulation" title="Кариес молочного зуба" data-testid={`quick-caries-${number}`}>
					<span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block shadow-xs shrink-0" /><span>Кариес</span>
				</button>
				<button type="button" onClick={(e) => { e.stopPropagation(); handleState("Filled", useSurfaces ? surfaces : undefined); }} className="!min-h-[26px] !h-[26px] px-1 rounded-md bg-blue-500/15 hover:bg-blue-500 text-blue-900 dark:text-blue-300 hover:text-white border border-blue-500/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 !text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all duration-150 active:scale-95 touch-manipulation" title="Пломба СИЦ / Композит" data-testid={`quick-filled-${number}`}>
					<span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block shadow-xs shrink-0" /><span>Пломба</span>
				</button>
				<button type="button" onClick={(e) => { e.stopPropagation(); handleState("Healthy", []); }} className="!min-h-[26px] !h-[26px] px-1 rounded-md bg-emerald-500/15 hover:bg-emerald-500 text-emerald-900 dark:text-emerald-300 hover:text-white border border-emerald-500/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 !text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all duration-150 active:scale-95 touch-manipulation" title="Здоровый интактный молочный зуб" data-testid={`quick-healthy-${number}`}>
					<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shadow-xs shrink-0" /><span>Здоров</span>
				</button>
			</div>

			{/* Эндодонтия */}
			<div className="grid grid-cols-2 gap-1 mb-1">
				<button type="button" onClick={(e) => { e.stopPropagation(); handleState("Pulpitis", useSurfaces ? surfaces : undefined); }} className="!min-h-[24px] !h-[24px] px-1 rounded-md bg-rose-500/15 hover:bg-rose-500 text-rose-900 dark:text-rose-300 hover:text-white border border-rose-500/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-500 !text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all duration-150 active:scale-95 touch-manipulation" title="Витальная пульпотомия" data-testid={`quick-pulpotomy-${number}`}>
					<span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block shadow-xs shrink-0" /><span>Пульп</span>
				</button>
				<button type="button" onClick={(e) => { e.stopPropagation(); handleState("Periodontitis", useSurfaces ? surfaces : undefined); }} className="!min-h-[24px] !h-[24px] px-1 rounded-md bg-[#ea580c]/15 hover:bg-[#ea580c] text-[#c2410c] dark:text-orange-300 hover:text-white border border-[#ea580c]/40 hover:border-[#ea580c] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange-500 !text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all duration-150 active:scale-95 touch-manipulation group/pt" title="Периодонтит (Pt)" data-testid={`quick-periodontitis-${number}`}>
					<Activity className="w-3 h-3 text-[#ea580c] group-hover/pt:text-white shrink-0" /><span>Перио</span>
					<span className="px-1 py-0.2 rounded text-[8px] font-black bg-[#ea580c]/20 text-[#ea580c] dark:text-orange-200 border border-[#ea580c]/30 leading-none">Pt</span>
				</button>
			</div>

			{/* Вторичные действия */}
			<div className="grid grid-cols-3 gap-1">
				<button type="button" onClick={(e) => { e.stopPropagation(); handleState("Crown", []); }} className="!min-h-[24px] !h-[24px] px-1 rounded-md bg-amber-500/10 hover:bg-amber-500 text-amber-900 dark:text-amber-300 hover:text-white border border-amber-500/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500 !text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all duration-150 active:scale-95 touch-manipulation" title="Эстетическая циркониевая коронка" data-testid={`quick-nusmile-${number}`}>
					<span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block shrink-0" /><span>Коронка</span>
				</button>
				{onResorptionChange && (
					<button type="button" onClick={(e) => { e.stopPropagation(); nextResorption(); }} className="!min-h-[24px] !h-[24px] px-1 rounded-md bg-orange-500/10 hover:bg-orange-500 text-orange-900 dark:text-orange-300 hover:text-white border border-orange-500/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange-500 !text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all duration-150 active:scale-95 touch-manipulation" title={`Стадия резорбции (${rootResorptionStage ?? 0}%)`} data-testid={`quick-resorption-${number}`}>
						<span className="w-1.5 h-1.5 rounded-full bg-orange-500 inline-block shrink-0" /><span>{rootResorptionStage ? `R${rootResorptionStage}%` : "R+"}</span>
					</button>
				)}
				<button type="button" onClick={(e) => { e.stopPropagation(); handleState("Missing", []); }} className="!min-h-[24px] !h-[24px] px-1 rounded-md bg-slate-500/10 hover:bg-slate-600 text-slate-800 dark:text-slate-300 hover:text-white border border-slate-500/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-500 !text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all duration-150 active:scale-95 touch-manipulation" title="Физиологическая смена" data-testid={`quick-exfoliated-${number}`}>
					<span className="w-1.5 h-1.5 rounded-full bg-slate-500 inline-block shrink-0" /><span>Смена</span>
				</button>
			</div>
		</>
	);
});
ToothCardHudPrimaryButtons.displayName = "ToothCardHudPrimaryButtons";
