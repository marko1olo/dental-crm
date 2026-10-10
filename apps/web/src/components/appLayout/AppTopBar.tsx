import React, { Suspense } from "react";
import {
	AlertTriangle,
	Bot,
	CalendarDays,
	ClipboardCheck,
	Rocket,
	ShieldCheck,
	X,
} from "lucide-react";
import {
	isDemoShowcaseMode,
	disableDemoShowcaseMode,
} from "../../lib/demoMode";
import { clearOfflineClinicCaches } from "../../lib/offlineStorage";
import {
	DENTE_CLINIC_TOKEN_KEY,
	DENTE_STAFF_TOKEN_KEY,
	safeLocalStorageRemoveItem,
	safeLocalStorageSetItem,
} from "../../lib/safeLocalStorage";
import { DemoModeBanner } from "../demo/DemoModeBanner";
import { WorkspaceTopbar } from "../../workspaceShell";
import { preloadWorkspaceView } from "../../workspacePreload";
import { LanCitoEmergencyBanner } from "../sync/LanCitoEmergencyBanner";
import { WorkspaceContinuityStrip } from "../../workspaceContinuityStrip";
import { DoctorMobileShiftModal } from "../doctor-portal/DoctorMobileShiftModal";
import { OnboardingWizardModal } from "../onboarding/OnboardingWizardModal";
import type { AppTopBarProps } from "./types";

