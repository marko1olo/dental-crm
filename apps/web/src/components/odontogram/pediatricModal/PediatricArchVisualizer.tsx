import React from "react";
import { Sparkles } from "lucide-react";
import {
	isPrimaryTooth,
	type EruptionTimelineAnalysis,
} from "../pediatricDentitionEngine";

export interface PediatricArchVisualizerProps {
	selectedAge: number;
	hasFirstPermanentMolars: boolean;
	upperRow: number[];
	lowerRow: number[];
	timelineAnalysis: EruptionTimelineAnalysis;
	onApplyAgeArch?: ((teethNumbers: number[]) => void) | undefined;
}

export const PediatricArchVisualizer: React.FC<PediatricArchVisualizerProps> = ({
	selectedAge,
	hasFirstPermanentMolars,
	upperRow,
	lowerRow,
	timelineAnalysis,
	onApplyAgeArch,
}) => {
	return (
		<div className="p-4 sm:p-6 rounded-2xl bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))] dark:bg-slate-950/70 border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] dark:border-slate-800 space-y-4">
			<div className="flex items-center justify-between">
				<h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[var(--odontogram-ink-muted,var(--muted,#64748b))] dark:text-slate-400">
					Ожидаемая зубная формула в {selectedAge.toFixed(1)} лет
				</h4>
			</div>

			<div className="w-full overflow-x-auto touch-pan-x snap-x pb-2 scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
				<div className="min-w-[640px] space-y-4">
					{/* Upper Arch */}
					<div className="space-y-2">
						<div className="text-xs sm:text-sm font-bold text-[var(--odontogram-ink-muted,var(--muted,#64748b))] dark:text-slate-400">
							{hasFirstPermanentMolars
								? "Верхняя челюсть (12 зубов, включая 1-е моляры):"
								: "Верхняя челюсть (10 молочных зубов):"}
						</div>
						<div className={`grid gap-2 ${hasFirstPermanentMolars ? "grid-cols-12" : "grid-cols-10"}`}>
							{upperRow.map((num) => {
								const isPrim = isPrimaryTooth(num);
								const isErupting = timelineAnalysis.activelyEruptingPermanentTeeth.includes(num);
								return (
									<span
										key={num}
										className={`min-h-[52px] min-w-[48px] px-1 py-1.5 rounded-xl text-sm font-mono font-bold border flex flex-col items-center justify-center gap-1 shadow-xs select-none transition-all shrink-0 snap-start ${
											isErupting
												? "bg-amber-100 dark:bg-amber-900/50 text-amber-950 dark:text-amber-100 border-amber-500/60 animate-pulse font-bold"
												: isPrim
													? "bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 border-amber-400/50 hover:border-amber-500"
													: "bg-teal-50 dark:bg-teal-950/30 text-teal-900 dark:text-teal-200 border-teal-400/50 hover:border-teal-500"
										}`}
										title={isPrim ? `Молочный зуб ${num}` : `Постоянный зуб ${num}`}
									>
										<span className="text-sm font-bold font-mono leading-none">{num}</span>
										<span className="text-[10px] font-semibold font-sans opacity-90 leading-none">
											{isPrim ? "Мол." : "Пост."}
										</span>
									</span>
								);
							})}
						</div>
					</div>

					{/* Lower Arch */}
					<div className="space-y-2">
						<div className="text-xs sm:text-sm font-bold text-[var(--odontogram-ink-muted,var(--muted,#64748b))] dark:text-slate-400">
							{hasFirstPermanentMolars
								? "Нижняя челюсть (12 зубов, включая 1-е моляры):"
								: "Нижняя челюсть (10 молочных зубов):"}
						</div>
						<div className={`grid gap-2 ${hasFirstPermanentMolars ? "grid-cols-12" : "grid-cols-10"}`}>
							{lowerRow.map((num) => {
								const isPrim = isPrimaryTooth(num);
								const isErupting = timelineAnalysis.activelyEruptingPermanentTeeth.includes(num);
								return (
									<span
										key={num}
										className={`min-h-[52px] min-w-[48px] px-1 py-1.5 rounded-xl text-sm font-mono font-bold border flex flex-col items-center justify-center gap-1 shadow-xs select-none transition-all shrink-0 snap-start ${
											isErupting
												? "bg-amber-100 dark:bg-amber-900/50 text-amber-950 dark:text-amber-100 border-amber-500/60 animate-pulse font-bold"
												: isPrim
													? "bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 border-amber-400/50 hover:border-amber-500"
													: "bg-teal-50 dark:bg-teal-950/30 text-teal-900 dark:text-teal-200 border-teal-400/50 hover:border-teal-500"
										}`}
										title={isPrim ? `Молочный зуб ${num}` : `Постоянный зуб ${num}`}
									>
										<span className="text-sm font-bold font-mono leading-none">{num}</span>
										<span className="text-[10px] font-semibold font-sans opacity-90 leading-none">
											{isPrim ? "Мол." : "Пост."}
										</span>
									</span>
								);
							})}
						</div>
					</div>
				</div>
			</div>

			{/* Big Tactile Action Button */}
			{onApplyAgeArch && (
				<div className="pt-2">
					<button
						type="button"
						onClick={() =>
							onApplyAgeArch([
								...timelineAnalysis.expectedUpperArchTeeth,
								...timelineAnalysis.expectedLowerArchTeeth,
							])
						}
						className="w-full min-h-[48px] flex items-center justify-center gap-2.5 px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white text-sm sm:text-base font-bold shadow-lg shadow-teal-600/20 transition-all cursor-pointer active:scale-[0.98]"
					>
						<Sparkles className="w-5 h-5 shrink-0" />
						<span>Применить возрастную формулу ({selectedAge.toFixed(1)} лет) к одонтограмме</span>
					</button>
				</div>
			)}
		</div>
	);
};
