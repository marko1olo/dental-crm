import React, { useEffect, useCallback } from "react";
import { ONBOARDING_WIZARD_STEPS } from "@dental/shared";
import {
	ArrowLeft,
	ArrowRight,
	Check,
	Clock,
	FastForward,
	Sparkles,
	X,
	Zap,
} from "lucide-react";
import { useOnboardingStore } from "../../store/onboardingStore";
import { Step1ClinicProfile } from "./Step1ClinicProfile";
import { Step2ChairsSchedule } from "./Step2ChairsSchedule";
import { Step3StarterPricelist } from "./Step3StarterPricelist";

export interface RapidLaunchWizardProps {
	onClose?: () => void;
	onFinished?: () => void;
	onSkipped?: () => void;
	isModal?: boolean;
}

export function RapidLaunchWizard({
	onClose,
	onFinished,
	onSkipped,
	isModal = true,
}: RapidLaunchWizardProps) {
	const {
		step,
		currentStepIndex,
		totalSteps,
		setStep,
		goToNextStep,
		goToPreviousStep,
		finishWizard,
		skipWizard,
		isSubmitting,
		profile,
	} = useOnboardingStore();

	const handleSkip = useCallback(async () => {
		const state = useOnboardingStore.getState();
		if (!state.profile.clinicName?.trim()) {
			const fallback =
				state.profile.mode === "solo_doctor"
					? "Кабинет доктора"
					: "Стоматологический кабинет";
			state.updateProfile({ clinicName: fallback });
		}
		await skipWizard();
		onSkipped?.();
		onClose?.();
	}, [skipWizard, onSkipped, onClose]);

	const handleFinish = useCallback(async () => {
		const state = useOnboardingStore.getState();
		if (!state.profile.clinicName?.trim()) {
			const fallback =
				state.profile.mode === "solo_doctor"
					? "Кабинет доктора"
					: "Стоматологический кабинет";
			state.updateProfile({ clinicName: fallback });
		}
		const ok = await finishWizard();
		if (ok) {
			onFinished?.();
			onClose?.();
		}
	}, [finishWizard, onFinished, onClose]);

	// 0-Click Fast Start for Solo Doctor (Mandate 8n)
	const handleZeroClickStart = useCallback(async () => {
		useOnboardingStore.getState().setOperationalMode("solo_doctor");
		const state = useOnboardingStore.getState();
		if (!state.profile.clinicName?.trim()) {
			state.updateProfile({ clinicName: "Кабинет доктора" });
		}
		await handleFinish();
	}, [handleFinish]);

	const handleNextStep = useCallback(() => {
		const state = useOnboardingStore.getState();
		if (state.step === "clinic_profile" && !state.profile.clinicName?.trim()) {
			const fallback =
				state.profile.mode === "solo_doctor"
					? "Кабинет доктора"
					: "Стоматологический кабинет";
			state.updateProfile({ clinicName: fallback });
		}
		goToNextStep();
	}, [goToNextStep]);

	// Keyboard shortcut handling: Esc to skip/close
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && isModal) {
				void handleSkip();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [handleSkip, isModal]);

	const content = (
		<div className={`rapid-launch-wizard-shell ${isModal ? "modal-view" : "standalone-view"}`}>
			{/* Top Bar / Header */}
			<header className="wizard-top-bar">
				<div className="wizard-brand-block">
					<div className="wizard-logo-pill">
						<Sparkles size={16} className="logo-sparkle" aria-hidden="true" />
						<span className="logo-text">DENTE CRM</span>
					</div>
					<div>
						<h2 className="wizard-headline">Мастер быстрого запуска клиники</h2>
						<p className="wizard-subheadline">
							3 простых шага • готовность к первому приёму за 60 секунд
						</p>
					</div>
				</div>

				<div className="wizard-top-actions">
					{/* 0-Click Solo Doctor Button */}
					<button
						type="button"
						className="wizard-zero-click-btn"
						onClick={() => void handleZeroClickStart()}
						title="Мгновенный старт для соло-врача с базовыми настройками (1 кресло, 09:00–18:00)"
					>
						<Zap size={14} aria-hidden="true" />
						0-клик старт (соло-врач)
					</button>

					{/* Prominent Skip Button (Doctor Autonomy Mandate 8e, 8n) */}
					<button
						type="button"
						className="wizard-skip-top-btn"
						onClick={() => void handleSkip()}
						title="Пропустить и настроить позже"
					>
						<FastForward size={14} aria-hidden="true" />
						Начать приём прямо сейчас (Пропустить настройку)
					</button>

					{isModal && onClose && (
						<button
							type="button"
							className="wizard-close-x-btn"
							onClick={() => void handleSkip()}
							title="Закрыть мастер"
							aria-label="Закрыть мастер"
						>
							<X size={18} aria-hidden="true" />
						</button>
					)}
				</div>
			</header>

			{/* Progress Bar & Step Tabs Indicator */}
			<div className="wizard-progress-section">
				{/* Visual progress bar fill */}
				<div className="progress-bar-track">
					<div
						className="progress-bar-fill"
						style={{
							width: `${((currentStepIndex + 1) / totalSteps) * 100}%`,
						}}
					/>
				</div>

				{/* 3 Step Indicator Tabs */}
				<div className="wizard-step-tabs" role="tablist" aria-label="Шаги мастера">
					{ONBOARDING_WIZARD_STEPS.map((stepMeta, index) => {
						const isCurrent = currentStepIndex === index;
						const isPast = currentStepIndex > index;

						return (
							<button
								key={stepMeta.id}
								type="button"
								role="tab"
								aria-selected={isCurrent}
								className={`wizard-step-tab ${isCurrent ? "active" : ""} ${isPast ? "completed" : ""}`}
								onClick={() => setStep(stepMeta.id)}
							>
								<div className="step-tab-number">
									{isPast ? (
										<Check size={14} aria-hidden="true" />
									) : (
										<span>{stepMeta.stepNumber}</span>
									)}
								</div>
								<div className="step-tab-text">
									<strong className="step-tab-title">{stepMeta.title}</strong>
									<span className="step-tab-sub">{stepMeta.subtitle}</span>
								</div>
							</button>
						);
					})}
				</div>
			</div>

			{/* Step Body Content */}
			<main className="wizard-step-container">
				{step === "clinic_profile" && <Step1ClinicProfile />}
				{step === "chairs_schedule" && <Step2ChairsSchedule />}
				{step === "starter_pricelist" && <Step3StarterPricelist />}
			</main>

			{/* Bottom Action Footer */}
			<footer className="wizard-action-footer">
				<div className="footer-left-actions">
					<button
						type="button"
						className="footer-ghost-skip-btn"
						onClick={() => void handleSkip()}
						title="Пропустить и настроить позже"
					>
						Начать приём прямо сейчас (Пропустить настройку)
					</button>
				</div>

				<div className="footer-right-actions">
					{currentStepIndex > 0 && (
						<button
							type="button"
							className="wizard-back-btn"
							onClick={goToPreviousStep}
							disabled={isSubmitting}
						>
							<ArrowLeft size={16} aria-hidden="true" />
							Назад
						</button>
					)}

					{currentStepIndex < totalSteps - 1 ? (
						<button
							type="button"
							className="wizard-next-primary-btn"
							onClick={handleNextStep}
							disabled={isSubmitting}
						>
							Продолжить
							<ArrowRight size={16} aria-hidden="true" />
						</button>
					) : (
						<button
							type="button"
							className="wizard-finish-primary-btn"
							onClick={() => void handleFinish()}
							disabled={isSubmitting}
						>
							{isSubmitting ? (
								<>
									<span className="spinner-icon" aria-hidden="true" />
									Запускаем клинику...
								</>
							) : (
								<>
									<Zap size={16} aria-hidden="true" />
									Запустить клинику за 60 секунд
								</>
							)}
						</button>
					)}
				</div>
			</footer>
		</div>
	);

	if (isModal) {
		return (
			<div
				className="rapid-onboarding-modal-overlay"
				role="dialog"
				aria-modal="true"
				aria-label="Мастер быстрого запуска клиники"
			>
				{content}
			</div>
		);
	}

	return content;
}
