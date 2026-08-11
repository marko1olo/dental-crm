const {
		onboardingDismissed,
		setOnboardingDismissed,
		onboardingDismissedAt,
		setOnboardingDismissedAt,
		onboardingStep,
		setOnboardingStep,
		onboardingDraftMode,
		setOnboardingDraftMode,
		onboardingGuideExpanded,
		setOnboardingGuideExpanded,
		telegramHandoffNotice,
		setTelegramHandoffNotice,
		telegramStatus,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramStatus,
		telegramFeaturePlan,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramFeaturePlan,
		telegramOutbox,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramOutbox,
		telegramOutboxStatusFilter,
		setTelegramOutboxStatusFilter,
		telegramOutboxTemplateFilter,
		setTelegramOutboxTemplateFilter,
		telegramLinkCodes,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramLinkCodes,
		telegramChatLinks,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramChatLinks,
		telegramLinkCodeLedger,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramLinkCodeLedger,
		telegramChatLinkLedger,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramChatLinkLedger,
		telegramLinkSubjectType,
		setTelegramLinkSubjectType,
		telegramLinkStaffId,
		setTelegramLinkStaffId,
		telegramLinkCode,
		setTelegramLinkCode,
		telegramLinkActionState,
		setTelegramLinkActionState,
		telegramPreview,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramPreview,
		telegramModeDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramModeDraft,
		telegramBotUsernameDraft,
		setTelegramBotUsernameDraft,
		telegramOwnBotUsernameDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramOwnBotUsernameDraft,
		telegramBotConfigId,
		setTelegramBotConfigId,
		telegramWebhookBaseUrlDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramWebhookBaseUrlDraft,
		telegramPatientPortalBaseUrlDraft,
		setTelegramPatientPortalBaseUrlDraft,
		telegramWelcomeImageUrlDraft,
		setTelegramWelcomeImageUrlDraft,
		telegramVisualCardUrlDrafts,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramVisualCardUrlDrafts,
		telegramReviewUrlDraft,
		setTelegramReviewUrlDraft,
		telegramMapsUrlDraft,
		setTelegramMapsUrlDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramEnabledFeaturesDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramEnabledFeaturesDraft,
		telegramTokenTtlDraft,
		setTelegramTokenTtlDraft,
		telegramReminderLeadTimesDraft,
		setTelegramReminderLeadTimesDraft,
		telegramReviewRequestDelayDraft,
		setTelegramReviewRequestDelayDraft,
		telegramPostVisitCheckupDelayDrafts,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramPostVisitCheckupDelayDrafts,
		telegramAllowVoiceIntakeDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramAllowVoiceIntakeDraft,
		telegramStaffEscalationChannelDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramStaffEscalationChannelDraft,
		telegramPrivacyModeDraft,
		setTelegramPrivacyModeDraft,
		telegramSettingsDirty,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramSettingsDirty,
		telegramSettingsSaveState,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramSettingsSaveState,
		telegramSettingsSaveError,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramSettingsSaveError,
		clinicalAdminSecretDraft,
		setClinicalAdminSecretDraft,
		settingsAdminSecretDraft,
		setSettingsAdminSecretDraft,
		scheduleAdminSecretDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setScheduleAdminSecretDraft,
		telegramAdminSecretDraft,
		setTelegramAdminSecretDraft,
		clinicalAdminSecretSession,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setClinicalAdminSecretSession,
		settingsAdminSecretSession,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setSettingsAdminSecretSession,
		scheduleAdminSecretSession,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setScheduleAdminSecretSession,
		telegramAdminSecretSession,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramAdminSecretSession,
		telegramSendingItemId,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramSendingItemId,
		telegramRevokingLinkId,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramRevokingLinkId,
	} = useSettingsStore();

const onboardingDismissalHydratedOrganizationIdRef = useRef<string | null>(
		null,
	);

