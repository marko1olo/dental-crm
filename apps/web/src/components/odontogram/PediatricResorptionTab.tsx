import React from "react";
import { Check, Sparkles } from "lucide-react";
import {
	PRIMARY_TO_PERMANENT_SUCCESSOR_MAP,
	RESORPTION_STAGE_DEFINITIONS,
	type ResorptionStagePercent,
} from "./pediatricDentitionEngine";

export interface PediatricResorptionTabProps {
	selectedPrimaryTooth: number;
	onSelectPrimaryTooth: (tooth: number) => void;
	selectedResorptionStage: ResorptionStagePercent;
	onSelectResorptionStage: (stage: ResorptionStagePercent) => void;
	onUpdateToothResorption?: ((toothNumber: number, stage: ResorptionStagePercent) => void) | undefined;
}

const UPPER_PRIMARY_TEETH = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65] as const;
const LOWER_PRIMARY_TEETH = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75] as const;
const RESORPTION_STAGES: readonly ResorptionStagePercent[] = [0, 25, 50, 75, 100];

export const PediatricResorptionTab: React.FC<PediatricResorptionTabProps> = ({
	selectedPrimaryTooth,
	onSelectPrimaryTooth,
	selectedResorptionStage,
	onSelectResorptionStage,
	onUpdateToothResorption,
}) => {
	const handleStageClick = (stage: ResorptionStagePercent) => {
		onSelectResorptionStage(stage);
		if (onUpdateToothResorption) {
			onUpdateToothResorption(selectedPrimaryTooth, stage);
		}
	};

	const handleApplyCurrent = () => {
		if (onUpdateToothResorption) {
			onUpdateToothResorption(selectedPrimaryTooth, selectedResorptionStage);
		}
	};

	return (
		<div className="space-y-6 animate-in fade-in duration-200">
			<div className="p-5 rounded-2xl bg-[var(--odontogram-surface,#f8fafc)] border border-[var(--odontogram-border-subtle,#e2e8f0)] space-y-3">
				<h3 className="text-sm font-extrabold text-[var(--odontogram-ink,#0f172a)]">
					Клиническая шкала физиологической резорбции корней молочных зубов
				</h3>
				<p className="text-xs text-[var(--odontogram-ink-muted,#64748b)] leading-relaxed">
					Оценка степени рассасывания корней под давлением постоянного зачатка. Используется для планирования сроков удаления по ортодонтическим показаниям и контроля физиологической смены.
				</p>
			</div>

			{/* 5 Stages Grid - Large Tactile Selector Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
				{RESORPTION_STAGES.map((stage) => {
					const def = RESORPTION_STAGE_DEFINITIONS[stage];
					const isSelected = selectedResorptionStage === stage;
					return (
						<button
							key={stage}
							type="button"
							onClick={() => handleStageClick(stage)}
							className={`min-h-[110px] p-4 rounded-2xl border-2 flex flex-col justify-between text-left transition-all cursor-pointer select-none active:scale-[0.98] ${
								isSelected
									? "border-teal-600 bg-teal-500/15 shadow-lg shadow-teal-500/10 ring-2 ring-teal-500/30"
									: "border-[var(--odontogram-border-subtle,#e2e8f0)] bg-[var(--odontogram-surface,#f8fafc)] hover:border-teal-400 hover:bg-[var(--odontogram-surface-hover,#f1f5f9)]"
							}`}
						>
							<div className="flex items-center justify-between w-full">
								<span
									className="px-2.5 py-1 rounded-xl text-xs font-black"
									style={{ backgroundColor: def.badgeBg, color: def.badgeColor }}
								>
									{stage}%
								</span>
								<span className="text-[10px] font-bold text-[var(--odontogram-ink-muted,#64748b)]">
									{def.expectedMobilityDegree} ст.
								</span>
							</div>

							<div className="my-1">
								<div className="text-xs font-black text-[var(--odontogram-ink,#0f172a)] leading-snug">
									{def.nameRu}
								</div>
								<div className="text-[11px] text-[var(--odontogram-ink-muted,#64748b)] line-clamp-2 mt-0.5">
									{def.clinicalSignRu}
								</div>
							</div>

							<div className="text-[10px] font-mono font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1">
								{isSelected ? <Check className="w-3 h-3" /> : null}
								<span>{isSelected ? "Выбрано" : "Выбрать"}</span>
							</div>
						</button>
					);
				})}
			</div>

			{/* Primary Teeth Tactile Grid Selector */}
			<div className="p-5 rounded-2xl bg-[var(--odontogram-surface,#f8fafc)] border border-[var(--odontogram-border-subtle,#e2e8f0)] space-y-4">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
					<div>
						<h4 className="text-xs font-bold uppercase tracking-wider text-[var(--odontogram-ink-muted,#64748b)]">
							Выберите молочный зуб для применения резорбции
						</h4>
						<p className="text-xs text-[var(--odontogram-ink-muted,#64748b)]">
							Текущий выбранный:{" "}
							<strong className="text-teal-600 dark:text-teal-400 font-mono text-sm">
								Зуб {selectedPrimaryTooth}
							</strong>{" "}
							(преемник: постоянный {PRIMARY_TO_PERMANENT_SUCCESSOR_MAP[selectedPrimaryTooth]})
						</p>
					</div>

					{onUpdateToothResorption && (
						<button
							type="button"
							onClick={handleApplyCurrent}
							className="min-h-[44px] px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2 shrink-0"
						>
							<Sparkles className="w-4 h-4" />
							<span>Применить {selectedResorptionStage}% к зубу {selectedPrimaryTooth}</span>
						</button>
					)}
				</div>

				{/* Upper Arch Teeth Buttons */}
				<div className="space-y-1.5">
					<div className="text-[11px] font-bold text-[var(--odontogram-ink-muted,#64748b)]">
						Верхний молочный ряд (55–65):
					</div>
					<div className="flex flex-wrap gap-2">
						{UPPER_PRIMARY_TEETH.map((num) => {
							const isSelected = selectedPrimaryTooth === num;
							return (
								<button
									key={num}
									type="button"
									onClick={() => onSelectPrimaryTooth(num)}
									className={`min-w-[48px] min-h-[44px] px-3 py-2 rounded-xl text-xs font-mono font-black border transition-all cursor-pointer active:scale-95 flex flex-col items-center justify-center ${
										isSelected
											? "bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-600/20 scale-105"
											: "bg-[var(--odontogram-paper,#ffffff)] text-[var(--odontogram-ink,#0f172a)] border-[var(--odontogram-border-subtle,#e2e8f0)] hover:border-teal-400 hover:bg-[var(--odontogram-surface-hover,#f1f5f9)]"
									}`}
								>
									<span>{num}</span>
									<span className="text-[9px] opacity-75 font-sans">
										→{PRIMARY_TO_PERMANENT_SUCCESSOR_MAP[num]}
									</span>
								</button>
							);
						})}
					</div>
				</div>

				{/* Lower Arch Teeth Buttons */}
				<div className="space-y-1.5">
					<div className="text-[11px] font-bold text-[var(--odontogram-ink-muted,#64748b)]">
						Нижний молочный ряд (85–75):
					</div>
					<div className="flex flex-wrap gap-2">
						{LOWER_PRIMARY_TEETH.map((num) => {
							const isSelected = selectedPrimaryTooth === num;
							return (
								<button
									key={num}
									type="button"
									onClick={() => onSelectPrimaryTooth(num)}
									className={`min-w-[48px] min-h-[44px] px-3 py-2 rounded-xl text-xs font-mono font-black border transition-all cursor-pointer active:scale-95 flex flex-col items-center justify-center ${
										isSelected
											? "bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-600/20 scale-105"
											: "bg-[var(--odontogram-paper,#ffffff)] text-[var(--odontogram-ink,#0f172a)] border-[var(--odontogram-border-subtle,#e2e8f0)] hover:border-teal-400 hover:bg-[var(--odontogram-surface-hover,#f1f5f9)]"
									}`}
								>
									<span>{num}</span>
									<span className="text-[9px] opacity-75 font-sans">
										→{PRIMARY_TO_PERMANENT_SUCCESSOR_MAP[num]}
									</span>
								</button>
							);
						})}
					</div>
				</div>
			</div>
		</div>
	);
};
