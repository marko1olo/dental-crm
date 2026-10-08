import React from "react";
import { Check } from "lucide-react";
import type { ResorptionStagePercent } from "../odontogram/pediatricDentitionEngine";
import {
	PediatricTeethChart,
	type PediatricDentitionMode,
	type ToothClinicalFinding,
} from "../PediatricTeethChart";

export interface PediatricPrimaryTeethCardProps {
	readonly currentTooth: number;
	readonly onSelectTooth: (tooth: number) => void;
	readonly dentitionMode: PediatricDentitionMode;
	readonly onModeChange: (mode: PediatricDentitionMode) => void;
	readonly toothFindings: Record<number, ToothClinicalFinding>;
	readonly resorptionStages: Record<number, ResorptionStagePercent>;
	readonly onResorptionChange: (tooth: number, stage: ResorptionStagePercent) => void;
	readonly onToothFindingChange: (tooth: number, finding: ToothClinicalFinding) => void;
	readonly onSetAllHealthy: () => void;
	readonly onApplyMixedDentitionPreset: () => void;
	readonly orthoFrenulumNormal: boolean;
	readonly setOrthoFrenulumNormal: React.Dispatch<React.SetStateAction<boolean>>;
	readonly orthoNasalBreathing: boolean;
	readonly setOrthoNasalBreathing: React.Dispatch<React.SetStateAction<boolean>>;
	readonly orthoNoHarmfulHabits: boolean;
	readonly setOrthoNoHarmfulHabits: React.Dispatch<React.SetStateAction<boolean>>;
}

export const PediatricPrimaryTeethCard: React.FC<
	PediatricPrimaryTeethCardProps
