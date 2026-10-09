import React from "react";
import { ChevronRight, ChevronLeft, Sparkles } from "lucide-react";
import type { BotOnboardingWizardProps } from "./onboarding/types";
import {
	BotStepperHeader,
	BotTokenStep,
	BotTemplatesStep,
	BotAdminsStep,
	BotTestingStep,
	useBotOnboardingState,
} from "./onboarding";

export type { BotOnboardingWizardProps };

export function BotOnboardingWizard(props: BotOnboardingWizardProps) {
	const { className = "" } = props;
	const s = useBotOnboardingState(props);

	return (
		<div className={`bot-wizard-container ${className}`}>
			<BotStepperHeader
				currentStep={s.currentStep}
				onStepClick={(step) => s.setCurrentStep(step)}
			/>

			{s.currentStep === 1 && <BotTokenStep {...s.tokenStepProps} />}
			{s.currentStep === 2 && <BotTemplatesStep {...s.templatesStepProps} />}
			{s.currentStep === 3 && <BotAdminsStep {...s.adminsStepProps} />}
			{s.currentStep === 4 && <BotTestingStep {...s.testingStepProps} />}

			{/* Bottom Action / Navigation Toolbar */}
			<div className="bot-wizard-footer">
				<div>
					{s.currentStep > 1 && (
						<button
							type="button"
							onClick={() => s.setCurrentStep((s.currentStep - 1) as 1 | 2 | 3 | 4)}
							className="secondary-button"
						>
							<ChevronLeft size={16} />
							<span>« Назад</span>
						</button>
					)}
				</div>

				<div className="flex items-center gap-3">
					<span className="text-xs text-slate-500 dark:text-slate-400">
						Шаг <span className="tabular-nums font-semibold">{s.currentStep}</span> из 4
					</span>

					{s.currentStep < 4 ? (
						<button
							type="button"
							onClick={() => s.setCurrentStep((s.currentStep + 1) as 1 | 2 | 3 | 4)}
							className="primary-button"
						>
							<span>Далее к шагу {s.currentStep + 1}</span>
							<ChevronRight size={16} />
						</button>
					) : (
						<button
							type="button"
							onClick={s.handleLaunchLiveBot}
							disabled={s.isLaunching}
							className="primary-button"
						>
							<Sparkles size={16} />
							<span>{s.isBotRunningLive ? "Бот работает" : "Запустить бота"}</span>
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