export function AppTopBar(props: AppTopBarProps) {
	const {
		dashboard,
		defaultClinicNoticeHidden,
		setDefaultClinicNoticeHidden,
		reopenOnboarding,
		goToVisitDictation,
		setSelectedWorkspaceRole,
		selectedWorkspaceRole,
		roleFocusOrder,
		showAdministrationTopActions,
		showDoctorVisitShortcut,
		staffRoleLabels,
		handleLockSession,
		openDoctorShiftCockpit,
		setIsCbctDirectModalOpen,
		activeCitoAlerts,
		dismissCitoAlert,
		browserContinuityCritical,
		browserContinuity,
		isOnline,
		isPendingVisitSyncing,
		refreshBrowserContinuity,
		flushPendingSpeechChunks,
		flushPendingVisitSaves,
		pendingSpeechChunkCount,
		pendingVisitSaveCount,
		networkState,
		pendingMutationCount,
		syncOfflineMutations,
		isSyncingMutations,
		error,
		setError,
		uiPreferencesSyncError,
		setUiPreferencesSyncError,
		telegramHandoffNotice,
		setTelegramHandoffNotice,
		onboardingDismissed,
		showFullOnboardingGuide,
		isLocalOnboardingDismissed,
		isStripDismissedLocally,
		setIsStripDismissedLocally,
		currentView,
		currentOnboardingIndex,
		onboardingSteps,
		legalReadinessPercent,
		continueOnboardingInDraftMode,
		openOnboardingGuide,
		dismissOnboarding,
		onboardingDraftMode,
		onboardingReadyToFinish,
		onboardingBlockingIssues,
		onboardingDocumentsReady,
		onboardingDocumentReadinessIssues,
		setCurrentView,
		setSettingsTab,
		isDoctorShiftCockpitOpen,
		closeDoctorShiftCockpit,
		activeDoctor,
		onboardingRoleChoices,
		moveOnboardingTo,
		onboardingStep,
		onboardingFinishGuidanceId,
		specialtyLabels,
		selectedSpecialty,
		setSelectedSpecialty,
		clinicModeLabels,
		changeClinicMode,
		clinicProfileDraft,
		updateClinicProfileDraft,
		uiLanguage,
		setUiLanguage,
		normalizeUiLanguageInput,
		uiLanguageOptions,
		selectedUiLanguageOption,
		weekdayOptions,
		toggleClinicWorkingDay,
		legalMissingFields,
		newStaffName,
		setNewStaffName,
		newStaffRole,
		setNewStaffRole,
		newStaffSpecialty,
		setNewStaffSpecialty,
		addStaffMember,
		newStaffReadyToCreate,
		onboardingStaffCreateGuidanceId,
		newChairName,
		setNewChairName,
		addChair,
		newChairReadyToCreate,
		onboardingChairCreateGuidanceId,
		staffScheduleDrafts,
		staffScheduleDraftFromWorkingHours,
		staffScheduleSaveStates,
		staffScheduleDirtyIds,
		staffScheduleSavingId,
		updateStaffScheduleDraft,
		toggleStaffWorkingDay,
		saveStaffSchedule,
		chairScheduleDrafts,
		chairScheduleSaveStates,
		chairScheduleDirtyIds,
		chairScheduleSavingId,
		updateChairScheduleDraft,
		toggleChairWorkingDay,
		saveChairSchedule,
		pricelistSourceKindLabels,
		pricelistSourceKind,
		setPricelistSourceKind,
		clearPricelistImage,
		setPricelistAnalysis,
		importSourceLabels,
		importSourceKind,
		setImportSourceKind,
		setImportPreview,
		setImportCommit,
		smartImportModeLabels,
		smartImportMode,
		setSmartImportMode,
		setSmartImportPreview,
		setSmartImportCommit,
		ingestionTargetLabels,
		documentIngestionTarget,
		setDocumentIngestionTarget,
		imagingSourceChoices,
		imagingImportSourceKind,
		imagingSourceLabels,
		setImagingImportSourceKind,
		setImagingImportPreview,
		setImagingImportCommit,
		setDicomSeriesPreview,
		dicomWebEndpointUrl,
		setDicomWebEndpointUrl,
		setDicomWebCheck,
		setDicomViewerLaunchManifest,
		setDicomViewerToolStateBundle,
		setDicomViewerWorkbenchManifest,
		ohifBaseUrl,
		setOhifBaseUrl,
		telegramStatus,
		telegramBotUsernameDraft,
		setTelegramBotUsernameDraft,
		markTelegramSettingsDirty,
		telegramPatientPortalBaseUrlDraft,
		setTelegramPatientPortalBaseUrlDraft,
		telegramWelcomeImageUrlDraft,
		setTelegramWelcomeImageUrlDraft,
		telegramReviewUrlDraft,
		setTelegramReviewUrlDraft,
		telegramMapsUrlDraft,
		setTelegramMapsUrlDraft,
		telegramTokenTtlDraft,
		setTelegramTokenTtlDraft,
		telegramReminderLeadTimesDraft,
		setTelegramReminderLeadTimesDraft,
		telegramReviewRequestDelayDraft,
		setTelegramReviewRequestDelayDraft,
		telegramPostVisitCheckupDelayFields,
		telegramPostVisitCheckupDelayDrafts,
		updateTelegramPostVisitCheckupDelayDraft,
		telegramAdminSecretDraft,
		setTelegramAdminSecretDraft,
		unlockTelegramAdminSession,
		telegramAdminSecretSession,
		telegramPrivacyModeDraft,
		setTelegramPrivacyModeDraft,
		normalizedTelegramPrivacyMode,
		telegramPrivacyModeLabels,
		telegramVisualCardFields,
		onboardingTelegramVisualCardKeys,
		telegramVisualCardUrlDrafts,
		updateTelegramVisualCardUrlDraft,
		telegramFeatureOptions,
		telegramEnabledFeaturesDraft,
		toggleTelegramFeature,
		telegramFeatureLabel,
		saveTelegramSettings,
		isTelegramSettingsSaving,
		telegramSettingsSaveState,
		telegramSettingsSaveError,
		telegramSettingsDirty,
		documentFactoryGroups,
		saveClinicProfileFromDraft,
		clinicProfileSaveState,
		onboardingTelegramRecommendations = [],
		previousOnboardingStep,
		nextOnboardingStep,
	} = props;

	return (
		<>
			{dashboard?.clinicName === "Стоматология, 1 кабинет" &&
				!defaultClinicNoticeHidden && (
					<div className="default-clinic-banner" role="status">
						<div className="banner-content">
							<span className="banner-icon" aria-hidden="true">
								<Rocket
									className="w-5 h-5 text-amber-500"
									aria-hidden="true"
								/>
							</span>
							<p>
								<strong>Клиника ещё не настроена?</strong> Её название
								совпадает с названием клиники из тестовых данных. Если это
								ваша настоящая клиника — переименуйте её в настройках. Если
								вы только начинаете — пройдите настройку, она займёт
								несколько минут.
							</p>
						</div>
						<button
							className="primary-button banner-btn"
							type="button"
							onClick={reopenOnboarding}
						>
							Пройти настройку
						</button>
						<button
							className="text-button banner-btn"
							type="button"
							onClick={() => setDefaultClinicNoticeHidden(true)}
							aria-label="Скрыть подсказку о названии клиники"
						>
							Скрыть
						</button>
					</div>
				)}
			{isDemoShowcaseMode() && (
				<DemoModeBanner
					onExitDemo={() => {
						disableDemoShowcaseMode();
						const cleanUrl = window.location.pathname;
						window.location.href = cleanUrl;
					}}
					onRegisterClinic={() => {
						disableDemoShowcaseMode();
						clearOfflineClinicCaches();
						safeLocalStorageRemoveItem(DENTE_CLINIC_TOKEN_KEY);
						safeLocalStorageRemoveItem(DENTE_STAFF_TOKEN_KEY);
						window.location.hash = "#/auth/register";
						window.location.reload();
					}}
				/>
			)}
			<WorkspaceTopbar
				clinicName={dashboard.clinicName}
				onGoToDictation={goToVisitDictation}
				onGoToSchedule={() => {
					if (
						typeof window !== "undefined" &&
						(window.location.hash === "#schedule" ||
							window.location.hash === "schedule")
					) {
						window.dispatchEvent(
							new CustomEvent("dente-open-quick-booking"),
						);
					} else if (typeof window !== "undefined") {
						window.location.hash = "schedule";
					}
				}}
				onGoToVisit={() => {
					if (typeof window !== "undefined") {
						window.location.hash = "visit";
					}
				}}
				onReopenOnboarding={reopenOnboarding}
				onRoleChange={setSelectedWorkspaceRole}
				onViewIntent={preloadWorkspaceView}
				roleFocusOrder={roleFocusOrder}
				selectedWorkspaceRole={selectedWorkspaceRole}
				showAdministrationTopActions={showAdministrationTopActions}
				showDoctorVisitShortcut={showDoctorVisitShortcut}
				staffRoleLabels={staffRoleLabels}
				todayIso={dashboard.todayIso}
				onLockSession={handleLockSession}
				onOpenDoctorShiftCockpit={openDoctorShiftCockpit}
				onOpenCbctDemo={() => setIsCbctDirectModalOpen(true)}
			/>
			<LanCitoEmergencyBanner
				alerts={activeCitoAlerts}
				onDismiss={dismissCitoAlert}
				onAcknowledge={dismissCitoAlert}
			/>
			<WorkspaceContinuityStrip
				browserContinuityCritical={browserContinuityCritical}
				browserWarnings={browserContinuity?.warnings ?? []}
				isOnline={isOnline}
				isPendingVisitSyncing={isPendingVisitSyncing}
				onCheckDevice={() =>
					void refreshBrowserContinuity({ silent: false })
				}
				onFlushSpeech={() =>
					void flushPendingSpeechChunks({ silent: false })
				}
				onFlushVisit={() => void flushPendingVisitSaves({ silent: false })}
				pendingSpeechChunkCount={pendingSpeechChunkCount}
				pendingVisitSaveCount={pendingVisitSaveCount}
				networkState={networkState}
				pendingMutationCount={pendingMutationCount}
				onSyncMutations={() => void syncOfflineMutations()}
				isSyncingMutations={isSyncingMutations}
			/>
			{error ? (
				<section className="app-notice" role="alert" aria-live="assertive">
					<AlertTriangle aria-hidden="true" />
					<p>{error}</p>
					<button
						className="secondary-button"
						type="button"
						onClick={() => setError(null)}
					>
						Понятно
					</button>
				</section>
			) : null}
			{!error && uiPreferencesSyncError ? (
				<section className="app-notice" role="alert" aria-live="assertive">
					<AlertTriangle aria-hidden="true" />
					<p>{uiPreferencesSyncError}</p>
					<button
						className="secondary-button"
						type="button"
						onClick={() => setUiPreferencesSyncError(null)}
					>
						Понятно
					</button>
				</section>
			) : null}
			{!error && !uiPreferencesSyncError && telegramHandoffNotice ? (
				<section
					className="app-notice telegram-handoff-notice"
					role="status"
					aria-live="polite"
				>
					<Bot aria-hidden="true" />
					<p>
						Открыто из Telegram:{" "}
						<strong>{telegramHandoffNotice.title}</strong>.{" "}
						{telegramHandoffNotice.detail} Ссылка не содержит пациента,
						документ, запись или оплату.
					</p>
					<button
						className="secondary-button"
						type="button"
						onClick={() => setTelegramHandoffNotice(null)}
					>
						Понятно
					</button>
				</section>
			) : null}
			{!onboardingDismissed && !showFullOnboardingGuide && !isLocalOnboardingDismissed && !isStripDismissedLocally &&
			!(typeof window !== "undefined" && window.innerWidth <= 768) &&
			currentView !== "visit" && currentView !== "shift" && currentView !== "schedule" &&
			!(typeof window !== "undefined" && (window.location.hash.toLowerCase().includes("visit") || window.location.hash.toLowerCase().includes("shift") || window.location.hash.toLowerCase().includes("schedule"))) ? (
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
						onClick={() => void continueOnboardingInDraftMode("schedule")}
					>
						<CalendarDays aria-hidden="true" /> Расписание
					</button>
					<button
						className="secondary-button"
						type="button"
						onClick={() => openOnboardingGuide()}
					>
						<ShieldCheck aria-hidden="true" /> Настроить
					</button>
					<button
						className="secondary-button"
						type="button"
						onClick={() => {
							setIsStripDismissedLocally(true);
							safeLocalStorageSetItem(
								"dente_onboarding_strip_dismissed",
								"true",
							);
							dismissOnboarding();
						}}
						title="Скрыть подсказку"
						aria-label="Скрыть подсказку"
					>
						<X aria-hidden="true" /> Скрыть
					</button>
				</section>
			) : null}
			{isDoctorShiftCockpitOpen ? (
				<Suspense fallback={null}>
					<DoctorMobileShiftModal
						isOpen={isDoctorShiftCockpitOpen}
						onClose={closeDoctorShiftCockpit}
						initialDoctorId={activeDoctor?.id || "doc-1"}
						initialDoctorName={
							activeDoctor?.fullName || "Лечащий врач"
						}
						initialDoctorSpecialty={
							activeDoctor?.specialty || "Терапевт-ортопед"
						}
						initialShiftDateIso={dashboard?.todayIso || "2026-08-29"}
						rawAppointments={dashboard?.appointments}
						patients={dashboard?.patients}
						chairs={dashboard?.clinicSettings?.chairs}
					/>
				</Suspense>
			) : null}
			{showFullOnboardingGuide ? (
				<Suspense fallback={null}>
					<OnboardingWizardModal
						currentOnboardingIndex={currentOnboardingIndex}
						onboardingSteps={onboardingSteps}
						legalReadinessPercent={legalReadinessPercent}
						continueOnboardingInDraftMode={(targetView) => void continueOnboardingInDraftMode(targetView)}
						moveOnboardingTo={(step) => void moveOnboardingTo(step)}
						onboardingStep={onboardingStep}
						onboardingReadyToFinish={onboardingReadyToFinish}
						onboardingFinishGuidanceId={onboardingFinishGuidanceId}
						onboardingRoleChoices={onboardingRoleChoices}
						selectedWorkspaceRole={selectedWorkspaceRole}
						setSelectedWorkspaceRole={setSelectedWorkspaceRole}
						staffRoleLabels={staffRoleLabels}
						specialtyLabels={specialtyLabels}
						selectedSpecialty={selectedSpecialty}
						setSelectedSpecialty={setSelectedSpecialty}
						dashboard={dashboard}
						clinicModeLabels={clinicModeLabels}
						changeClinicMode={changeClinicMode}
						clinicProfileDraft={clinicProfileDraft}
						updateClinicProfileDraft={updateClinicProfileDraft}
						uiLanguage={uiLanguage}
						setUiLanguage={setUiLanguage}
						normalizeUiLanguageInput={normalizeUiLanguageInput}
						uiLanguageOptions={uiLanguageOptions}
						selectedUiLanguageOption={selectedUiLanguageOption}
						weekdayOptions={weekdayOptions}
						toggleClinicWorkingDay={toggleClinicWorkingDay}
						legalMissingFields={legalMissingFields}
						newStaffName={newStaffName}
						setNewStaffName={setNewStaffName}
						newStaffRole={newStaffRole}
						setNewStaffRole={setNewStaffRole}
						newStaffSpecialty={newStaffSpecialty}
						setNewStaffSpecialty={setNewStaffSpecialty}
						addStaffMember={addStaffMember}
						newStaffReadyToCreate={newStaffReadyToCreate}
						onboardingStaffCreateGuidanceId={
							onboardingStaffCreateGuidanceId
						}
						newChairName={newChairName}
						setNewChairName={setNewChairName}
						addChair={addChair}
						newChairReadyToCreate={newChairReadyToCreate}
						onboardingChairCreateGuidanceId={
							onboardingChairCreateGuidanceId
						}
						staffScheduleDrafts={staffScheduleDrafts}
						staffScheduleDraftFromWorkingHours={
							staffScheduleDraftFromWorkingHours
						}
						staffScheduleSaveStates={staffScheduleSaveStates}
						staffScheduleDirtyIds={staffScheduleDirtyIds}
						staffScheduleSavingId={staffScheduleSavingId}
						updateStaffScheduleDraft={updateStaffScheduleDraft}
						toggleStaffWorkingDay={toggleStaffWorkingDay}
						saveStaffSchedule={saveStaffSchedule}
						chairScheduleDrafts={chairScheduleDrafts}
						chairScheduleSaveStates={chairScheduleSaveStates}
						chairScheduleDirtyIds={chairScheduleDirtyIds}
						chairScheduleSavingId={chairScheduleSavingId}
						updateChairScheduleDraft={updateChairScheduleDraft}
						toggleChairWorkingDay={toggleChairWorkingDay}
						saveChairSchedule={saveChairSchedule}
						pricelistSourceKindLabels={pricelistSourceKindLabels}
						pricelistSourceKind={pricelistSourceKind}
						setPricelistSourceKind={setPricelistSourceKind}
						clearPricelistImage={clearPricelistImage}
						setPricelistAnalysis={setPricelistAnalysis}
						importSourceLabels={importSourceLabels}
						importSourceKind={importSourceKind}
						setImportSourceKind={setImportSourceKind}
						setImportPreview={setImportPreview}
						setImportCommit={setImportCommit}
						smartImportModeLabels={smartImportModeLabels}
						smartImportMode={smartImportMode}
						setSmartImportMode={setSmartImportMode}
						setSmartImportPreview={setSmartImportPreview}
						setSmartImportCommit={setSmartImportCommit}
						ingestionTargetLabels={ingestionTargetLabels}
						documentIngestionTarget={documentIngestionTarget}
						setDocumentIngestionTarget={setDocumentIngestionTarget}
						imagingSourceChoices={imagingSourceChoices}
						imagingImportSourceKind={imagingImportSourceKind}
						imagingSourceLabels={imagingSourceLabels}
						setImagingImportSourceKind={setImagingImportSourceKind}
						setImagingImportPreview={setImagingImportPreview}
						setImagingImportCommit={setImagingImportCommit}
						setDicomSeriesPreview={setDicomSeriesPreview}
						dicomWebEndpointUrl={dicomWebEndpointUrl}
						setDicomWebEndpointUrl={setDicomWebEndpointUrl}
						setDicomWebCheck={setDicomWebCheck}
						setDicomViewerLaunchManifest={setDicomViewerLaunchManifest}
						setDicomViewerToolStateBundle={setDicomViewerToolStateBundle}
						setDicomViewerWorkbenchManifest={
							setDicomViewerWorkbenchManifest
						}
						ohifBaseUrl={ohifBaseUrl}
						setOhifBaseUrl={setOhifBaseUrl}
						setSettingsTab={setSettingsTab}
						telegramStatus={telegramStatus}
						telegramBotUsernameDraft={telegramBotUsernameDraft}
						setTelegramBotUsernameDraft={setTelegramBotUsernameDraft}
						markTelegramSettingsDirty={markTelegramSettingsDirty}
						telegramPatientPortalBaseUrlDraft={
							telegramPatientPortalBaseUrlDraft
						}
						setTelegramPatientPortalBaseUrlDraft={
							setTelegramPatientPortalBaseUrlDraft
						}
						telegramWelcomeImageUrlDraft={telegramWelcomeImageUrlDraft}
						setTelegramWelcomeImageUrlDraft={
							setTelegramWelcomeImageUrlDraft
						}
						telegramReviewUrlDraft={telegramReviewUrlDraft}
						setTelegramReviewUrlDraft={setTelegramReviewUrlDraft}
						telegramMapsUrlDraft={telegramMapsUrlDraft}
						setTelegramMapsUrlDraft={setTelegramMapsUrlDraft}
						telegramTokenTtlDraft={telegramTokenTtlDraft}
						setTelegramTokenTtlDraft={setTelegramTokenTtlDraft}
						telegramReminderLeadTimesDraft={telegramReminderLeadTimesDraft}
						setTelegramReminderLeadTimesDraft={
							setTelegramReminderLeadTimesDraft
						}
						telegramReviewRequestDelayDraft={
							telegramReviewRequestDelayDraft
						}
						setTelegramReviewRequestDelayDraft={
							setTelegramReviewRequestDelayDraft
						}
						telegramPostVisitCheckupDelayFields={
							telegramPostVisitCheckupDelayFields
						}
						telegramPostVisitCheckupDelayDrafts={
							telegramPostVisitCheckupDelayDrafts
						}
						updateTelegramPostVisitCheckupDelayDraft={
							updateTelegramPostVisitCheckupDelayDraft
						}
						telegramAdminSecretDraft={telegramAdminSecretDraft}
						setTelegramAdminSecretDraft={setTelegramAdminSecretDraft}
						unlockTelegramAdminSession={unlockTelegramAdminSession}
						telegramAdminSecretSession={telegramAdminSecretSession}
						telegramPrivacyModeDraft={telegramPrivacyModeDraft}
						setTelegramPrivacyModeDraft={setTelegramPrivacyModeDraft}
						normalizedTelegramPrivacyMode={normalizedTelegramPrivacyMode}
						telegramPrivacyModeLabels={telegramPrivacyModeLabels}
						telegramVisualCardFields={telegramVisualCardFields}
						onboardingTelegramVisualCardKeys={
							onboardingTelegramVisualCardKeys
						}
						telegramVisualCardUrlDrafts={telegramVisualCardUrlDrafts}
						updateTelegramVisualCardUrlDraft={
							updateTelegramVisualCardUrlDraft
						}
						telegramFeatureOptions={telegramFeatureOptions}
						telegramEnabledFeaturesDraft={telegramEnabledFeaturesDraft}
						toggleTelegramFeature={toggleTelegramFeature}
						telegramFeatureLabel={telegramFeatureLabel}
						saveTelegramSettings={saveTelegramSettings}
						isTelegramSettingsSaving={isTelegramSettingsSaving}
						telegramSettingsSaveState={telegramSettingsSaveState}
						telegramSettingsSaveError={telegramSettingsSaveError}
						telegramSettingsDirty={telegramSettingsDirty}
						documentFactoryGroups={documentFactoryGroups}
						onboardingDocumentsReady={onboardingDocumentsReady}
						onboardingBlockingIssues={onboardingBlockingIssues}
						onboardingDocumentReadinessIssues={
							onboardingDocumentReadinessIssues
						}
						onboardingTelegramRecommendations={
							onboardingTelegramRecommendations
						}
						dismissOnboarding={dismissOnboarding}
						saveClinicProfileFromDraft={saveClinicProfileFromDraft}
						clinicProfileSaveState={clinicProfileSaveState}
						previousOnboardingStep={previousOnboardingStep}
						nextOnboardingStep={nextOnboardingStep}
					/>
				</Suspense>
			) : null}
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
							if (typeof window !== "undefined") {
								window.location.hash = "settings/clinic";
							}
						}}
					>
						Заполнить реквизиты
					</button>
				</section>
			) : null}
		</>
	);
}