function buildOnboardingFirstAppointmentIssues(): string[] {
		if (!clinicProfileDraft) return [];
		const issues: string[] = [];
		const requiredClinicDraftFields: Array<[string, string]> = [
			["название клиники", clinicProfileDraft.clinicName],
			["телефон клиники", clinicProfileDraft.phone],
			["часовой пояс", clinicProfileDraft.timezone],
		];
		for (const [label, value] of requiredClinicDraftFields) {
			if (!value.trim()) issues.push(label);
		}
		const activeStaff =
			(dashboard?.clinicSettings?.staff || []).filter(
				(member) => member.active,
			) ?? [];
		const activeDoctors = activeStaff.filter(
			(member) => member.role === "doctor" || member.role === "owner",
		);
		const activeAssistants = activeStaff.filter(
			(member) => member.role === "assistant",
		);
		const activeChairs =
			(dashboard?.clinicSettings?.chairs || []).filter(
				(chair) => chair.active,
			) ?? [];
		if (!activeDoctors.length) issues.push("врач для первого приема");
		if (!activeDoctors.some((member) => member.canSignMedicalRecords))
			issues.push("врач с правом подписи ЭМК");
		if (!activeChairs.length) issues.push("кресло / кабинет");
		if (
			dashboard?.clinicSettings?.profile?.mode !== "solo_doctor" &&
			!activeAssistants.length
		)
			issues.push("ассистент");
		const activeAppointmentReadiness = dashboard?.activeVisit?.appointmentId
			? dashboard.appointmentReadiness?.find(
					(readiness) =>
						readiness.appointmentId === dashboard?.activeVisit?.appointmentId,
				)
			: null;
		const activeAppointmentBlockingChecks =
			(activeAppointmentReadiness?.checks || []).filter(
				(check) =>
					(check.key === "team" || check.key === "schedule") && !check.ready,
			) ?? [];
		for (const check of activeAppointmentBlockingChecks) {
			issues.push(`${check.title.toLocaleLowerCase("ru-RU")}: ${check.detail}`);
		}
		return issues;
	}

function buildOnboardingDocumentReadinessIssues(): string[] {
		if (!clinicProfileDraft) return [];
		const issues: string[] = [];
		const requiredDocumentDraftFields: Array<[string, string]> = [
			["юридическое наименование", clinicProfileDraft.legalName],
			["ИНН", clinicProfileDraft.inn],
			["адрес", clinicProfileDraft.address],
			["номер медицинской лицензии", clinicProfileDraft.medicalLicenseNumber],
			["дата медицинской лицензии", clinicProfileDraft.medicalLicenseIssuedAt],
			["орган, выдавший лицензию", clinicProfileDraft.medicalLicenseIssuer],
		];
		for (const [label, value] of requiredDocumentDraftFields) {
			if (!value.trim()) issues.push(label);
		}
		return issues;
	}

function _buildOnboardingReadinessIssues(): string[] {
		return [
			...buildOnboardingFirstAppointmentIssues(),
			...buildOnboardingDocumentReadinessIssues(),
		];
	}

function buildOnboardingTelegramRecommendations(): string[] {
		const recommendations: string[] = [];
		if (telegramModeDraft === "disabled")
			recommendations.push("включить режим Telegram");
		if (!telegramBotUsernameDraft.trim() && !telegramOwnBotUsernameDraft.trim())
			recommendations.push("указать имя Telegram-бота");
		if (!telegramPatientPortalBaseUrlDraft.trim())
			recommendations.push("добавить адрес портала пациента");
		if (!telegramReviewUrlDraft.trim())
			recommendations.push("добавить ссылку для оценки клиники");
		if (!telegramMapsUrlDraft.trim())
			recommendations.push("добавить ссылку на карточку клиники на картах");
		return recommendations;
	}

