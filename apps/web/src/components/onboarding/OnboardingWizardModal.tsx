import React from "react";
import { ArrowRight, CalendarDays, ClipboardCheck, ShieldCheck, Sparkles, X, Zap } from "lucide-react";
import { RapidLaunchWizard } from "./RapidLaunchWizard";
import { AuthArtBackground } from "../auth/AuthArtBackground";
import { showToast } from "../GlobalToast";
import {
	WizardClinicStep,
	WizardDoneStep,
	WizardIntroStep,
	WizardLegalStep,
	WizardRoleStep,
	WizardSourcesStep,
	WizardStepperNav,
	WizardTeamStep,
	WizardTelegramStep,
} from "./wizard";
import type {
	ClinicProfileDraft,
	DocumentFactoryGroup,
	OnboardingStepItem,
	OnboardingWizardModalProps,
	StaffScheduleDraft,
	TelegramPostVisitCheckupDelayField,
	TelegramVisualCardField,
	UiLanguageOption,
	WeekdayOption,
} from "./wizard";

export type {
	OnboardingStepItem,
	WeekdayOption,
	UiLanguageOption,
	TelegramPostVisitCheckupDelayField,
	TelegramVisualCardField,
	DocumentFactoryGroup,
	StaffScheduleDraft,
	ClinicProfileDraft,
	OnboardingWizardModalProps,
};

