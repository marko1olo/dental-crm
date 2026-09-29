import React from "react";
import { RapidLaunchWizard } from "../../components/onboarding/RapidLaunchWizard";

export interface OnboardingPageProps {
	onComplete?: () => void;
	onSkip?: () => void;
}

export function OnboardingPage({ onComplete, onSkip }: OnboardingPageProps) {
	const handleFinished = () => {
		if (onComplete) {
			onComplete();
		} else {
			window.location.hash = "#/schedule";
		}
	};

	const handleSkipped = () => {
		if (onSkip) {
			onSkip();
		} else {
			window.location.hash = "#/schedule";
		}
	};

	return (
		<div className="onboarding-page-container">
			<RapidLaunchWizard
				isModal={false}
				onFinished={handleFinished}
				onSkipped={handleSkipped}
			/>
		</div>
	);
}

export default OnboardingPage;
