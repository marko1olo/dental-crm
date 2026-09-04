import React, { useMemo, useState } from "react";
import { Check, Clock, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import {
	ALL_PRIMARY_TEETH,
	calculateEruptionTimelineByAge,
	PRIMARY_TO_PERMANENT_SUCCESSOR_MAP,
	RESORPTION_STAGE_DEFINITIONS,
	type ResorptionStagePercent,
} from "./pediatricDentitionEngine";
import { showToast } from "../GlobalToast";

export interface PediatricResorptionTabProps {
	selectedPrimaryTooth: number;
	onSelectPrimaryTooth: (tooth: number) => void;
	selectedResorptionStage: ResorptionStagePercent;
	onSelectResorptionStage: (stage: ResorptionStagePercent) => void;
	onUpdateToothResorption?: ((toothNumber: number, stage: ResorptionStagePercent) => void) | undefined;
	onBatchUpdateResorption?: ((updates: { toothNumber: number; resorptionStage: ResorptionStagePercent }[]) => void) | undefined;
	patientAgeYears?: number | undefined;
	onAgeChange?: ((age: number) => void) | undefined;
}

const UPPER_PRIMARY_TEETH = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65] as const;
const LOWER_PRIMARY_TEETH = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75] as const;
const RESORPTION_STAGES: readonly ResorptionStagePercent[] = [0, 25, 50, 75, 100];

interface ResorptionAgePreset {
	readonly id: string;
	readonly label: string;
	readonly ageRange: string;
	readonly targetAge: number;
	readonly descriptionRu: string;
}

const RESORPTION_AGE_PRESETS: readonly ResorptionAgePreset[] = [
	{
		id: "primary",
		label: "Временный прикус",
		ageRange: "3–5 лет",
		targetAge: 4.5,
		descriptionRu: "Интактные корни (0% резорбция), все 20 молочных зубов интактны",
	},
	{
		id: "early_mixed",
		label: "Ранний сменный",
		ageRange: "6–8 лет",
		targetAge: 7.0,
		descriptionRu: "Резорбция резцов (50–75%), моляры интактны или начальная (0–25%)",
	},
	{
		id: "late_mixed",
		label: "Поздний сменный",
		ageRange: "9–12 лет",
		targetAge: 10.5,
		descriptionRu: "Резорбция клыков и премоляров (50–75%), резцы уже сменились",
	},
];

