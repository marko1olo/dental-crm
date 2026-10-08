import { useCallback, useEffect, useMemo, useRef } from "react";
import type {
	CommunicationTaskOutcome,
	Dashboard,
	DentalPricelistAnalysisResponse,
	DenteTelegramChatLinkPublic,
} from "@dental/shared";
import {
	buildClinicProfileUpdatePayload,
	type ClinicProfileDraft,
	clinicProfileDraftFromProfile,
	clinicProfileDraftSignature,
	clinicProfileEndpoint,
	emptyClinicProfileDraft,
	isTelegramOutboxItemDueForUi,
	type OnboardingStep,
	operatorWorkflowFailureMessage,
	responseErrorMessage,
	type VisitNoteForm,
} from "../../AppHelpers";
import { showToast } from "../../components/GlobalToast";
import { actionFailureToast } from "../../lib/panelStateText";
import { buildMprAxisGuidance, mprProjectionCompassLabels } from "../../mprControlMath";
import { useAppStore } from "../../store/appStore";
import { useSettingsStore } from "../../store/settingsStore";
import { useImagingStore } from "../../store/imagingStore";
import type { AppView } from "../../utils/routeUtils";
import { useDicomWorkbenchModule } from "../domains/useDicomWorkbenchModule";
import { useDocumentWorkflowModule } from "../domains/useDocumentWorkflowModule";
import { useTelegramModule } from "../domains/useTelegramModule";
import type { SettingsAndIntegrationsLogicSlice } from "./types";

interface UseSettingsAndIntegrationsLogicProps {
	auth: any;
	dashboard: Dashboard | null;
	setDashboard: React.Dispatch<React.SetStateAction<Dashboard | null>>;
	loadDashboard: () => Promise<void>;
	setError: (err: string | null) => void;
	currentView: AppView;
	setCurrentView: (view: AppView) => void;
	settingsTab: string;
	onboardingDismissed: boolean;
	onboardingStep: OnboardingStep;
	activePatient: any;
	activeDoctor: any;
	activeAppointment: any;
	documentPatient: any;
	selectedPatientId: string;
	uiPreferencesHydrated: boolean;
	setSelectedDocumentKind: (kind: any) => void;
	activePayments: any[];
	activeTreatmentPlanItems: any[];
	visitNoteForm: VisitNoteForm;
	clinicalAdminSecretSession: string;
	settingsAdminSecretSession: string;
}

