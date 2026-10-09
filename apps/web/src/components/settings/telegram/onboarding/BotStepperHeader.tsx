import React from "react";
import { CheckCircle2, ChevronRight } from "lucide-react";
import type { WizardStepNumber } from "./types";

const STEPPER_STAGES = [
	{ num: 1, label: "Канал связи", desc: "TG, VK, WA, MAX" },
	{ num: 2, label: "Профиль клиники", desc: "Название и тексты" },
	{ num: 3, label: "Выбор плагинов", desc: "5 умных модулей" },
	{ num: 4, label: "Быстрый запуск", desc: "Статус & ZIP" },
] as const;

export interface BotStepperHeaderProps {
	currentStep: WizardStepNumber;
	onStepClick: (step: WizardStepNumber) => void;
}

export function BotStepperHeader({ currentStep, onStepClick }: BotStepperHeaderProps) {
	return (
		<div className="bot-wizard-stepper" role="navigation" aria-label="Этапы настройки бота">
			{STEPPER_STAGES.map((step) => {
				const isPast = currentStep > step.num;
				const isCurrent = currentStep === step.num;
				return (
					<button
						key={step.num}
						type="button"
						onClick={() => onStepClick(step.num as WizardStepNumber)}
						className={`bot-stepper-item ${isCurrent ? "current" : isPast ? "completed" : "pending"}`}
					>
						<div className="bot-stepper-icon">
							{isPast ? <CheckCircle2 size={16} /> : <span>{step.num}</span>}
						</div>
						<div className="bot-stepper-text">
							<strong className="bot-stepper-label">{step.label}</strong>
							<span className="bot-stepper-desc">{step.desc}</span>
						</div>
						{step.num < 4 && <ChevronRight size={14} className="bot-stepper-arrow" aria-hidden="true" />}
					</button>
				);
			})}
		</div>
	);
}
