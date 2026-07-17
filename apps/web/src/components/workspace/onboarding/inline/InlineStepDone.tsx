import React from "react";
import { useAppLogicContext } from "../../../../contexts/AppLogicContext";

export function InlineStepDone() {
	const {
		legalReadinessPercent,
		dashboard,
		telegramStatus,
		documentFactoryGroups,
		selectedWorkspaceRole,
		selectedSpecialty,
		telegramEnabledFeaturesDraft,
		onboardingDocumentsReady,
		onboardingReadyToFinish,
		onboardingBlockingIssues,
		onboardingDocumentReadinessIssues,
		onboardingTelegramRecommendations,
		clinicModeLabels,
		staffRoleLabels,
		specialtyLabels,
	} = useAppLogicContext();

	return (
		<div className="onboarding-panel">
			<div>
				<h3>Проверка перед работой</h3>
				<p>
					Профиль клиники: {legalReadinessPercent}%. Команда:{" "}
					{dashboard.clinicSettings?.staff?.length ?? 0}. Кабинеты:{" "}
					{dashboard.clinicSettings?.chairs?.length ?? 0}. Telegram:{" "}
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
					{clinicModeLabels[
						dashboard.clinicSettings?.profile?.mode ?? "solo_doctor"
					]?.title ?? "—"}
				</span>
				<span>{staffRoleLabels[selectedWorkspaceRole]}</span>
				<span>{specialtyLabels[selectedSpecialty]}</span>
				<span>
					{telegramEnabledFeaturesDraft.length} Telegram-сценариев
					включено
				</span>
				<span>
					{onboardingDocumentsReady
						? "документы готовы к выдаче"
						: "документы требуют реквизитов"}
				</span>
			</div>
			{!onboardingReadyToFinish ? (
				<p className="onboarding-blocker">
					До завершения нужно заполнить:{" "}
					{onboardingBlockingIssues.join(", ")}.
				</p>
			) : null}
			{!onboardingDocumentsReady ? (
				<p className="onboarding-blocker onboarding-advisory">
					Первый рабочий экран можно открыть сейчас. Для договоров, актов
					и налоговых форм позже заполните:{" "}
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
