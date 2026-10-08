import React from "react";
import type { WizardStepperNavProps } from "./types";

export function WizardStepperNav({
	onboardingSteps,
	onboardingStep,
	currentOnboardingIndex,
	moveOnboardingTo,
}: WizardStepperNavProps) {
	return (
		<fieldset
			className="onboarding-step-list"
			aria-label="Шаги знакомства"
			style={{ border: "none", padding: 0, margin: 0 }}
		>
			<legend className="sr-only">Шаги знакомства</legend>
			{onboardingSteps.map((step, index) => (
				<button
					className={
						step.id === onboardingStep
							? "active"
							: index < currentOnboardingIndex
								? "done"
								: ""
					}
					key={step.id}
					type="button"
					aria-current={step.id === onboardingStep ? "step" : undefined}
					aria-pressed={step.id === onboardingStep}
					onClick={() => void moveOnboardingTo(step.id)}
				>
					<span>{index + 1}</span>
					<strong>{step.title}</strong>
					<small>{step.detail}</small>
				</button>
			))}
		</fieldset>
	);
}
