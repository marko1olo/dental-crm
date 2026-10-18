import React, { memo } from "react";
import { Activity } from "lucide-react";
import type { ToothState } from "../toothChartTypes";

export interface ToothCardHudAdultButtonsProps {
	number: number;
	surfaces?: readonly string[] | undefined;
	useSurfaces?: boolean | undefined;
	getTargets: () => number[];
	onQuickStateChange: (targets: number[], state: ToothState, surfaces?: readonly string[] | undefined) => void;
}

export const ToothCardHudAdultButtons: React.FC<ToothCardHudAdultButtonsProps> = memo(({
	number,
	surfaces,
	useSurfaces,
	getTargets,
	onQuickStateChange,
}) => {
	const handleState = (st: ToothState, surfs?: readonly string[]) => {
		onQuickStateChange(getTargets(), st, surfs);
	};

	return (
		<>
			{/* Постоянный прикус: Hot Path */}
			<div className="grid grid-cols-3 gap-1 mb-1">
				<button type="button" onClick={(e) => { e.stopPropagation(); handleState("Caries", useSurfaces ? surfaces : undefined); }} className="!min-h-[26px] !h-[26px] px-1 rounded-md bg-amber-500/15 hover:bg-amber-500 text-amber-800 dark:text-amber-300 hover:text-white border border-amber-500/40 !text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 touch-manipulation shrink-0" title="Кариес" data-testid={`quick-caries-${number}`}>
					<span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block shadow-xs shrink-0" /><span>Кариес</span>
				</button>
				<button type="button" onClick={(e) => { e.stopPropagation(); handleState("Filled", useSurfaces ? surfaces : undefined); }} className="!min-h-[26px] !h-[26px] px-1 rounded-md bg-blue-500/15 hover:bg-blue-500 text-blue-800 dark:text-blue-300 hover:text-white border border-blue-500/40 !text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 touch-manipulation shrink-0" title="Пломба" data-testid={`quick-filled-${number}`}>
					<span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block shadow-xs shrink-0" /><span>Пломба</span>
				</button>
				<button type="button" onClick={(e) => { e.stopPropagation(); handleState("Healthy", []); }} className="!min-h-[26px] !h-[26px] px-1 rounded-md bg-emerald-500/15 hover:bg-emerald-500 text-emerald-800 dark:text-emerald-300 hover:text-white border border-emerald-500/40 !text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 touch-manipulation shrink-0" title="Здоров (Интактный)" data-testid={`quick-healthy-${number}`}>
					<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shadow-xs shrink-0" /><span>Здоров</span>
				</button>
			</div>

			{/* Эндодонтия */}
			<div className="grid grid-cols-2 gap-1 mb-1">
				<button type="button" onClick={(e) => { e.stopPropagation(); handleState("Pulpitis", useSurfaces ? surfaces : undefined); }} className="!min-h-[24px] !h-[24px] px-1 rounded-md bg-rose-500/15 hover:bg-rose-500 text-rose-800 dark:text-rose-300 hover:text-white border border-rose-500/40 !text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 touch-manipulation" title="Пульпит (K04.0)" data-testid={`quick-pulpitis-${number}`}>
					<span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block shadow-xs shrink-0" /><span>Пульпит</span>
				</button>
				<button type="button" onClick={(e) => { e.stopPropagation(); handleState("Periodontitis", useSurfaces ? surfaces : undefined); }} className="!min-h-[24px] !h-[24px] px-1 rounded-md bg-[#ea580c]/15 hover:bg-[#ea580c] text-[#c2410c] dark:text-orange-300 hover:text-white border border-[#ea580c]/40 hover:border-[#ea580c] !text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 touch-manipulation group/pt" title="Периодонтит (Pt)" data-testid={`quick-periodontitis-${number}`}>
					<Activity className="w-3 h-3 text-[#ea580c] group-hover/pt:text-white shrink-0" /><span>Периодонтит</span>
					<span className="px-1 py-0.2 rounded text-[8px] font-black bg-[#ea580c]/20 text-[#ea580c] dark:text-orange-200 border border-[#ea580c]/30 leading-none">Pt</span>
				</button>
			</div>

			{/* Ортопедия & Хирургия */}
			<div className="grid grid-cols-3 gap-1">
				<button type="button" onClick={(e) => { e.stopPropagation(); handleState("Crown", []); }} className="!min-h-[24px] !h-[24px] px-1 rounded-md bg-amber-500/10 hover:bg-amber-500 text-amber-800 dark:text-amber-300 hover:text-white border border-amber-500/30 !text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 touch-manipulation" title="Коронка" data-testid={`quick-crown-${number}`}>
					<span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block shrink-0" /><span>Коронка</span>
				</button>
				<button type="button" onClick={(e) => { e.stopPropagation(); handleState("Implant", []); }} className="!min-h-[24px] !h-[24px] px-1 rounded-md bg-indigo-500/10 hover:bg-indigo-500 text-indigo-800 dark:text-indigo-300 hover:text-white border border-indigo-500/30 !text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 touch-manipulation" title="Имплантат" data-testid={`quick-implant-${number}`}>
					<span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block shrink-0" /><span>Имплант</span>
				</button>
				<button type="button" onClick={(e) => { e.stopPropagation(); handleState("Missing", []); }} className="!min-h-[24px] !h-[24px] px-1 rounded-md bg-red-600/10 hover:bg-red-600 text-red-800 dark:text-red-300 hover:text-white border border-red-500/30 !text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 touch-manipulation" title="Удален" data-testid={`quick-missing-${number}`}>
					<span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block shrink-0" /><span>Удален</span>
				</button>
			</div>
		</>
	);
});
ToothCardHudAdultButtons.displayName = "ToothCardHudAdultButtons";
