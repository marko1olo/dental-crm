import React from "react";
import {
	CANONICAL_5_CLINICAL_LAB_STATUSES,
	CANONICAL_6_ORTHOPEDIC_LIFECYCLE_STAGES,
	mapTo6StageOrthopedicLifecycle,
} from "../labMath";

export interface DentalLabPrintTrackersProps {
	active5Stage: string;
	currentStep: number;
	currentStage?: string | undefined;
	status?: string | undefined;
	deliveryTimeSlot: string;
}

export function DentalLabPrintTrackers({
	active5Stage,
	currentStep,
	currentStage,
	status,
	deliveryTimeSlot,
}: DentalLabPrintTrackersProps): React.JSX.Element {
	const mapped6 = mapTo6StageOrthopedicLifecycle(currentStage || status || "sent");
	const stepCurrent6 =
		CANONICAL_6_ORTHOPEDIC_LIFECYCLE_STAGES.find((s) => s.id === mapped6)?.step ?? 1;

	return (
		<>
			{/* 5-Stage Clinical Tracking Progression */}
			<div
				className="p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs space-y-2 break-inside-avoid print:break-inside-avoid print:bg-transparent print:border-black"
				data-testid="lab-blank-5stage-tracker"
			>
				<div className="font-bold border-b border-slate-200 pb-1.5 uppercase tracking-wider text-[11px] text-slate-700 flex justify-between items-center print:border-black print:text-black">
					<span>Маршрутный лист и этапы изготовления в лаборатории:</span>
					<span className="font-mono text-[10px] text-slate-500 print:text-black font-semibold">5 ЭТАПОВ ТРЕКИНГА</span>
				</div>
				<div className="grid grid-cols-5 gap-2 pt-1 text-center">
					{CANONICAL_5_CLINICAL_LAB_STATUSES.map((item) => {
						const isCurrent = active5Stage === item.id;
						const isPassed = currentStep >= item.step;
						return (
							<div
								key={item.id}
								className={`p-2 rounded border text-center transition-all ${
									isCurrent
										? "bg-slate-900 text-white border-slate-900 font-bold shadow-xs ring-1 ring-slate-900 print:bg-white print:text-black print:border-black print:font-black"
										: isPassed
										? "bg-slate-100 text-slate-800 border-slate-300 font-semibold print:bg-transparent print:text-black print:border-black"
										: "bg-white text-slate-400 border-slate-200 print:bg-transparent print:text-slate-600 print:border-slate-300"
								}`}
								data-testid={`ztl-blank-stage-${item.id}`}
							>
								<div className="text-[10px] uppercase font-bold tracking-wider">
									Этап {item.step}
								</div>
								<div className="text-xs font-bold mt-0.5 truncate">{item.shortLabelRu}</div>
								<div className="text-[10px] mt-0.5 opacity-80">
									{isCurrent ? "ТЕКУЩИЙ" : isPassed ? "ПРОЙДЕН" : "ОЖИДАНИЕ"}
								</div>
							</div>
						);
					})}
				</div>
			</div>

			{/* 6-Stage Orthopedic Lifecycle & Courier Manifest */}
			<div
				className="p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs space-y-2 break-inside-avoid print:break-inside-avoid print:bg-transparent print:border-black"
				data-testid="lab-blank-6stage-lifecycle"
			>
				<div className="font-bold border-b border-slate-200 pb-1.5 uppercase tracking-wider text-[11px] text-slate-700 flex justify-between items-center print:border-black print:text-black">
					<span>Ортопедический жизненный цикл и курьерский трекинг (6 этапов):</span>
					<span className="font-mono text-[10px] text-slate-600 print:text-black font-bold">
						СЛОТ ДОСТАВКИ: {deliveryTimeSlot}
					</span>
				</div>
				<div className="grid grid-cols-6 gap-1.5 pt-1 text-center">
					{CANONICAL_6_ORTHOPEDIC_LIFECYCLE_STAGES.map((item) => {
						const isCurrent = mapped6 === item.id;
						const isPassed = stepCurrent6 >= item.step;
						return (
							<div
								key={item.id}
								className={`p-1.5 rounded border text-center text-[10px] transition-all ${
									isCurrent
										? "bg-slate-900 text-white border-slate-900 font-bold print:bg-white print:text-black print:border-black print:font-black"
										: isPassed
										? "bg-slate-100 text-slate-800 border-slate-300 font-semibold print:bg-transparent print:text-black print:border-black"
										: "bg-white text-slate-400 border-slate-200 print:bg-transparent print:text-slate-600 print:border-slate-300"
								}`}
								data-testid={`ztl-blank-6stage-${item.id}`}
							>
								<div className="font-bold uppercase tracking-wider">
									Эт. {item.step}
								</div>
								<div className="font-bold truncate mt-0.5">{item.shortLabelRu}</div>
								<div className="opacity-80 mt-0.5">
									{isCurrent ? "ТЕКУЩИЙ" : isPassed ? "ПРОЙДЕН" : "ОЖИДАНИЕ"}
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</>
	);
}
