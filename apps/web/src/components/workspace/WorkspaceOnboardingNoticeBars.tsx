import { ClipboardCheck, ShieldCheck } from "lucide-react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { WorkspaceOnboardingInline } from "./WorkspaceOnboardingInline";

export function WorkspaceOnboardingNoticeBars() {
	const {
		onboardingDismissed,
		showFullOnboardingGuide,
		currentOnboardingIndex,
		onboardingSteps,
		legalReadinessPercent,
		continueOnboardingInDraftMode,
		openOnboardingGuide,
		onboardingDraftMode,
		onboardingReadyToFinish,
		onboardingBlockingIssues,
		reopenOnboarding,
		onboardingDocumentsReady,
		onboardingDocumentReadinessIssues,
		setCurrentView,
		setSettingsTab,
	} = useAppLogicContext();

	return (
		<>
			{!onboardingDismissed && !showFullOnboardingGuide ? (
				<section
					className="onboarding-compact-strip"
					aria-label="Первичная настройка клиники"
				>
					<div>
						<strong>Можно начать прием без мастера</strong>
						<span>
							Документы предупредят о реквизитах позже. Сейчас важнее
							открыть пациента, диктовку и расписание.
						</span>
					</div>
					<span className="onboarding-compact-score">
						{currentOnboardingIndex + 1}/{onboardingSteps.length} ·
						документы {legalReadinessPercent}%
					</span>
					<button
						className="primary-button"
						type="button"
						onClick={() => void continueOnboardingInDraftMode("visit")}
					>
						<ClipboardCheck aria-hidden="true" /> Прием
					</button>
					<button
						className="secondary-button"
						type="button"
						onClick={() => openOnboardingGuide()}
					>
						<ShieldCheck aria-hidden="true" /> Настроить
					</button>
				</section>
			) : null}
			{showFullOnboardingGuide ? <WorkspaceOnboardingInline /> : null}
			{onboardingDismissed &&
			onboardingDraftMode &&
			!onboardingReadyToFinish ? (
				<section
					className="onboarding-draft-strip"
					aria-label="Первичная настройка в черновике"
				>
					<div>
						<strong>Первичная настройка не завершена</strong>
						<span>
							Можно работать в черновике, но перед выдачей документов
							заполните: {onboardingBlockingIssues.join(", ")}.
						</span>
					</div>
					<button
						className="secondary-button"
						type="button"
						onClick={reopenOnboarding}
					>
						Вернуться к настройке
					</button>
				</section>
			) : null}
			{onboardingDismissed &&
			onboardingReadyToFinish &&
			!onboardingDocumentsReady ? (
				<section
					className="onboarding-draft-strip"
					aria-label="Документы требуют реквизитов"
				>
					<div>
						<strong>Документы требуют реквизитов</strong>
						<span>
							Для договоров, актов и налоговых форм заполните:{" "}
							{onboardingDocumentReadinessIssues.join(", ")}.
						</span>
					</div>
					<button
						className="secondary-button"
						type="button"
						onClick={() => {
							setCurrentView("settings");
							setSettingsTab("clinic");
							window.location.hash = "settings/clinic";
						}}
					>
						Заполнить реквизиты
					</button>
				</section>
			) : null}
		</>
	);
}