export const PediatricResorptionTab: React.FC<PediatricResorptionTabProps> = ({
	selectedPrimaryTooth,
	onSelectPrimaryTooth,
	selectedResorptionStage,
	onSelectResorptionStage,
	onUpdateToothResorption,
	onBatchUpdateResorption,
	patientAgeYears,
	onAgeChange,
}) => {
	const [localAge, setLocalAge] = useState<number>(patientAgeYears ?? 7.5);
	const currentAge = patientAgeYears ?? localAge;

	const handleAgeChange = (newAge: number) => {
		setLocalAge(newAge);
		if (onAgeChange) {
			onAgeChange(newAge);
		}
	};

	// Calculate physiological timeline based on current age
	const timelineAnalysis = useMemo(
		() => calculateEruptionTimelineByAge(currentAge),
		[currentAge],
	);

	// Map of tooth number -> expected physiological resorption percent
	const physiologicalResorptionMap = useMemo(() => {
		const map = new Map<number, ResorptionStagePercent>();
		for (const st of timelineAnalysis.toothStatuses) {
			const predFdi = st.predecessorPrimaryFdi;
			if (predFdi !== undefined) {
				map.set(predFdi, st.expectedResorptionPercent);
			}
		}
		return map;
	}, [timelineAnalysis]);

	const expectedForSelected = physiologicalResorptionMap.get(selectedPrimaryTooth) ?? 0;

	const handleStageClick = (stage: ResorptionStagePercent) => {
		onSelectResorptionStage(stage);
		if (onUpdateToothResorption) {
			onUpdateToothResorption(selectedPrimaryTooth, stage);
		}
	};

	const handleApplyCurrent = () => {
		if (onUpdateToothResorption) {
			onUpdateToothResorption(selectedPrimaryTooth, selectedResorptionStage);
			showToast(
				`Резорбция ${selectedResorptionStage}% применена к зубу ${selectedPrimaryTooth}`,
				"success",
				2500,
			);
		}
	};

	// 1-Click: Apply physiological resorption for ALL 20 primary teeth based on current age
	const handleApplyPhysiologicalNorm = () => {
		const updates: { toothNumber: number; resorptionStage: ResorptionStagePercent }[] = [];
		for (const tooth of ALL_PRIMARY_TEETH) {
			const expectedStage = physiologicalResorptionMap.get(tooth) ?? 0;
			updates.push({ toothNumber: tooth, resorptionStage: expectedStage });
		}

		if (onBatchUpdateResorption) {
			onBatchUpdateResorption(updates);
		} else if (onUpdateToothResorption) {
			for (const u of updates) {
				onUpdateToothResorption(u.toothNumber, u.resorptionStage);
			}
		}

		showToast(
			`Физиологическая резорбция корней (${currentAge.toFixed(1)} лет) установлена в норму для всех 20 молочных зубов!`,
			"success",
			3500,
		);
	};

	// 1-Click: Set 0% resorption (intact roots) for ALL 20 primary teeth (временный прикус)
	const handleApplyAllZero = () => {
		const updates: { toothNumber: number; resorptionStage: ResorptionStagePercent }[] =
			ALL_PRIMARY_TEETH.map((tooth) => ({ toothNumber: tooth, resorptionStage: 0 }));

		if (onBatchUpdateResorption) {
			onBatchUpdateResorption(updates);
		} else if (onUpdateToothResorption) {
			for (const u of updates) {
				onUpdateToothResorption(u.toothNumber, u.resorptionStage);
			}
		}

		showToast(
			"Резорбция 0% (интактные корни) применена ко всем 20 молочным зубам",
			"info",
			3000,
		);
	};

	// 1-Click: Apply expected physiological resorption to the SELECTED tooth
	const handleApplyExpectedForSelected = () => {
		onSelectResorptionStage(expectedForSelected);
		if (onUpdateToothResorption) {
			onUpdateToothResorption(selectedPrimaryTooth, expectedForSelected);
		}
		showToast(
			`Зуб ${selectedPrimaryTooth}: установлена физиологическая норма резорбции ${expectedForSelected}%`,
			"success",
			2500,
		);
	};

	return (
		<div className="space-y-6 animate-in fade-in duration-200">
			{/* Top Header Card with Age Switcher */}
			<div className="p-4 sm:p-6 rounded-2xl bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))] dark:bg-slate-950/70 border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] dark:border-slate-800 space-y-4">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
					<div>
						<h3 className="text-sm sm:text-base font-black text-[var(--odontogram-ink,var(--ink,#0f172a))] dark:text-slate-100">
							Клиническая шкала физиологической резорбции корней молочных зубов
						</h3>
						<p className="text-xs sm:text-sm text-[var(--odontogram-ink-muted,var(--muted,#64748b))] dark:text-slate-400 leading-relaxed font-medium mt-0.5">
							Оценка степени рассасывания корней под давлением зачатка постоянного зуба (Мандат 8k &amp; 8e: 1-клик пресет нормы по возрасту).
						</p>
					</div>

					<div className="inline-flex items-center gap-2 min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[var(--teal-surface,rgba(20,184,166,0.12))] text-[var(--teal,#0d9488)] dark:text-teal-400 border border-[var(--teal-glow,rgba(20,184,166,0.25))] text-xs sm:text-sm font-bold shrink-0">
						<Clock className="w-4 h-4 shrink-0" />
						<span>Возраст: {currentAge.toFixed(1)} лет ({timelineAnalysis.stageNameRu})</span>
					</div>
				</div>

				{/* Quick Age Presets Bar */}
				<div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] dark:border-slate-800/80">
					<span className="text-xs sm:text-sm font-bold text-[var(--odontogram-ink-muted,var(--muted,#64748b))] dark:text-slate-400 mr-1">
						Возрастной ориентир:
					</span>
					{RESORPTION_AGE_PRESETS.map((preset) => {
						const isSelected =
							(preset.id === "primary" && currentAge < 5.8) ||
							(preset.id === "early_mixed" && currentAge >= 5.8 && currentAge < 8.5) ||
							(preset.id === "late_mixed" && currentAge >= 8.5);
						return (
							<button
								key={preset.id}
								type="button"
								onClick={() => handleAgeChange(preset.targetAge)}
								className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer select-none active:scale-95 flex items-center gap-1.5 ${
									isSelected
										? "bg-teal-600 dark:bg-teal-600 text-white font-black border-teal-600 shadow-sm shadow-teal-600/30 ring-2 ring-teal-500/20"
										: "bg-[var(--odontogram-paper,var(--paper,#ffffff))] dark:bg-slate-800 text-[var(--odontogram-ink,var(--ink,#0f172a))] dark:text-slate-200 border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] dark:border-slate-700 hover:border-teal-400 hover:bg-[var(--odontogram-surface-hover,var(--paper-strong,#f1f5f9))] dark:hover:bg-slate-700"
								}`}
								title={preset.descriptionRu}
							>
								<span>{preset.label}</span>
								<span className="opacity-80 font-normal">({preset.ageRange})</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* 1-Click Physiological Resorption Actions Bar */}
			<div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-teal-500/5 dark:from-teal-950/30 dark:via-emerald-950/20 dark:to-slate-900 border border-teal-500/30 dark:border-teal-600/30 space-y-3">
				<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
					<div className="space-y-1">
						<div className="flex items-center gap-2 text-teal-700 dark:text-teal-300 font-black text-sm sm:text-base">
							<Sparkles className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" />
							<span>Физиологическая резорбция корней в 1 клик</span>
						</div>
						<p className="text-xs sm:text-sm text-[var(--odontogram-ink-muted,var(--muted,#64748b))] dark:text-slate-300 font-medium">
							Автоматическая установка клинической нормы рассасывания корней для всех 20 молочных зубов по возрасту пациента ({currentAge.toFixed(1)} лет) без ручного кликанья по каждому зубу.
						</p>
					</div>

					{/* 1-Click Action Buttons */}
					<div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
						<button
							type="button"
							onClick={handleApplyPhysiologicalNorm}
							className="min-h-[48px] px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white text-xs sm:text-sm font-black shadow-md shadow-teal-600/20 transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2 select-none"
						>
							<Sparkles className="w-4 h-4 shrink-0" />
							<span>Физиологическая резорбция в норме ({currentAge.toFixed(1)} лет)</span>
						</button>

						<button
							type="button"
							onClick={handleApplyAllZero}
							className="min-h-[48px] px-4 py-2.5 rounded-xl bg-[var(--odontogram-paper,var(--paper,#ffffff))] dark:bg-slate-800 text-[var(--odontogram-ink,var(--ink,#0f172a))] dark:text-slate-200 hover:bg-[var(--odontogram-surface-hover,var(--paper-strong,#f1f5f9))] dark:hover:bg-slate-700 border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] dark:border-slate-700 text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 select-none"
							title="Установить 0% для всех 20 зубов (интактные корни)"
						>
							<ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
							<span>Все 0% (Интактные)</span>
						</button>
					</div>
				</div>
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
							className={`min-h-[120px] p-4 rounded-2xl border-2 flex flex-col justify-between text-left transition-all cursor-pointer select-none active:scale-[0.98] ${
								isSelected
									? "border-teal-600 bg-teal-500/15 shadow-lg shadow-teal-500/10 ring-2 ring-teal-500/30"
									: "border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] dark:border-slate-800 bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))] dark:bg-slate-900 hover:border-teal-400 hover:bg-[var(--odontogram-surface-hover,var(--paper-strong,#f1f5f9))] dark:hover:bg-slate-800/80"
							}`}
						>
							<div className="flex items-center justify-between w-full">
								<span
									className="min-h-[28px] min-w-[44px] inline-flex items-center justify-center px-3 py-1 rounded-xl text-xs sm:text-sm font-black"
									style={{ backgroundColor: def.badgeBg, color: def.badgeColor }}
								>
									{stage}%
								</span>
								<span className="text-xs sm:text-sm font-bold text-[var(--odontogram-ink-muted,var(--muted,#64748b))] dark:text-slate-400">
									{def.expectedMobilityDegree} ст.
								</span>
							</div>

							<div className="my-2 space-y-1">
								<div className="text-sm font-black text-[var(--odontogram-ink,var(--ink,#0f172a))] dark:text-slate-100 leading-snug">
									{def.nameRu}
								</div>
								<div className="text-xs sm:text-sm text-[var(--odontogram-ink-muted,var(--muted,#64748b))] dark:text-slate-400 line-clamp-2 font-medium">
									{def.clinicalSignRu}
								</div>
							</div>

							<div className="text-xs sm:text-sm font-mono font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1.5 pt-1">
								{isSelected ? <Check className="w-4 h-4 shrink-0" /> : null}
								<span>{isSelected ? "Выбрано" : "Выбрать"}</span>
							</div>
						</button>
					);
				})}
			</div>

			{/* Primary Teeth Tactile Grid Selector */}
			<div className="p-4 sm:p-6 rounded-2xl bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))] dark:bg-slate-950/70 border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] dark:border-slate-800 space-y-4">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
					<div>
						<h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[var(--odontogram-ink-muted,var(--muted,#64748b))] dark:text-slate-400">
							Выберите молочный зуб для применения резорбции
						</h4>
						<p className="text-xs sm:text-sm text-[var(--odontogram-ink-muted,var(--muted,#64748b))] dark:text-slate-300 font-medium mt-0.5">
							Выбранный:{" "}
							<strong className="text-teal-600 dark:text-teal-400 font-mono text-sm sm:text-base font-black">
								Зуб {selectedPrimaryTooth}
							</strong>{" "}
							(преемник: постоянный {PRIMARY_TO_PERMANENT_SUCCESSOR_MAP[selectedPrimaryTooth] ?? "—"}) • Физиологическая норма ({currentAge.toFixed(1)} лет):{" "}
							<span className="font-bold text-teal-700 dark:text-teal-300">{expectedForSelected}%</span>
						</p>
					</div>

					<div className="flex flex-wrap items-center gap-2 shrink-0">
						{/* Set expected physiological norm for selected tooth */}
						<button
							type="button"
							onClick={handleApplyExpectedForSelected}
							className="min-h-[44px] px-4 py-2 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/50 border border-teal-300 dark:border-teal-700 text-xs sm:text-sm font-bold transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 select-none"
						>
							<Sparkles className="w-4 h-4 shrink-0 text-teal-600 dark:text-teal-400" />
							<span>Норма ({expectedForSelected}%) к зубу {selectedPrimaryTooth}</span>
						</button>

						{/* Apply currently selected manual stage */}
						{onUpdateToothResorption && (
							<button
								type="button"
								onClick={handleApplyCurrent}
								className="min-h-[44px] px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white text-xs sm:text-sm font-black shadow-md shadow-teal-600/20 transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2 shrink-0 select-none"
							>
								<Check className="w-4 h-4 shrink-0" />
								<span>Применить {selectedResorptionStage}% к зубу {selectedPrimaryTooth}</span>
							</button>
						)}
					</div>
				</div>

				{/* Upper Arch Teeth Buttons (55–65) */}
				<div className="space-y-2">
					<div className="text-xs sm:text-sm font-bold text-[var(--odontogram-ink-muted,var(--muted,#64748b))] dark:text-slate-400">
						Верхний молочный ряд (55–65):
					</div>
					<div className="flex flex-wrap gap-2 sm:gap-2.5">
						{UPPER_PRIMARY_TEETH.map((num) => {
							const isSelected = selectedPrimaryTooth === num;
							const expectedStage = physiologicalResorptionMap.get(num) ?? 0;
							const stageDef = RESORPTION_STAGE_DEFINITIONS[expectedStage];
							return (
								<button
									key={num}
									type="button"
									onClick={() => onSelectPrimaryTooth(num)}
									className={`min-w-[56px] min-h-[50px] px-2.5 py-1.5 rounded-xl text-sm font-mono font-black border transition-all cursor-pointer active:scale-95 flex flex-col items-center justify-center select-none ${
										isSelected
											? "bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-600/30 scale-105"
											: "bg-[var(--odontogram-paper,var(--paper,#ffffff))] dark:bg-slate-800 text-[var(--odontogram-ink,var(--ink,#0f172a))] dark:text-slate-200 border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] dark:border-slate-700 hover:border-teal-400 hover:bg-[var(--odontogram-surface-hover,var(--paper-strong,#f1f5f9))] dark:hover:bg-slate-700"
									}`}
								>
									<div className="flex items-center gap-1 leading-none">
										<span className="text-sm sm:text-base font-black">{num}</span>
										<span className="text-[10px] font-sans opacity-75 font-semibold">
											→{PRIMARY_TO_PERMANENT_SUCCESSOR_MAP[num]}
										</span>
									</div>
									<span
										className={`text-[10px] font-sans font-bold px-1.5 py-0.5 rounded-md mt-0.5 leading-none ${
											isSelected ? "bg-white/20 text-white" : ""
										}`}
										style={!isSelected ? { backgroundColor: stageDef.badgeBg, color: stageDef.badgeColor } : undefined}
										title={`Физиологическая резорбция в ${currentAge.toFixed(1)} лет: ${expectedStage}%`}
									>
										{expectedStage}%
									</span>
								</button>
							);
						})}
					</div>
				</div>

				{/* Lower Arch Teeth Buttons (85–75) */}
				<div className="space-y-2">
					<div className="text-xs sm:text-sm font-bold text-[var(--odontogram-ink-muted,var(--muted,#64748b))] dark:text-slate-400">
						Нижний молочный ряд (85–75):
					</div>
					<div className="flex flex-wrap gap-2 sm:gap-2.5">
						{LOWER_PRIMARY_TEETH.map((num) => {
							const isSelected = selectedPrimaryTooth === num;
							const expectedStage = physiologicalResorptionMap.get(num) ?? 0;
							const stageDef = RESORPTION_STAGE_DEFINITIONS[expectedStage];
							return (
								<button
									key={num}
									type="button"
									onClick={() => onSelectPrimaryTooth(num)}
									className={`min-w-[56px] min-h-[50px] px-2.5 py-1.5 rounded-xl text-sm font-mono font-black border transition-all cursor-pointer active:scale-95 flex flex-col items-center justify-center select-none ${
										isSelected
											? "bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-600/30 scale-105"
											: "bg-[var(--odontogram-paper,var(--paper,#ffffff))] dark:bg-slate-800 text-[var(--odontogram-ink,var(--ink,#0f172a))] dark:text-slate-200 border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] dark:border-slate-700 hover:border-teal-400 hover:bg-[var(--odontogram-surface-hover,var(--paper-strong,#f1f5f9))] dark:hover:bg-slate-700"
									}`}
								>
									<div className="flex items-center gap-1 leading-none">
										<span className="text-sm sm:text-base font-black">{num}</span>
										<span className="text-[10px] font-sans opacity-75 font-semibold">
											→{PRIMARY_TO_PERMANENT_SUCCESSOR_MAP[num]}
										</span>
									</div>
									<span
										className={`text-[10px] font-sans font-bold px-1.5 py-0.5 rounded-md mt-0.5 leading-none ${
											isSelected ? "bg-white/20 text-white" : ""
										}`}
										style={!isSelected ? { backgroundColor: stageDef.badgeBg, color: stageDef.badgeColor } : undefined}
										title={`Физиологическая резорбция в ${currentAge.toFixed(1)} лет: ${expectedStage}%`}
									>
										{expectedStage}%
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
