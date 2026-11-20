import React, { useMemo, useState } from "react";
import { Check, Clock, ShieldCheck, Sparkles } from "lucide-react";
import {
	ALL_PRIMARY_TEETH,
	calculateEruptionTimelineByAge,
	LOWER_PRIMARY_TEETH,
	PRIMARY_TO_PERMANENT_SUCCESSOR_MAP,
	RESORPTION_AGE_PRESETS,
	RESORPTION_STAGE_DEFINITIONS,
	RESORPTION_STAGES,
	type ResorptionStagePercent,
	UPPER_PRIMARY_TEETH,
} from "@dental/shared";
import { showToast } from "../GlobalToast";

export interface PediatricResorptionTabProps {
	readonly selectedPrimaryTooth: number;
	readonly onSelectPrimaryTooth: (tooth: number) => void;
	readonly selectedResorptionStage: ResorptionStagePercent;
	readonly onSelectResorptionStage: (stage: ResorptionStagePercent) => void;
	readonly onUpdateToothResorption?: ((toothNumber: number, stage: ResorptionStagePercent) => void) | undefined;
	readonly onBatchUpdateResorption?: ((updates: { toothNumber: number; resorptionStage: ResorptionStagePercent }[]) => void) | undefined;
	readonly patientAgeYears?: number | undefined;
	readonly onAgeChange?: ((age: number) => void) | undefined;
}

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
	const [localAge, setLocalAge] = useState<number>(patientAgeYears ?? 6.0);
	const currentAge = patientAgeYears ?? localAge;

	const handleAgeChange = (newAge: number) => {
		setLocalAge(newAge);
		onAgeChange?.(newAge);
	};

	const timelineAnalysis = useMemo(() => calculateEruptionTimelineByAge(currentAge), [currentAge]);

	const physiologicalResorptionMap = useMemo(() => {
		const map = new Map<number, ResorptionStagePercent>();
		for (const st of timelineAnalysis.toothStatuses) {
			if (st.predecessorPrimaryFdi !== undefined) {
				map.set(st.predecessorPrimaryFdi, st.expectedResorptionPercent);
			}
		}
		return map;
	}, [timelineAnalysis]);

	const expectedForSelected = physiologicalResorptionMap.get(selectedPrimaryTooth) ?? 0;

	const handleStageClick = (stage: ResorptionStagePercent) => {
		onSelectResorptionStage(stage);
		onUpdateToothResorption?.(selectedPrimaryTooth, stage);
	};

	const handleApplyCurrent = () => {
		if (onUpdateToothResorption) {
			onUpdateToothResorption(selectedPrimaryTooth, selectedResorptionStage);
			showToast(`Резорбция ${selectedResorptionStage}% применена к зубу ${selectedPrimaryTooth}`, "success", 2500);
		}
	};

	const handleApplyPhysiologicalNorm = () => {
		const updates = ALL_PRIMARY_TEETH.map((tooth) => ({
			toothNumber: tooth,
			resorptionStage: physiologicalResorptionMap.get(tooth) ?? 0,
		}));
		if (onBatchUpdateResorption) onBatchUpdateResorption(updates);
		else if (onUpdateToothResorption) updates.forEach((u) => onUpdateToothResorption(u.toothNumber, u.resorptionStage));
		showToast(`Физиологическая резорбция корней (${currentAge.toFixed(1)} лет) установлена в норму!`, "success", 3500);
	};

	const handleApplyAllZero = () => {
		const updates = ALL_PRIMARY_TEETH.map((tooth) => ({ toothNumber: tooth, resorptionStage: 0 as ResorptionStagePercent }));
		if (onBatchUpdateResorption) onBatchUpdateResorption(updates);
		else if (onUpdateToothResorption) updates.forEach((u) => onUpdateToothResorption(u.toothNumber, u.resorptionStage));
		showToast("Резорбция 0% (интактные корни) применена ко всем молочным зубам", "info", 3000);
	};

	const handleApplyExpectedForSelected = () => {
		onSelectResorptionStage(expectedForSelected);
		onUpdateToothResorption?.(selectedPrimaryTooth, expectedForSelected);
		showToast(`Зуб ${selectedPrimaryTooth}: норма резорбции ${expectedForSelected}%`, "success", 2500);
	};

	const renderTeethRow = (teeth: readonly number[]) => (
		<div className="flex flex-wrap gap-2 sm:gap-2.5">
			{teeth.map((num) => {
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
								? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-md shadow-[var(--primary)]/30 scale-105"
								: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--primary)] hover:bg-[var(--paper-soft)]"
						}`}
					>
						<div className="flex items-center gap-1 leading-none">
							<span className="text-sm sm:text-base font-black">{num}</span>
							<span className="text-[10px] font-sans opacity-75 font-semibold">
								→{PRIMARY_TO_PERMANENT_SUCCESSOR_MAP[num]}
							</span>
						</div>
						<span
							className={`text-[10px] font-sans font-bold px-1.5 py-0.5 rounded-md mt-0.5 leading-none ${isSelected ? "bg-white/20 text-white" : ""}`}
							style={!isSelected ? { backgroundColor: stageDef.badgeBg, color: stageDef.badgeColor } : undefined}
							title={`Физиологическая резорбция в ${currentAge.toFixed(1)} лет: ${expectedStage}%`}
						>
							{expectedStage}%
						</span>
					</button>
				);
			})}
		</div>
	);

	return (
		<div className="space-y-6 animate-in fade-in duration-200">
			{/* 1. Header with Age Presets */}
			<div className="p-4 sm:p-6 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-4">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
					<div>
						<h3 className="text-sm sm:text-base font-bold text-[var(--ink)]">
							Клиническая шкала физиологической резорбции корней молочных зубов
						</h3>
						<p className="text-xs sm:text-sm text-[var(--ink-muted)] leading-relaxed font-medium mt-0.5">
							Оценка степени рассасывания корней под давлением зачатка постоянного зуба (пресет нормы по возрасту).
						</p>
					</div>

					<div className="inline-flex items-center gap-2 min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[var(--paper)] text-[var(--primary)] border border-[var(--line)] text-xs sm:text-sm font-bold shrink-0">
						<Clock className="w-4 h-4 shrink-0 text-[var(--primary)]" />
						<span>Возраст: {currentAge.toFixed(1)} лет ({timelineAnalysis.stageNameRu})</span>
					</div>
				</div>

				<div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[var(--line)]">
					<span className="text-xs sm:text-sm font-bold text-[var(--ink-muted)] mr-1">
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
								className={`min-h-[44px] sm:min-h-[32px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer select-none active:scale-95 flex items-center gap-1.5 ${
									isSelected
										? "bg-[var(--primary)] text-white font-black border-[var(--primary)] shadow-sm shadow-[var(--primary)]/30 ring-2 ring-[var(--primary)]/20"
										: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--primary)] hover:bg-[var(--paper-soft)]"
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

			{/* 2. Actions: 1-Click Physiological Norm */}
			<div className="p-4 sm:p-5 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-3">
				<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
					<div className="space-y-1">
						<div className="flex items-center gap-2 text-[var(--ink)] font-bold text-sm sm:text-base">
							<Sparkles className="w-5 h-5 text-[var(--primary)] shrink-0" />
							<span>Физиологическая резорбция корней</span>
						</div>
						<p className="text-xs sm:text-sm text-[var(--ink-muted)] font-medium">
							Автоматическая установка клинической нормы рассасывания корней для всех 20 молочных зубов по возрасту ({currentAge.toFixed(1)} лет).
						</p>
					</div>

					<div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
						<button
							type="button"
							onClick={handleApplyPhysiologicalNorm}
							className="dente-btn dente-btn-secondary min-h-[44px] h-10 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2 select-none"
						>
							<Sparkles className="w-4 h-4 shrink-0 text-[var(--primary)]" />
							<span>Физиологическая норма ({currentAge.toFixed(1)} лет)</span>
						</button>

						<button
							type="button"
							onClick={handleApplyAllZero}
							className="dente-btn dente-btn-secondary min-h-[44px] h-10 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 select-none"
							title="Установить 0% для всех 20 зубов (интактные корни)"
						>
							<ShieldCheck className="w-4 h-4 text-[var(--primary)] shrink-0" />
							<span>Все 0% (Интактные)</span>
						</button>
					</div>
				</div>
			</div>

			{/* 3. Stages Grid */}
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
									? "border-[var(--primary)] bg-[var(--primary)]/10 shadow-md shadow-[var(--primary)]/10 ring-2 ring-[var(--primary)]/20"
									: "border-[var(--line)] bg-[var(--paper)] hover:border-[var(--primary)] hover:bg-[var(--paper-soft)]"
							}`}
						>
							<div className="flex items-center justify-between w-full">
								<span
									className="min-h-[28px] min-w-[44px] inline-flex items-center justify-center px-3 py-1 rounded-xl text-xs sm:text-sm font-black"
									style={{ backgroundColor: def.badgeBg, color: def.badgeColor }}
								>
									{stage}%
								</span>
								<span className="text-xs sm:text-sm font-bold text-[var(--ink-muted)]">
									{def.expectedMobilityDegree} ст.
								</span>
							</div>

							<div className="my-2 space-y-1">
								<div className="text-sm font-bold text-[var(--ink)] leading-snug">
									{def.nameRu}
								</div>
								<div className="text-xs sm:text-sm text-[var(--ink-muted)] line-clamp-2 font-medium">
									{def.clinicalSignRu}
								</div>
							</div>

							<div className="text-xs sm:text-sm font-mono font-bold text-[var(--primary)] flex items-center gap-1.5 pt-1">
								{isSelected ? <Check className="w-4 h-4 shrink-0" /> : null}
								<span>{isSelected ? "Выбрано" : "Выбрать"}</span>
							</div>
						</button>
					);
				})}
			</div>

			{/* 4. Primary Teeth Grid */}
			<div className="p-4 sm:p-6 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-4">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
					<div>
						<h4 className="text-xs sm:text-sm font-semibold text-[var(--ink-muted)]">
							Выберите молочный зуб для применения резорбции
						</h4>
						<p className="text-xs sm:text-sm text-[var(--ink-muted)] font-medium mt-0.5">
							Выбранный: <strong className="text-[var(--primary)] font-mono text-sm sm:text-base font-black">Зуб {selectedPrimaryTooth}</strong> (преемник: постоянный {PRIMARY_TO_PERMANENT_SUCCESSOR_MAP[selectedPrimaryTooth] ?? "—"}) • Норма ({currentAge.toFixed(1)} лет): <span className="font-bold text-[var(--primary)]">{expectedForSelected}%</span>
						</p>
					</div>
					<div className="flex flex-wrap items-center gap-2 shrink-0">
						<button
							type="button"
							onClick={handleApplyExpectedForSelected}
							className="dente-btn dente-btn-secondary min-h-[44px] sm:min-h-[36px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 select-none"
						>
							<Sparkles className="w-4 h-4 shrink-0 text-[var(--primary)]" />
							<span>Норма ({expectedForSelected}%) к зубу {selectedPrimaryTooth}</span>
						</button>
						{Boolean(onUpdateToothResorption) && (
							<button
								type="button"
								onClick={handleApplyCurrent}
								className="dente-btn dente-btn-primary bg-[var(--primary)] text-white hover:bg-[var(--primary-strong)] min-h-[44px] sm:min-h-[36px] px-5 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-[var(--primary)]/20 transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2 shrink-0 select-none"
							>
								<Check className="w-4 h-4 shrink-0" />
								<span>Применить {selectedResorptionStage}% к зубу {selectedPrimaryTooth}</span>
							</button>
						)}
					</div>
				</div>
				<div className="space-y-2">
					<div className="text-xs sm:text-sm font-semibold text-[var(--ink-muted)]">Верхний молочный ряд (55–65):</div>
					{renderTeethRow(UPPER_PRIMARY_TEETH)}
				</div>
				<div className="space-y-2">
					<div className="text-xs sm:text-sm font-semibold text-[var(--ink-muted)]">Нижний молочный ряд (85–75):</div>
					{renderTeethRow(LOWER_PRIMARY_TEETH)}
				</div>
			</div>
		</div>
	);
};
