import React, { useState, useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  Brain,
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  Save,
  Search,
  ShieldAlert,
  Sparkles,
  XCircle,
} from "lucide-react";
import type { ReactStepItem } from "../copilotTypes";
import type { CopilotReactTrackerProps } from "./types";

export const DEFAULT_DENTE_REACT_STEPS: ReactStepItem[] = [
	{
		id: "step_patient_anamnesis",
		stepNumber: 1,
		title: "Поиск карты пациента и анамнеза (allergies, pregnancy)...",
		status: "done",
		detail: "Пациент идентифицирован • Аллергоанамнез проверен",
		icon: "search",
	},
	{
		id: "step_xray_tooth_36",
		stepNumber: 2,
		title: "Анализ прицельного снимка зуба 36 (глубокий кариес K02.1)...",
		status: "done",
		detail: "Зуб 36 FDI • Кариес дентина K02.1 MOD",
		icon: "xray",
	},
	{
		id: "step_ddi_safety",
		stepNumber: 3,
		title: "Проверка лекарственной безопасности DDI...",
		status: "done",
		detail: "Совместимо • Противопоказания исключены (DDI Safe)",
		icon: "shield",
	},
	{
		id: "step_treatment_tiers",
		stepNumber: 4,
		title:
			"Формирование 3-уровневого плана лечения (Эконом / Оптимум / Премиум)...",
		status: "done",
		detail: "3 тарифа рассчитаны по прейскуранту (без НДС)",
		icon: "plan",
	},
];

export const CopilotReactTracker: React.FC<CopilotReactTrackerProps> = ({
	title = "ReAct Цикл ДЕНТЫ: Автономное выполнение",
	steps = DEFAULT_DENTE_REACT_STEPS,
	currentStepIndex,
	isComplete,
	totalDurationMs,
	onStepClick,
}) => {
	const [expanded, setExpanded] = useState<boolean>(true);

	const completedCount = useMemo(() => {
		return steps.filter((s) => s.status === "done").length;
	}, [steps]);

	const activeIndex = useMemo(() => {
		if (typeof currentStepIndex === "number") return currentStepIndex;
		const runningIdx = steps.findIndex((s) => s.status === "running");
		if (runningIdx >= 0) return runningIdx;
		if (isComplete || completedCount === steps.length) return steps.length;
		return completedCount;
	}, [currentStepIndex, steps, isComplete, completedCount]);

	const allDone = isComplete || completedCount === steps.length;
	const progressPercent = Math.round(
		(completedCount / (steps.length || 1)) * 100,
	);

	const getStepIcon = (step: ReactStepItem) => {
		if (step.status === "running") {
			return (
				<Loader2
					size={16}
					className="copilot-rt-step-icon running animate-spin"
				/>
			);
		}
		if (step.status === "done") {
			return (
				<CheckCircle2
					size={16}
					className="copilot-rt-step-icon done text-[var(--teal)]"
				/>
			);
		}
		if (step.status === "failed") {
			return (
				<AlertTriangle
					size={16}
					className="copilot-rt-step-icon failed text-[var(--rust)]"
				/>
			);
		}
		return (
			<Clock
				size={16}
				className="copilot-rt-step-icon pending text-[var(--muted)]"
			/>
		);
	};

	return (
		<div
			className={`copilot-gen-card copilot-react-tracker ${allDone ? "all-done" : "running"}`}
			data-testid="copilot-react-tracker"
			role="region"
			aria-label="Живой пошаговый ReAct трекер ДЕНТЫ"
		>
			{/* Header with Title and Progress */}
			<div
				className="copilot-rt-header"
				onClick={() => setExpanded((prev) => !prev)}
				role="button"
				tabIndex={0}
				aria-expanded={expanded}
			>
				<div className="copilot-rt-title-block">
					<div className="copilot-rt-badge" aria-hidden="true">
						{allDone ? (
							<CheckCircle2 size={18} />
						) : (
							<Brain size={18} className="animate-pulse" />
						)}
					</div>
					<div>
						<h4 className="copilot-rt-title">{title}</h4>
						<div className="copilot-rt-subtitle">
							{allDone
								? "Все шаги клинического рассуждения успешно завершены"
								: `Выполняется шаг ${Math.min(activeIndex + 1, steps.length)} из ${steps.length}...`}
						</div>
					</div>
				</div>

				<div className="copilot-rt-status-box">
					<span
						className={`copilot-rt-status-pill ${allDone ? "done" : "active"}`}
					>
						{allDone
							? "Завершено (4/4)"
							: `Шаг ${Math.min(activeIndex + 1, steps.length)}/${steps.length}`}
					</span>
				</div>
			</div>

			{/* Progress Track */}
			<div className="copilot-rt-progress-track" aria-hidden="true">
				<div
					className="copilot-rt-progress-fill"
					style={{ width: `${progressPercent}%` }}
				/>
			</div>

			{/* Steps List */}
			{expanded && (
				<div className="copilot-rt-steps-list">
					{steps.map((step, idx) => {
						const isCurrent =
							step.status === "running" || (!allDone && idx === activeIndex);

						return (
							<div
								key={step.id || idx}
								className={`copilot-rt-step-item ${step.status} ${isCurrent ? "current" : ""}`}
								onClick={() => onStepClick?.(step)}
							>
								<div className="copilot-rt-step-left">
									<div className="copilot-rt-step-icon-wrap">
										{getStepIcon(step)}
									</div>
									<div className="copilot-rt-step-num-badge">
										{`Шаг ${step.stepNumber || idx + 1}`}
									</div>
								</div>

								<div className="copilot-rt-step-body">
									<div className="copilot-rt-step-title">{step.title}</div>
									{Boolean(step.detail) && (
										<div className="copilot-rt-step-detail">{step.detail}</div>
									)}
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
};

// ============================================================================
// 6. CopilotProtocol043ConfirmCard (1-Click Save to EMR 043/u)
// ============================================================================