export function OnboardingWizardModal(props: OnboardingWizardModalProps) {
	const {
		currentOnboardingIndex, onboardingSteps, legalReadinessPercent,
		continueOnboardingInDraftMode, moveOnboardingTo, onboardingStep,
		onboardingReadyToFinish, onboardingFinishGuidanceId, dashboard,
		clinicProfileDraft, updateClinicProfileDraft, newStaffName,
		setNewStaffName, newStaffRole, addStaffMember, staffRoleLabels,
		newChairName, setNewChairName, addChair, onboardingBlockingIssues,
		dismissOnboarding: onDismissOnboarding, saveClinicProfileFromDraft,
		clinicProfileSaveState, previousOnboardingStep, nextOnboardingStep,
		initialShowRapidWizard,
	} = props;

	// Detect if we are inside a React render context with active dispatcher (React 19)
	const hasDispatcher = Boolean(
		// biome-ignore lint/suspicious/noExplicitAny: React internal hook dispatcher check
		(React as any).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE?.H ||
		// biome-ignore lint/suspicious/noExplicitAny: React 18 backward compat
		(React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED?.ReactCurrentDispatcher?.current,
	);

	const [showRapidWizard, setShowRapidWizard] = hasDispatcher
		// eslint-disable-next-line react-hooks/rules-of-hooks
		? React.useState(Boolean(initialShowRapidWizard))
		: [Boolean(initialShowRapidWizard), (_val: boolean) => {}];

	if (showRapidWizard) {
		return (
			<RapidLaunchWizard
				isModal={true}
				onClose={() => setShowRapidWizard(false)}
				onFinished={onDismissOnboarding}
				onSkipped={onDismissOnboarding}
			/>
		);
	}

	const dismissOnboarding = () => {
		if (!onboardingReadyToFinish) {
			showToast(
				"Настройки сохранены в черновике. Профиль клиники можно дополнить в любой момент в разделе Настройки (Мандат 8e)",
				"success",
				4000,
			);
			if (typeof continueOnboardingInDraftMode === "function") {
				void continueOnboardingInDraftMode();
			} else {
				void saveClinicProfileFromDraft?.();
				onDismissOnboarding?.();
			}
			return;
		}
		onDismissOnboarding?.();
	};

	const handleAddStaff = () => {
		const staffList = dashboard?.clinicSettings?.staff ?? [];
		let staffName = newStaffName?.trim?.() ?? "";
		if (!staffName) {
			const activeDoctor = staffList.find((s) => s.role === "doctor" && s.fullName)?.fullName;
			staffName = activeDoctor || (newStaffRole === "doctor" ? "Врач-терапевт" : staffRoleLabels[newStaffRole] || "Врач-терапевт");
			setNewStaffName(staffName);
			showToast("Введите ФИО сотрудника или выберите стандартную роль", "info");
		}
		addStaffMember(newStaffRole, staffName);
	};

	const handleAddChair = () => {
		const currentChairs = dashboard?.clinicSettings?.chairs ?? [];
		let chairName = newChairName?.trim?.() ?? "";
		if (!chairName) {
			chairName = `Кресло ${currentChairs.length + 1}`;
			setNewChairName(chairName);
		}
		addChair(chairName);
	};

	const renderActiveStep = () => {
		switch (onboardingStep) {
			case "intro": return !hasDispatcher ? WizardIntroStep({}) : <WizardIntroStep />;
			case "role": return !hasDispatcher ? WizardRoleStep(props) : <WizardRoleStep {...props} />;
			case "clinic": return !hasDispatcher ? WizardClinicStep(props) : <WizardClinicStep {...props} />;
			case "legal": return !hasDispatcher ? WizardLegalStep(props) : <WizardLegalStep {...props} />;
			case "team": {
				const teamProps = { ...props, handleAddStaff, handleAddChair };
				return !hasDispatcher ? WizardTeamStep(teamProps) : <WizardTeamStep {...teamProps} />;
			}
			case "sources": return !hasDispatcher ? WizardSourcesStep(props) : <WizardSourcesStep {...props} />;
			case "telegram": return !hasDispatcher ? WizardTelegramStep(props) : <WizardTelegramStep {...props} />;
			case "done": return !hasDispatcher ? WizardDoneStep(props) : <WizardDoneStep {...props} />;
			default: return null;
		}
	};

	return (
		<div className="onboarding-overlay" role="dialog" aria-modal="true" aria-label="Первичная настройка клиники">
			<AuthArtBackground overlayAlpha={0.38} settings={{ pack: "dental-epic", dynamicByTimeOfDay: true }} />
			<section className="onboarding-shell animate-fade-in-up" aria-label="Первичная настройка клиники">
				<div className="onboarding-head">
					<div>
						<p className="eyebrow">Первое открытие</p>
						<h2>Настройка новой клиники и рабочего места врача</h2>
						<p>
							Можно начать прием сразу. Юридические поля, импорт и Telegram
							остаются в настройке и не мешают диктовке, расписанию и карточке пациента.
						</p>
					</div>
					<div className="onboarding-head-aside">
						<div className="onboarding-score">
							<span>{currentOnboardingIndex + 1}/{onboardingSteps.length}</span>
							<strong>{legalReadinessPercent}%</strong>
							<small>готовность документов</small>
						</div>
						<button className="onboarding-head-close-btn" type="button" onClick={dismissOnboarding} title="Скрыть мастер настройки" aria-label="Скрыть мастер настройки">
							<X size={18} aria-hidden="true" />
						</button>
					</div>
				</div>
				<section className="onboarding-fast-start" aria-label="Быстрый старт работы">
					<div>
						<strong>Рабочий вход без мастера</strong>
						<span>
							Черновики приема сохраняются. Документы и налоговые формы сами
							покажут, каких реквизитов не хватает.
						</span>
					</div>
					<button
						className="primary-button onboarding-fast-oneclick-btn"
						type="button"
						onClick={() => {
							if (!clinicProfileDraft.clinicName?.trim()) {
								updateClinicProfileDraft("clinicName", "Стоматология ДЕНТЕ");
							}
							showToast("Клиника запущена с базовыми настройками (соло-врач, 1 кресло)", "success");
							void continueOnboardingInDraftMode("schedule");
						}}
						title="Мгновенный запуск клиники с базовыми настройками (соло-врач, 1 кресло)"
					>
						<Zap aria-hidden="true" /> 0-клик старт (соло-врач)
					</button>
					<button
						className="secondary-button onboarding-rapid-wizard-btn"
						type="button"
						onClick={() => setShowRapidWizard(true)}
						title="3-шаговый экспресс-мастер быстрого запуска клиники за 60 секунд"
					>
						<Sparkles aria-hidden="true" /> Экспресс-мастер (3 шага / 60 сек)
					</button>
					<button className="secondary-button" type="button" onClick={() => void continueOnboardingInDraftMode("visit")}>
						<ClipboardCheck aria-hidden="true" /> Открыть прием
					</button>
					<button className="secondary-button" type="button" onClick={() => void continueOnboardingInDraftMode("schedule")}>
						<CalendarDays aria-hidden="true" /> Расписание
					</button>
					<button className="secondary-button" type="button" onClick={() => void moveOnboardingTo("legal")}>
						<ShieldCheck aria-hidden="true" /> Реквизиты
					</button>
				</section>

				{!hasDispatcher ? WizardStepperNav(props) : <WizardStepperNav {...props} />}

				{renderActiveStep()}

				{!onboardingReadyToFinish ? (
					<p className="onboarding-blocker onboarding-action-guidance" id={onboardingFinishGuidanceId} role="status" aria-live="polite">
						Для полного профиля заполните: {onboardingBlockingIssues.join(", ")}.
						Завершение сейчас сохранит настройки в черновике.
					</p>
				) : null}
				<div className="onboarding-actions">
					<button className="secondary-button" type="button" onClick={dismissOnboarding}>
						Скрыть
					</button>
					{!onboardingReadyToFinish ? (
						<button className="secondary-button" type="button" onClick={() => void continueOnboardingInDraftMode()}>
							Продолжить в черновике
						</button>
					) : null}
					<button className="secondary-button" type="button" onClick={() => void saveClinicProfileFromDraft()} disabled={false}>
						<ShieldCheck aria-hidden="true" /> {clinicProfileSaveState === "saving" ? "Сохраняю" : "Сохранить профиль"}
					</button>
					{previousOnboardingStep ? (
						<button className="secondary-button" type="button" onClick={() => void moveOnboardingTo(previousOnboardingStep.id)}>
							Назад
						</button>
					) : null}
					{nextOnboardingStep ? (
						<button className="primary-button" type="button" onClick={() => void moveOnboardingTo(nextOnboardingStep.id)}>
							Дальше <ArrowRight aria-hidden="true" />
						</button>
					) : (
						<button className="primary-button" type="button" onClick={dismissOnboarding} aria-describedby={!onboardingReadyToFinish ? onboardingFinishGuidanceId : undefined}>
							Завершить настройку
						</button>
					)}
				</div>
			</section>
		</div>
	);
}