function focusOnboardingIssue(issues: string[]): void {
		if (
			issues.some((issue) =>
				[
					"врач для первого приема",
					"врач с правом подписи ЭМК",
					"кресло / кабинет",
					"ассистент",
				].includes(issue),
			)
		) {
			setOnboardingStep("team");
			return;
		}
		if (
			issues.some((issue) =>
				["название клиники", "телефон клиники", "часовой пояс"].includes(issue),
			)
		) {
			setOnboardingStep("clinic");
			return;
		}
		if (
			issues.some((issue) =>
				[
					"юридическое наименование",
					"ИНН",
					"адрес",
					"номер медицинской лицензии",
					"дата медицинской лицензии",
					"орган, выдавший лицензию",
				].includes(issue),
			)
		) {
			setOnboardingStep("legal");
			return;
		}
		if (
			issues.some(
				(issue) =>
					issue.includes("Telegram") ||
					issue.includes("бот") ||
					issue.includes("портал") ||
					issue.includes("оценки") ||
					issue.includes("картах"),
			)
		) {
			setOnboardingStep("telegram");
		}
	}

function assertOnboardingReadyForFinish(): boolean {
		const issues = buildOnboardingFirstAppointmentIssues();
		if (!issues.length) return true;
		focusOnboardingIssue(issues);
		setError(`Перед первым рабочим экраном заполните: ${issues.join(", ")}.`);
		return false;
	}

async function dismissOnboarding() {
		if (!assertOnboardingReadyForFinish()) return;
		if (!(await clinicSettings.saveClinicProfileIfDirty())) return;
		if (!(await saveOnboardingSchedulesIfDirty())) return;
		if (telegramSettingsDirty && !(await saveTelegramSettings())) return;
		const previousPreferencesInput = currentUiPreferencesInput();
		const dismissalSavedAt = new Date().toISOString();
		const savedPreferences: UiPreferences = {
			version: 1,
			...previousPreferencesInput,
			onboardingDismissed: true,
			onboardingDismissedAt: dismissalSavedAt,
			onboardingDraftMode: false,
			savedAt: dismissalSavedAt,
		};
		if (uiPreferencesServerReadyRef.current) {
			try {
				await saveServerUiPreferences(
					savedPreferences,
					settingsAdminSecretSession,
				);
				pendingUiPreferencesSyncRef.current = null;
				setUiPreferencesSyncError(null);
			} catch (preferencesError) {
				showToast(
					actionFailureToast(
						"Ошибка выполнения операции",
						(preferencesError as { status?: number })?.status ?? null,
					),
					"error",
				);
				const message = uiPreferencesSyncErrorMessage(preferencesError);
				pendingUiPreferencesSyncRef.current = null;
				setUiPreferencesSyncError(message);
				setError(message);
				return;
			}
		}
		if (!persistUiPreferences(savedPreferences)) {
			const message =
				"Настройки интерфейса не сохранены: браузер заблокировал локальное хранилище.";
			setUiPreferencesSyncError(message);
			setError(message);
			return;
		}
		const dismissal = saveOnboardingDismissed(
			true,
			dismissalSavedAt,
			false,
			dashboard?.clinicSettings?.profile?.organizationId ?? null,
		);
		setOnboardingDismissed(true);
		setOnboardingDismissedAt(dismissal.savedAt);
		setOnboardingDraftMode(false);
	}

