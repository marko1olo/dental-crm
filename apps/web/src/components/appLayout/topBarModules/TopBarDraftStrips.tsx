/**
 * TopBarDraftStrips — Полосы предупреждений о работе в черновике (Мандат 8b, <= 120 строк).
 */

import React from "react";
import type { AppView } from "../../../utils/routeUtils";

export interface TopBarDraftStripsProps {
	onboardingDismissed?: boolean | undefined;
	onboardingDraftMode?: boolean | undefined;
	onboardingReadyToFinish?: boolean | undefined;
	onboardingBlockingIssues?: readonly string[] | undefined;
	onboardingDocumentsReady?: boolean | undefined;
	onboardingDocumentReadinessIssues?: readonly string[] | undefined;
	reopenOnboarding?: (() => void) | undefined;
	setCurrentView?: ((view: AppView) => void) | undefined;
	setSettingsTab?: ((tab: string) => void) | undefined;
}

export function TopBarDraftStrips({
	onboardingDismissed = false,
	onboardingDraftMode = false,
	onboardingReadyToFinish = false,
	onboardingBlockingIssues = [],
	onboardingDocumentsReady = false,
	onboardingDocumentReadinessIssues = [],
	reopenOnboarding = () => {},
	setCurrentView = () => {},
	setSettingsTab = () => {},
}: Partial<TopBarDraftStripsProps>) {
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