> = ({
	currentTooth,
	onSelectTooth,
	dentitionMode,
	onModeChange,
	toothFindings,
	resorptionStages,
	onResorptionChange,
	onToothFindingChange,
	onSetAllHealthy,
	onApplyMixedDentitionPreset,
	orthoFrenulumNormal,
	setOrthoFrenulumNormal,
	orthoNasalBreathing,
	setOrthoNasalBreathing,
	orthoNoHarmfulHabits,
	setOrthoNoHarmfulHabits,
}) => {
	return (
		<div className="mb-4">
			{/* ДЕТСКАЯ КАРТА ЗУБОВ: МОЛОЧНЫЙ / СМЕННЫЙ ПРИКУС (FDI 51-55, 61-65, 71-75, 81-85 & 16, 26, 36, 46) */}
			<div className="mb-4">
				<PediatricTeethChart
					activeTooth={currentTooth}
					onSelectTooth={onSelectTooth}
					mode={dentitionMode}
					onModeChange={onModeChange}
					toothFindings={toothFindings}
					resorptionStages={resorptionStages}
					onResorptionChange={onResorptionChange}
					onToothFindingChange={onToothFindingChange}
					onSetAllHealthy={onSetAllHealthy}
					onApplyMixedDentitionPreset={onApplyMixedDentitionPreset}
				/>
			</div>

			{/* ПЕРВИЧНЫЙ ОСМОТР: ЧЕКБОКСЫ ОРТОДОНТИЧЕСКОЙ НОРМЫ (НОРМА В 1 КЛИК, ТАЧ-ТАРГЕТЫ >= 48px) */}
			<div className="rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] p-3">
				<div className="mb-2 flex items-center justify-between">
					<span className="text-xs font-bold uppercase tracking-wider text-[var(--ink,#0f172a)]">
						Первичный осмотр — ортодонтическая норма (СтАР):
					</span>
					<span className="text-[11px] font-semibold text-teal-700 dark:text-teal-400">
						{orthoFrenulumNormal && orthoNasalBreathing && orthoNoHarmfulHabits
							? "Физиологическая норма (100%)"
							: "Выявлены отклонения / требуется консультация ортодонта"}
					</span>
				</div>
				<div
					className="grid grid-cols-1 gap-2 sm:grid-cols-3"
					data-testid="pediatric-ortho-norm-grid"
				>
					<button
						type="button"
						onClick={() => setOrthoFrenulumNormal((prev) => !prev)}
						className={`flex min-h-[48px] items-center justify-between rounded-xl border px-3 py-2 text-left transition active:scale-[0.98] cursor-pointer touch-manipulation select-none ${
							orthoFrenulumNormal
								? "border-teal-500 bg-teal-50/80 text-teal-950 dark:border-teal-400 dark:bg-teal-950/60 dark:text-teal-100 ring-1 ring-teal-500/20"
								: "border-amber-400 bg-amber-50/80 text-amber-950 dark:border-amber-400 dark:bg-amber-950/60 dark:text-amber-100 ring-1 ring-amber-500/20"
						}`}
						title="Анатомическое прикрепление уздечек губ и языка"
						data-testid="pediatric-ortho-frenulum-toggle"
					>
						<div className="min-w-0 pr-1">
							<div className="text-xs font-bold truncate">Уздечки губ и языка</div>
							<div className="text-[11px] opacity-80 truncate">
								{orthoFrenulumNormal ? "Норма прикрепления" : "Патология / укорочение"}
							</div>
						</div>
						{orthoFrenulumNormal ? (
							<Check className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" />
						) : (
							<span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-200 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
								Аномалия
							</span>
						)}
					</button>

					<button
						type="button"
						onClick={() => setOrthoNasalBreathing((prev) => !prev)}
						className={`flex min-h-[48px] items-center justify-between rounded-xl border px-3 py-2 text-left transition active:scale-[0.98] cursor-pointer touch-manipulation select-none ${
							orthoNasalBreathing
								? "border-teal-500 bg-teal-50/80 text-teal-950 dark:border-teal-400 dark:bg-teal-950/60 dark:text-teal-100 ring-1 ring-teal-500/20"
								: "border-amber-400 bg-amber-50/80 text-amber-950 dark:border-amber-400 dark:bg-amber-950/60 dark:text-amber-100 ring-1 ring-amber-500/20"
						}`}
						title="Тип дыхания ребенка (носовое / ротовое)"
						data-testid="pediatric-ortho-breathing-toggle"
					>
						<div className="min-w-0 pr-1">
							<div className="text-xs font-bold truncate">Носовое дыхание</div>
							<div className="text-[11px] opacity-80 truncate">
								{orthoNasalBreathing ? "Свободное через нос" : "Ротовое дыхание"}
							</div>
						</div>
						{orthoNasalBreathing ? (
							<Check className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" />
						) : (
							<span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-200 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
								Нарушено
							</span>
						)}
					</button>

					<button
						type="button"
						onClick={() => setOrthoNoHarmfulHabits((prev) => !prev)}
						className={`flex min-h-[48px] items-center justify-between rounded-xl border px-3 py-2 text-left transition active:scale-[0.98] cursor-pointer touch-manipulation select-none ${
							orthoNoHarmfulHabits
								? "border-teal-500 bg-teal-50/80 text-teal-950 dark:border-teal-400 dark:bg-teal-950/60 dark:text-teal-100 ring-1 ring-teal-500/20"
								: "border-amber-400 bg-amber-50/80 text-amber-950 dark:border-amber-400 dark:bg-amber-950/60 dark:text-amber-100 ring-1 ring-amber-500/20"
						}`}
						title="Вредные привычки: сосание пальца, соски, посторонних предметов"
						data-testid="pediatric-ortho-habits-toggle"
					>
						<div className="min-w-0 pr-1">
							<div className="text-xs font-bold truncate">Вредные привычки</div>
							<div className="text-[11px] opacity-80 truncate">
								{orthoNoHarmfulHabits ? "Отсутствуют (норма)" : "Выявлены (палец/соска)"}
							</div>
						</div>
						{orthoNoHarmfulHabits ? (
							<Check className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" />
						) : (
							<span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-200 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
								Выявлены
							</span>
						)}
					</button>
				</div>
			</div>
		</div>
	);
};
