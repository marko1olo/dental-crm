/**
 * TopBarDraftStrips — Полосы предупреждений о работе в черновике (Мандат 8b, <= 120 строк).
 */

import React from "react";

export interface TopBarDraftStripsProps {
	onboardingDismissed: boolean;
	onboardingDraftMode: boolean;
	onboardingReadyToFinish: boolean;
	onboardingBlockingIssues: string[];
	onboardingDocumentsReady: boolean;
	onboardingDocumentReadinessIssues: string[];
	reopenOnboarding: () => void;
	setCurrentView: (view: string) => void;
	setSettingsTab: (tab: string) => void;
}

export function TopBarDraftStrips({
	onboardingDismissed,
	onboardingDraftMode,
	onboardingReadyToFinish,
	onboardingBlockingIssues,
	onboardingDocumentsReady,
	onboardingDocumentReadinessIssues,
	reopenOnboarding,
	setCurrentView,
	setSettingsTab,
}: TopBarDraftStripsProps) {
	if (!onboardingDismissed) return null;

	return (
		<>
			{onboardingDraftMode && !onboardingReadyToFinish && (
				<section className="onboarding-draft-strip" aria-label="Первичная настройка в черновике">
					<div>
						<strong>Первичная настройка не завершена</strong>
						<span>Можно работать в черновике. Перед выдачей документов заполните: {onboardingBlockingIssues.join(", ")}.</span>
					</div>
					<button className="secondary-button" type="button" onClick={reopenOnboarding}>
						Вернуться к настройке
					</button>
				</section>
			)}

			{onboardingReadyToFinish && !onboardingDocumentsReady && (
				<section className="onboarding-draft-strip" aria-label="Документы требуют реквизитов">
					<div>
						<strong>Документы требуют реквизитов</strong>
						<span>Для договоров и актов заполните: {onboardingDocumentReadinessIssues.join(", ")}.</span>
					</div>
					<button
						className="secondary-button"
						type="button"
						onClick={() => {
							setCurrentView("settings");
							setSettingsTab("clinic");
							if (typeof window !== "undefined") window.location.hash = "settings/clinic";
						}}
					>
						Заполнить реквизиты
					</button>
				</section>
			)}
		</>
	);
}