export function useSettingsAndIntegrationsLogic({
	auth,
	dashboard,
	setDashboard,
	loadDashboard,
	setError,
	currentView,
	setCurrentView,
	settingsTab,
	onboardingDismissed,
	onboardingStep,
	activePatient,
	activeDoctor,
	activeAppointment,
	documentPatient,
	selectedPatientId,
	uiPreferencesHydrated,
	setSelectedDocumentKind,
	activePayments,
	activeTreatmentPlanItems,
	visitNoteForm,
	clinicalAdminSecretSession,
	settingsAdminSecretSession,
}: UseSettingsAndIntegrationsLogicProps): SettingsAndIntegrationsLogicSlice {
	const {
		clinicProfileDraft,
		setClinicProfileDraft,
		clinicProfileSaveState,
		setClinicProfileSaveState,
		clinicProfileDirty,
		setClinicProfileDirty,
		pricelistText,
		pricelistSourceKind,
		usePricelistAi,
		setPricelistAnalysis,
		pricelistImageBase64,
		pricelistImageMimeType,
		pricelistImageName,
		isPricelistAnalyzing,
		setIsPricelistAnalyzing,
		communicationSavingTaskId,
		setCommunicationSavingTaskId,
		communicationNote,
		newRuleTitle,
		setNewRuleTitle,
		newRuleAction,
		newRuleSeverity,
		newRuleOwnerRole,
		newRuleSpecialty,
		newRuleCategory,
		newRuleTriggerServiceId,
		newRuleRequiredServiceId,
		newRuleCompletedServiceId,
		newRuleBlockedServiceId,
		newRuleWarningText,
		setNewRuleWarningText,
		newRulePatientText,
		isClinicalRuleSaving,
		setIsClinicalRuleSaving,
	} = useAppStore();

	const {
		telegramOutbox,
		telegramOutboxStatusFilter,
		telegramOutboxTemplateFilter,
		telegramLinkStaffId,
		setTelegramLinkStaffId,
		telegramLinkSubjectType,
		telegramModeDraft,
		telegramBotConfigId,
		telegramLinkCode,
		setTelegramLinkCode,
		telegramLinkActionState,
		setTelegramLinkActionState,
	} = useSettingsStore();

	const {
		imagingKindFilter,
		mprProjection,
		mprAxisDeg,
		mprSlabMm,
	} = useImagingStore();

	const clinicProfileDraftRef = useRef<ClinicProfileDraft>(
		emptyClinicProfileDraft(),
	);

	useEffect(() => {
		clinicProfileDraftRef.current = clinicProfileDraft;
	}, [clinicProfileDraft]);

	const saveClinicProfileFromDraft = useCallback(
		async function saveClinicProfileFromDraft(): Promise<boolean> {
			const payload = buildClinicProfileUpdatePayload(clinicProfileDraft);
			const expectedSignature = clinicProfileDraftSignature(clinicProfileDraft);
			if (!payload.clinicName?.trim()) {
				setError("Укажите рабочее название клиники.");
				setClinicProfileSaveState("error");
				return false;
			}
			setClinicProfileSaveState("saving");
			try {
				const response = await fetch(clinicProfileEndpoint, {
					method: "PUT",
					headers: auth.settingsAccessHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify(payload),
				});
				if (!response.ok)
					throw new Error(
						await responseErrorMessage(response, "Профиль клиники не сохранен"),
					);
				const clinicSettings =
					(await response.json()) as Dashboard["clinicSettings"];
				setDashboard((current) =>
					current
						? {
								...current,
								clinicName: clinicSettings?.profile?.clinicName ?? "",
								clinicSettings,
							}
						: current,
				);
				const latestMatchesSaved =
					clinicProfileDraftSignature(clinicProfileDraftRef.current) ===
					expectedSignature;
				if (latestMatchesSaved) {
					setClinicProfileDraft(
						clinicProfileDraftFromProfile(clinicSettings?.profile),
					);
					setClinicProfileDirty(false);
				}
				setClinicProfileSaveState(latestMatchesSaved ? "saved" : "idle");
				setError(null);
				return true;
			} catch (saveError) {
				showToast(
					actionFailureToast(
						"Профиль клиники не сохранен",
						(saveError as { status?: number })?.status ?? null,
					),
					"error",
				);
				const message = operatorWorkflowFailureMessage(
					"Профиль клиники не сохранен",
					saveError,
				);
				setClinicProfileSaveState("error");
				setError(message);
				return false;
			}
		},
		[
			clinicProfileDraft,
			auth,
			setClinicProfileDraft,
			setError,
			setClinicProfileSaveState,
			setDashboard,
			setClinicProfileDirty,
		],
	);

	const saveClinicProfileIfDirty = useCallback(async (): Promise<boolean> => {
		if (!clinicProfileDirty) return true;
		return saveClinicProfileFromDraft();
	}, [clinicProfileDirty, saveClinicProfileFromDraft]);

	const activeImagingStudies = useMemo(() => {
		if (!dashboard?.imagingStudies?.length) return [];
		const patientId = documentPatient?.id ?? selectedPatientId;
		if (!patientId) return dashboard.imagingStudies;
		return (
			dashboard.imagingStudies.filter(
				(study) => study.patientId === patientId,
			) ?? []
		);
	}, [dashboard?.imagingStudies, documentPatient?.id, selectedPatientId]);

	const visibleImagingStudies = useMemo(() => {
		if (imagingKindFilter === "all") return activeImagingStudies;
		return activeImagingStudies.filter((study) => study.kind === imagingKindFilter);
	}, [activeImagingStudies, imagingKindFilter]);

	const mprProjectionCompass = useMemo(() => {
		return mprProjectionCompassLabels(mprProjection);
	}, [mprProjection]);

	const dicomWorkbenchModule = useDicomWorkbenchModule({
		auth,
		currentView,
		visibleImagingStudies,
	});

	const { selectedImagingStudy } = dicomWorkbenchModule;

	const mprAxisGuidance = useMemo(() => {
		return buildMprAxisGuidance({
			canOpenMpr: Boolean(selectedImagingStudy?.kind === "cbct"),
			axisDeg: mprAxisDeg ?? 0,
			slabMm: mprSlabMm ?? 1,
			sliceFraction: 0.5,
		});
	}, [selectedImagingStudy?.kind, mprAxisDeg, mprSlabMm]);

	const documentWorkflow = useDocumentWorkflowModule({
		dashboard,
		auth,
		activeDoctor,
		activePayments,
		activeTreatmentPlanItems,
		documentPatient,
		clinicProfileDraft,
		activeAppointment,
		visitNoteForm,
		clinicalAdminSecretSession,
		setError,
		loadDashboard,
		setCurrentView,
	});

	const telegram = useTelegramModule({
		settingsAdminSecretSession,
		loadDashboard,
		setError,
		dashboard,
		currentView,
		settingsTab,
		onboardingDismissed,
		onboardingStep,
		activePatient,
		activeDoctor,
		activeAppointment,
		uiPreferencesHydrated,
		setCurrentView,
		setSelectedDocumentKind,
	});

	const { telegramSettingsModule } = telegram;

	const analyzePricelist = useCallback(async () => {
		if (isPricelistAnalyzing) return;
		const rawText = (pricelistText ?? "").trim();
		const imageBase64 = pricelistImageBase64 || undefined;
		if (!rawText && !imageBase64) {
			setError("Вставьте прайс текстом или приложите фото прайса.");
			return;
		}
		setIsPricelistAnalyzing(true);
		try {
			const response = await fetch("/api/pricelist/analyze", {
				method: "POST",
				headers: auth.denteClinicalReadHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					sourceName: pricelistImageName || "manual-pricelist",
					sourceKind: pricelistSourceKind,
					rawText,
					...(imageBase64
						? {
								imageBase64,
								imageMimeType: pricelistImageMimeType || "image/jpeg",
							}
						: {}),
					useServerAi: Boolean(usePricelistAi),
				}),
			});
			if (!response.ok)
				throw new Error(
					await responseErrorMessage(response, "Прайс-лист не разобран"),
				);
			const analysis = (await response.json()) as DentalPricelistAnalysisResponse;
			if (
				!analysis ||
				!Array.isArray(analysis.items) ||
				!Array.isArray(analysis.summary) ||
				!Array.isArray(analysis.warnings)
			)
				throw new Error(
					"Прайс-лист не разобран: сервер вернул ответ без разобранных позиций.",
				);
			setPricelistAnalysis(analysis);
			setError(null);
		} catch (analysisError) {
			showToast(
				actionFailureToast(
					"Прайс-лист не разобран",
					(analysisError as { status?: number })?.status ?? null,
				),
				"error",
			);
			setError(
				operatorWorkflowFailureMessage(
					"Прайс-лист не разобран",
					analysisError,
				),
			);
		} finally {
			setIsPricelistAnalyzing(false);
		}
	}, [
		auth,
		isPricelistAnalyzing,
		pricelistImageBase64,
		pricelistImageMimeType,
		pricelistImageName,
		pricelistSourceKind,
		pricelistText,
		setError,
		setIsPricelistAnalyzing,
		setPricelistAnalysis,
		usePricelistAi,
	]);

	const completeCommunicationTask = useCallback(
		async (taskId: string, outcome: CommunicationTaskOutcome) => {
			if (communicationSavingTaskId) {
				setError("Дождитесь завершения текущего закрытия задачи связи.");
				return;
			}
			if (!outcome) {
				setError(
					"Выберите исход задачи связи: нет ответа, перезвонить, перенос, обещал оплату или выдача документов.",
				);
				return;
			}
			setCommunicationSavingTaskId(taskId);
			try {
				const response = await fetch("/api/communications/tasks/complete", {
					method: "POST",
					headers: auth.denteClinicalMutationHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({
						taskId,
						outcome,
						note: communicationNote.trim() || "Задача связи закрыта.",
					}),
				});
				if (!response.ok) {
					const errMsg = await responseErrorMessage(
						response,
						"Задача связи не закрыта",
					);
					setError(errMsg);
					return;
				}
				await loadDashboard();
				setError(null);
			} catch (communicationError) {
				showToast(
					actionFailureToast(
						"Задача связи не закрыта",
						(communicationError as { status?: number })?.status ?? null,
					),
					"error",
				);
				setError(
					operatorWorkflowFailureMessage(
						"Задача связи не закрыта",
						communicationError,
					),
				);
			} finally {
				setCommunicationSavingTaskId(null);
			}
		},
		[
			auth,
			communicationNote,
			communicationSavingTaskId,
			loadDashboard,
			setCommunicationSavingTaskId,
			setError,
		],
	);

	const createClinicalRuleFromSettings = useCallback(async () => {
		if (isClinicalRuleSaving) {
			setError("Дождитесь завершения текущего сохранения правила.");
			return;
		}
		if (!newRuleTitle.trim()) {
			setError("Укажите название клинического правила.");
			return;
		}
		setIsClinicalRuleSaving(true);
		try {
			const response = await fetch("/api/clinical/rules", {
				method: "POST",
				headers: auth.denteClinicalMutationHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					title: newRuleTitle.trim(),
					action: newRuleAction,
					severity: newRuleSeverity,
					ownerRole: newRuleOwnerRole || undefined,
					specialty: newRuleSpecialty || undefined,
					category: newRuleCategory || undefined,
					triggerServiceIds: newRuleTriggerServiceId
						? [newRuleTriggerServiceId]
						: [],
					requiredServiceIds: newRuleRequiredServiceId
						? [newRuleRequiredServiceId]
						: [],
					requiresCompletedServiceIds: newRuleCompletedServiceId
						? [newRuleCompletedServiceId]
						: [],
					blockedServiceIds: newRuleBlockedServiceId
						? [newRuleBlockedServiceId]
						: [],
					warningText: newRuleWarningText.trim() || undefined,
					patientText: newRulePatientText?.trim() || "",
				}),
			});
			if (!response.ok) {
				setError(
					await responseErrorMessage(
						response,
						"Не удалось создать клиническое правило",
					),
				);
				return;
			}
			await loadDashboard();
			setError(null);
			setNewRuleTitle("");
			setNewRuleWarningText("");
		} catch (ruleError) {
			showToast(
				actionFailureToast(
					"Не удалось создать клиническое правило",
					(ruleError as { status?: number })?.status ?? null,
				),
				"error",
			);
			setError(
				operatorWorkflowFailureMessage(
					"Не удалось создать клиническое правило",
					ruleError,
				),
			);
		} finally {
			setIsClinicalRuleSaving(false);
		}
	}, [
		auth,
		isClinicalRuleSaving,
		loadDashboard,
		newRuleAction,
		newRuleBlockedServiceId,
		newRuleCategory,
		newRuleCompletedServiceId,
		newRuleOwnerRole,
		newRulePatientText,
		newRuleRequiredServiceId,
		newRuleSeverity,
		newRuleSpecialty,
		newRuleTitle,
		newRuleTriggerServiceId,
		newRuleWarningText,
		setError,
		setIsClinicalRuleSaving,
		setNewRuleTitle,
		setNewRuleWarningText,
	]);

	const telegramLinkStaffOptions = useMemo(
		() =>
			(dashboard?.clinicSettings?.staff || []).filter(
				(member) => member.active,
			) ?? [],
		[dashboard],
	);

	const filteredTelegramOutboxItems = useMemo(() => {
		const items = telegramOutbox?.items ?? [];
		return items.filter((item) => {
			if (telegramOutboxStatusFilter === "due") {
				if (
					item.deliveryStatus !== "ready" ||
					!isTelegramOutboxItemDueForUi(item)
				)
					return false;
			} else if (
				telegramOutboxStatusFilter !== "all" &&
				item.deliveryStatus !== telegramOutboxStatusFilter
			) {
				return false;
			}
			if (
				telegramOutboxTemplateFilter !== "all" &&
				item.templateKind !== telegramOutboxTemplateFilter
			)
				return false;
			return true;
		});
	}, [
		telegramOutbox,
		telegramOutboxStatusFilter,
		telegramOutboxTemplateFilter,
	]);

	const visibleTelegramOutboxItems = filteredTelegramOutboxItems;
	const hiddenTelegramOutboxItemCount = Math.max(
		0,
		(telegramOutbox?.filteredCount ?? filteredTelegramOutboxItems.length) -
			visibleTelegramOutboxItems.length,
	);

	useEffect(() => {
		if (!dashboard) return;
		if (
			telegramLinkStaffId &&
			telegramLinkStaffOptions.some(
				(member) => member.id === telegramLinkStaffId,
			)
		)
			return;
		setTelegramLinkStaffId(telegramLinkStaffOptions[0]?.id ?? "");
	}, [
		dashboard,
		telegramLinkStaffId,
		telegramLinkStaffOptions,
		setTelegramLinkStaffId,
	]);

	const telegramLinkTargetKey = `${telegramLinkSubjectType}:${telegramLinkSubjectType === "patient" ? (activePatient?.id ?? "") : telegramLinkStaffId || ""}:${telegramModeDraft}:${(telegramBotConfigId ?? "").trim()}`;
	const previousTelegramLinkTargetKeyRef = useRef(telegramLinkTargetKey);

	useEffect(() => {
		if (previousTelegramLinkTargetKeyRef.current === telegramLinkTargetKey)
			return;
		previousTelegramLinkTargetKeyRef.current = telegramLinkTargetKey;
		if (!telegramLinkCode && !telegramLinkActionState) return;
		setTelegramLinkCode(null);
		setTelegramLinkActionState(null);
	}, [
		telegramLinkActionState,
		telegramLinkCode,
		telegramLinkTargetKey,
		setTelegramLinkCode,
		setTelegramLinkActionState,
	]);

	const telegramSubjectName = useCallback(
		(
			subjectType: DenteTelegramChatLinkPublic["subjectType"],
			subjectId: string,
		): string => {
			if (subjectType === "patient") {
				return (
					dashboard?.patients?.find((patient) => patient.id === subjectId)
						?.fullName ?? "Пациент"
				);
			}
			return (
				dashboard?.clinicSettings?.staff?.find(
					(member) => member.id === subjectId,
				)?.fullName ?? "Сотрудник"
			);
		},
		[dashboard],
	);

	return {
		saveClinicProfileFromDraft,
		saveClinicProfileIfDirty,
		analyzePricelist,
		completeCommunicationTask,
		createClinicalRuleFromSettings,
		documentWorkflow,
		dicomWorkbenchModule,
		telegram,
		telegramSettingsModule,
		visibleImagingStudies,
		mprProjectionCompass,
		mprAxisGuidance,
	};
}
