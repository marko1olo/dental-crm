import React, { useState, useCallback } from "react";
import { Check, Sparkles } from "lucide-react";
import { showToast } from "../GlobalToast";
import type { FranklRating } from "../odontogram/pediatricDentitionEngine";
import {
	type PediatricVisitAdaptationTabProps,
	ADAPTATION_STAGES,
} from "./adaptation/adaptationStagesConstants";
import { PediatricAdaptationStagesBar } from "./adaptation/PediatricAdaptationStagesBar";
import { PediatricAdaptationActiveStage } from "./adaptation/PediatricAdaptationActiveStage";
import { FranklBehaviorBadge } from "./FranklBehaviorBadge";
import { PediatricBraveryDiplomaModal } from "./PediatricBraveryDiplomaModal";
import { PediatricTeethChart, type PediatricDentitionMode, type ToothClinicalFinding } from "./PediatricTeethChart";

export * from "./adaptation/adaptationStagesConstants";

export const PediatricVisitAdaptationTab: React.FC<PediatricVisitAdaptationTabProps> = ({
	patientName = "Юный пациент",
	patientAgeYears = 6,
	doctorName,
	clinicName,
	initialFranklRating = 3,
	onFranklChange,
	onApplyNorm,
	onCompleteAdaptation,
	className = "",
}) => {
	const [dentitionMode, setDentitionMode] = useState<PediatricDentitionMode>(
		patientAgeYears >= 6 && patientAgeYears <= 11 ? "mixed" : "primary",
	);
	const [activeTooth, setActiveTooth] = useState<number>(54);
	const [toothFindings, setToothFindings] = useState<Record<number, ToothClinicalFinding>>({});
	const [currentFrankl, setCurrentFrankl] = useState<FranklRating>(initialFranklRating);
	const [currentStep, setCurrentStep] = useState<number>(1);
	const [completedSteps, setCompletedSteps] = useState<number[]>([1]);
	const [isDiplomaOpen, setIsDiplomaOpen] = useState<boolean>(false);

	const handleFranklChange = useCallback((r: FranklRating) => {
		setCurrentFrankl(r);
		onFranklChange?.(r);
	}, [onFranklChange]);

	const handleNextStep = useCallback(() => {
		setCompletedSteps((prev) => (prev.includes(currentStep) ? prev : [...prev, currentStep]));
		if (currentStep < 5) setCurrentStep((prev) => prev + 1);
	}, [currentStep]);

	const handleComplete = useCallback(() => {
		const text = `Адаптационный прием проведен успешно (шагов выполнено: ${completedSteps.length}/5). Поведение ребенка по шкале Франкла: ${currentFrankl}/4. Контакт установлен.`;
		onCompleteAdaptation?.(text);
		showToast("Протокол адаптационного приёма успешно внесён в медицинскую карту", "success");
	}, [completedSteps.length, currentFrankl, onCompleteAdaptation]);

	return (
		<div
			className={`pediatric-adaptation-tab rounded-2xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] p-3 sm:p-4 space-y-3 ${className}`.trim()}
			data-testid="pediatric-visit-adaptation-tab"
		>
			<div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line,#e2e8f0)] pb-2.5">
				<div>
					<h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[var(--ink,#0f172a)]">
						Адаптационный приём и привыкание к лечению
					</h3>
					<p className="text-[11px] text-[var(--muted,#64748b)] font-medium">
						Пациент: {patientName} ({patientAgeYears} лет) &bull; Бестравматичный протокол Tell-Show-Do
					</p>
				</div>
				<FranklBehaviorBadge rating={currentFrankl} onChange={handleFranklChange} toolbar />
			</div>

			<PediatricAdaptationStagesBar currentStep={currentStep} completedSteps={completedSteps} onSelectStep={setCurrentStep} />
			<PediatricAdaptationActiveStage currentStep={currentStep} onNextStep={handleNextStep} onOpenDiploma={() => setIsDiplomaOpen(true)} />

			<PediatricTeethChart
				activeTooth={activeTooth}
				onSelectTooth={setActiveTooth}
				mode={dentitionMode}
				onModeChange={setDentitionMode}
				toothFindings={toothFindings}
				onToothFindingChange={(t, f) => setToothFindings((prev) => ({ ...prev, [t]: f }))}
			/>

			<div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--line,#e2e8f0)]">
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => onApplyNorm?.("Физиологическая норма прикуса (Мандат 8e)")}
						className="min-h-[44px] sm:min-h-[36px] px-3.5 rounded-xl border border-teal-300 bg-teal-50 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
						data-testid="btn-adaptation-1click-norm"
					>
						<Check className="h-4 w-4 text-teal-600" />
						<span>Норма прикуса (Мандат 8e)</span>
					</button>
					<button
						type="button"
						onClick={() => setIsDiplomaOpen(true)}
						className="min-h-[44px] sm:min-h-[36px] px-3.5 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
						data-testid="btn-adaptation-open-diploma"
					>
						<Sparkles className="h-4 w-4 text-amber-600" />
						<span>Грамота за смелость</span>
					</button>
				</div>
				<button type="button" onClick={handleComplete} className="min-h-[44px] sm:min-h-[36px] px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer shadow-xs" data-testid="btn-complete-pediatric-adaptation">
					<Check className="h-4 w-4" />
					<span>Завершить адаптацию и внести в карту</span>
				</button>
			</div>

			<PediatricBraveryDiplomaModal isOpen={isDiplomaOpen} onClose={() => setIsDiplomaOpen(false)} patientName={patientName} patientAgeYears={patientAgeYears} doctorName={doctorName} clinicName={clinicName} />
		</div>
	);
};

export default PediatricVisitAdaptationTab;