async function continueOnboardingInDraftMode(targetView?: AppView) {
		if (!(await clinicSettings.saveClinicProfileIfDirty())) return;
		if (!(await saveOnboardingSchedulesIfDirty())) return;
		if (
			onboardingStep === "telegram" &&
			telegramSettingsDirty &&
			!(await saveTelegramSettings())
		)
			return;
		const dismissalSavedAt = new Date().toISOString();
		const savedPreferences: UiPreferences = {
			version: 1,
			...currentUiPreferencesInput(),
			onboardingDismissed: true,
			onboardingDismissedAt: dismissalSavedAt,
			onboardingDraftMode: true,
			savedAt: dismissalSavedAt,
		};
		if (!persistUiPreferences(savedPreferences)) {
			const message =
				"Настройки интерфейса не сохранены: браузер заблокировал локальное хранилище.";
			setUiPreferencesSyncError(message);
			setError(message);
			return;
		}
		if (uiPreferencesServerReadyRef.current) {
			try {
				await saveServerUiPreferences(
					savedPreferences,
					settingsAdminSecretSession,
				);
				setUiPreferencesSyncError(null);
			} catch (preferencesError) {
				showToast(
					actionFailureToast(
						"Ошибка выполнения операции",
						(preferencesError as { status?: number })?.status ?? null,
					),
					"error",
				);
				queueUiPreferencesServerSync(savedPreferences, { delayMs: 5000 });
				setUiPreferencesSyncError(
					uiPreferencesSyncErrorMessage(preferencesError),
				);
			}
		}
		const dismissal = saveOnboardingDismissed(
			true,
			dismissalSavedAt,
			true,
			dashboard?.clinicSettings?.profile?.organizationId ?? null,
		);
		setOnboardingDismissed(true);
		setOnboardingDismissedAt(dismissal.savedAt);
		setOnboardingDraftMode(true);
		if (targetView && typeof window !== "undefined") {
			window.location.hash = targetView;
		}
	}

async function moveOnboardingTo(step: OnboardingStep) {
		if (step === "done" && !assertOnboardingReadyForFinish()) return;
		if (!(await clinicSettings.saveClinicProfileIfDirty())) return;
		if (!(await saveOnboardingSchedulesIfDirty())) return;
		if (
			onboardingStep === "telegram" &&
			telegramSettingsDirty &&
			!(await saveTelegramSettings())
		)
			return;
		setOnboardingStep(step);
	}

function reopenOnboarding() {
		const dismissal = saveOnboardingDismissed(
			false,
			new Date().toISOString(),
			false,
			dashboard?.clinicSettings?.profile?.organizationId ?? null,
		);
		setOnboardingDismissed(false);
		setOnboardingDismissedAt(dismissal.savedAt);
		setOnboardingStep("intro");
		setOnboardingDraftMode(false);
		setOnboardingGuideExpanded(true);
		setCurrentView("settings");
		setSettingsTab("clinic");
		window.location.hash = "settings/clinic";
	}

function openOnboardingGuide(step?: OnboardingStep) {
		if (step) setOnboardingStep(step);
		setOnboardingGuideExpanded(true);
		setCurrentView("settings");
		setSettingsTab("clinic");
		window.location.hash = "settings/clinic";
	}

const onboardingFirstAppointmentIssues = dashboard
		? buildOnboardingFirstAppointmentIssues()
		: [];

const onboardingDocumentReadinessIssues = dashboard
		? buildOnboardingDocumentReadinessIssues()
		: [];

const onboardingBlockingIssues = onboardingFirstAppointmentIssues;

const onboardingTelegramRecommendations = dashboard
		? buildOnboardingTelegramRecommendations()
		: [];

const onboardingReadyToFinish = onboardingFirstAppointmentIssues.length === 0;

const onboardingDocumentsReady =
		onboardingDocumentReadinessIssues.length === 0;

const onboardingStaffCreateGuidanceId = "onboarding-staff-create-guidance";

const onboardingChairCreateGuidanceId = "onboarding-chair-create-guidance";

const onboardingFinishGuidanceId = "onboarding-finish-guidance";

const currentOnboardingIndex = Math.max(
		0,
		onboardingSteps.findIndex((step) => step.id === onboardingStep),
	);

const previousOnboardingStep =
		currentOnboardingIndex > 0
			? onboardingSteps[currentOnboardingIndex - 1]
			: null;

const nextOnboardingStep =
		currentOnboardingIndex < onboardingSteps.length - 1
			? onboardingSteps[currentOnboardingIndex + 1]
			: null;

const showFullOnboardingGuide =
		!onboardingDismissed &&
		currentView === "settings" &&
		settingsTab === "clinic" &&
		onboardingGuideExpanded;

