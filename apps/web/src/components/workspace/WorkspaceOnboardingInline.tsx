import { ArrowRight, CalendarDays, ClipboardCheck, ShieldCheck } from "lucide-react";
import React from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { InlineStepIntro } from "./onboarding/inline/InlineStepIntro";
import { InlineStepRole } from "./onboarding/inline/InlineStepRole";
import { InlineStepClinic } from "./onboarding/inline/InlineStepClinic";
import { InlineStepLegal } from "./onboarding/inline/InlineStepLegal";
import { InlineStepTeam } from "./onboarding/inline/InlineStepTeam";
import { InlineStepSources } from "./onboarding/inline/InlineStepSources";
import { InlineStepTelegram } from "./onboarding/inline/InlineStepTelegram";
import { InlineStepDone } from "./onboarding/inline/InlineStepDone";

export function WorkspaceOnboardingInline() {
	const {
		onboardingSteps,
		currentOnboardingIndex,
		legalReadinessPercent,
		continueOnboardingInDraftMode,
		moveOnboardingTo,
		onboardingStep,
		onboardingReadyToFinish,
		onboardingFinishGuidanceId,
		onboardingBlockingIssues,
		dismissOnboarding,
		saveClinicProfileFromDraft,
		clinicProfileSaveState,
		previousOnboardingStep,
		nextOnboardingStep,
	} = useAppLogicContext();

	return (
		<>
			<section
				className="onboarding-shell"
				aria-label="Первичная настройка клиники"
			>
				<div className="onboarding-head">
					<div>
						<p className="eyebrow">Первое открытие</p>
						<h2>Настройка новой клиники и рабочего места врача</h2>
						<p>
							Можно начать прием сразу. Юридические поля, импорт и Telegram
							остаются в настройке и не мешают диктовке, расписанию и карточке
							пациента.
						</p>
					</div>
					<div className="onboarding-score">
						<span>
							{currentOnboardingIndex + 1}/{onboardingSteps.length}
						</span>
						<strong>{legalReadinessPercent}%</strong>
						<small>готовность документов</small>
					</div>
				</div>

				<div
					className="onboarding-fast-start"
					aria-label="Быстрый старт работы"
				>
					<div>
						<strong>Рабочий вход без мастера</strong>
						<span>
							Черновики приема сохраняются. Документы и налоговые формы сами
							покажут, каких реквизитов не хватает.
						</span>
					</div>
					<button
						className="primary-button"
						type="button"
						onClick={() => void continueOnboardingInDraftMode("visit")}
					>
						<ClipboardCheck aria-hidden="true" /> Открыть прием
					</button>
					<button
						className="secondary-button"
						type="button"
						onClick={() => void continueOnboardingInDraftMode("schedule")}
					>
						<CalendarDays aria-hidden="true" /> Расписание
					</button>
					<button
						className="secondary-button"
						type="button"
						onClick={() => void moveOnboardingTo("legal")}
					>
						<ShieldCheck aria-hidden="true" /> Реквизиты
					</button>
				</div>

				<div className="onboarding-step-list" aria-label="Шаги знакомства">
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
							aria-describedby={
								step.id === "done" && !onboardingReadyToFinish
									? onboardingFinishGuidanceId
									: undefined
							}
							disabled={step.id === "done" && !onboardingReadyToFinish}
							onClick={() => void moveOnboardingTo(step.id)}
						>
							<span>{index + 1}</span>
							<strong>{step.title}</strong>
							<small>{step.detail}</small>
						</button>
					))}
				</div>

				{onboardingStep === "intro" ? <InlineStepIntro /> : null}
				{onboardingStep === "role" ? <InlineStepRole /> : null}
				{onboardingStep === "clinic" ? <InlineStepClinic /> : null}
				{onboardingStep === "legal" ? <InlineStepLegal /> : null}
				{onboardingStep === "team" ? <InlineStepTeam /> : null}
				{onboardingStep === "sources" ? <InlineStepSources /> : null}
				{onboardingStep === "telegram" ? <InlineStepTelegram /> : null}
				{onboardingStep === "done" ? <InlineStepDone /> : null}

				{!onboardingReadyToFinish ? (
					<p
						className="onboarding-blocker onboarding-action-guidance"
						id={onboardingFinishGuidanceId}
						role="status"
						aria-live="polite"
					>
						Чтобы завершить настройку, заполните:{" "}
						{onboardingBlockingIssues.join(", ")}.
					</p>
				) : null}

				<div className="onboarding-actions">
					<button
						className="secondary-button"
						type="button"
						onClick={dismissOnboarding}
						aria-describedby={
							!onboardingReadyToFinish ? onboardingFinishGuidanceId : undefined
						}
						disabled={!onboardingReadyToFinish}
					>
						Скрыть
					</button>
					{!onboardingReadyToFinish ? (
						<button
							className="secondary-button"
							type="button"
							onClick={() => void continueOnboardingInDraftMode()}
						>
							Продолжить в черновике
						</button>
					) : null}
					<button
						className="secondary-button"
						type="button"
						onClick={() => void saveClinicProfileFromDraft()}
						disabled={clinicProfileSaveState === "saving"}
					>
						<ShieldCheck aria-hidden="true" />{" "}
						{clinicProfileSaveState === "saving"
							? "Сохраняю"
							: "Сохранить профиль"}
					</button>
					{previousOnboardingStep ? (
						<button
							className="secondary-button"
							type="button"
							onClick={() => void moveOnboardingTo(previousOnboardingStep.id)}
						>
							Назад
						</button>
					) : null}
					{nextOnboardingStep ? (
						<button
							className="primary-button"
							type="button"
							onClick={() => void moveOnboardingTo(nextOnboardingStep.id)}
							aria-describedby={
								nextOnboardingStep.id === "done" && !onboardingReadyToFinish
									? onboardingFinishGuidanceId
									: undefined
							}
							disabled={
								nextOnboardingStep.id === "done" && !onboardingReadyToFinish
							}
						>
							Дальше <ArrowRight aria-hidden="true" />
						</button>
					) : (
						<button
							className="primary-button"
							type="button"
							onClick={dismissOnboarding}
							aria-describedby={
								!onboardingReadyToFinish
									? onboardingFinishGuidanceId
									: undefined
							}
							disabled={!onboardingReadyToFinish}
						>
							Завершить настройку
						</button>
					)}
				</div>
			</section>
		</>
	);
}
