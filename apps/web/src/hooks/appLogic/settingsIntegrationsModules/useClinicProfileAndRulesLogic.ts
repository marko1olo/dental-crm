/**
 * apps/web/src/hooks/appLogic/settingsIntegrationsModules/useClinicProfileAndRulesLogic.ts
 *
 * Sub-hook for Clinic Profile drafting & persistence, AI pricelist analysis,
 * communication task completion, and clinical rule creation.
 */

import { useCallback, useEffect, useRef } from "react";
import type {
	CommunicationTaskOutcome,
	Dashboard,
	DentalPricelistAnalysisResponse,
} from "@dental/shared";
import {
	buildClinicProfileUpdatePayload,
	type ClinicProfileDraft,
	clinicProfileDraftFromProfile,
	clinicProfileDraftSignature,
	clinicProfileEndpoint,
	emptyClinicProfileDraft,
	operatorWorkflowFailureMessage,
	responseErrorMessage,
} from "../../../AppHelpers";
import { showToast } from "../../../components/GlobalToast";
import { actionFailureToast } from "../../../lib/panelStateText";
import { useAppStore } from "../../../store/appStore";

export interface UseClinicProfileAndRulesLogicProps {
	auth: any;
	dashboard: Dashboard | null;
	setDashboard: React.Dispatch<React.SetStateAction<Dashboard | null>>;
	loadDashboard: () => Promise<void>;
	setError: (err: string | null) => void;
}

export function useClinicProfileAndRulesLogic({
	auth,
	dashboard,
	setDashboard,
	loadDashboard,
	setError,
}: UseClinicProfileAndRulesLogicProps) {
	const {
		clinicProfileDraft,
		setClinicProfileDraft,
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

	const clinicProfileDraftRef = useRef<ClinicProfileDraft>(
		emptyClinicProfileDraft(),
	);

	useEffect(() => {
		clinicProfileDraftRef.current = clinicProfileDraft;
	}, [clinicProfileDraft]);

	useEffect(() => {
		const profile = dashboard?.clinicSettings?.profile;
		if (!profile || clinicProfileDirty) return;
		setClinicProfileDraft(clinicProfileDraftFromProfile(profile));
	}, [
		dashboard?.clinicSettings?.profile,
		clinicProfileDirty,
		setClinicProfileDraft,
	]);

	const saveClinicProfileFromDraft = useCallback(
		async function saveClinicProfileFromDraft(): Promise<boolean> {
			const effectiveDraft: ClinicProfileDraft = {
				...clinicProfileDraft,
				clinicName:
					clinicProfileDraft.clinicName?.trim() ||
					dashboard?.clinicSettings?.profile?.clinicName?.trim() ||
					clinicProfileDraft.legalName?.trim() ||
					"Клиника DENTE",
			};
			const payload = buildClinicProfileUpdatePayload(effectiveDraft);
			const expectedSignature = clinicProfileDraftSignature(clinicProfileDraft);
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
				showToast("Профиль и реквизиты клиники сохранены", "success");
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
			dashboard?.clinicSettings?.profile?.clinicName,
		],
	);

	const saveClinicProfileIfDirty = useCallback(async (): Promise<boolean> => {
		if (!clinicProfileDirty) return true;
		return saveClinicProfileFromDraft();
	}, [clinicProfileDirty, saveClinicProfileFromDraft]);

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

	return {
		saveClinicProfileFromDraft,
		saveClinicProfileIfDirty,
		analyzePricelist,
		completeCommunicationTask,
		createClinicalRuleFromSettings,
	};
}
