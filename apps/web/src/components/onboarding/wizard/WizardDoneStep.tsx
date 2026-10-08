import React from "react";
import type { WizardDoneStepProps } from "./types";

export function WizardDoneStep({
	legalReadinessPercent,
	dashboard,
	clinicModeLabels,
	staffRoleLabels,
	selectedWorkspaceRole,
	specialtyLabels,
	selectedSpecialty,
	telegramStatus,
	telegramEnabledFeaturesDraft,
	documentFactoryGroups,
	onboardingDocumentsReady,
	onboardingReadyToFinish,
	onboardingBlockingIssues,
	onboardingDocumentReadinessIssues,
	onboardingTelegramRecommendations,
}: WizardDoneStepProps) {
	return (
		<div className="onboarding-panel">
			<div>
				<h3>Проверка перед работой</h3>
				<p>
					Профиль клиники: {legalReadinessPercent}%. Команда:{" "}
					{dashboard?.clinicSettings?.staff?.length ?? 0}. Кабинеты:{" "}
					{dashboard?.clinicSettings?.chairs?.length ?? 0}. Telegram:{" "}
					{telegramStatus?.webhookReady
						? "готов к отправке"
						: "нужна настройка отправки"}
					. Документы:{" "}
					{documentFactoryGroups.reduce(
						(total, group) => total + group.kinds.length,
						0,
					)}{" "}
					шаблонов.
				</p>
			</div>
			<div className="onboarding-readiness-grid">
				<span>
					{dashboard?.clinicSettings?.profile?.mode &&
					clinicModeLabels[dashboard.clinicSettings.profile.mode]
						? clinicModeLabels[dashboard.clinicSettings.profile.mode].title
						: "Клиника"}
				</span>
				<span>{staffRoleLabels[selectedWorkspaceRole]}</span>
				<span>{specialtyLabels[selectedSpecialty]}</span>
				<span>
					{telegramEnabledFeaturesDraft.length} Telegram-сценариев включено
				</span>
				<span>
					{onboardingDocumentsReady
						? "документы готовы к выдаче"
						: "документы требуют реквизитов"}
				</span>
			</div>
			{!onboardingReadyToFinish ? (
				<p className="onboarding-blocker">
					Для полного профиля клиники рекомендуется заполнить:{" "}
					{onboardingBlockingIssues.join(", ")}. Можно завершить в черновике
					и дополнить позже в Настройках.
				</p>
			) : null}
			{!onboardingDocumentsReady ? (
				<p className="onboarding-blocker onboarding-advisory">
					Первый рабочий экран можно открыть сейчас. Для договоров, актов и
					налоговых форм позже заполните:{" "}
					{onboardingDocumentReadinessIssues.join(", ")}.
				</p>
			) : null}
			{onboardingTelegramRecommendations.length ? (
				<p className="onboarding-blocker onboarding-advisory">
					Telegram можно включить позже:{" "}
					{onboardingTelegramRecommendations.join(", ")}.
				</p>
			) : null}
		</div>
	);
}
