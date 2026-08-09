import { useState, useCallback, useMemo, useRef, useEffect } from "react";
// Add any other necessary imports later

import {
    buildClinicProfileUpdatePayload,
    clinicProfileDraftSignature,
    clinicProfileDraftFromProfile,
    clinicProfileEndpoint,
} from "../../AppHelpers";
import type { Dashboard } from "@dental/shared";

import type { ClinicProfileDraft } from "../../AppHelpers";
import {
	normalizeWorkingDaysDraft,
	defaultStaffScheduleDraft,
	responseErrorMessage,
	operatorWorkflowFailureMessage
} from "../../AppHelpers";
import { actionFailureToast } from "../../lib/panelStateText";

export function useClinicSettingsLogic({
    setClinicProfileDirty,
    setClinicProfileSaveState,
    staffScheduleDrafts,
    updateStaffScheduleDraft,
    chairScheduleDrafts,
    updateChairScheduleDraft,
    clinicProfileDirty,
    showToast,
    dashboard,
    clinicProfileDraft,
    setClinicProfileDraft,
    isClinicProfileSaving,
    setIsClinicProfileSaving,
    isClinicalRuleSaving,
    setIsClinicalRuleSaving,
    serviceCatalogSavingId,
    setServiceCatalogSavingId,
    loadDashboard,
    setError,
    auth,
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
    setDashboard,
    clinicProfileDraftRef,
}: any) {



	function updateClinicProfileDraft<K extends keyof ClinicProfileDraft>(
		key: K,
		value: ClinicProfileDraft[K],
	) {
		setClinicProfileDraft((current) => ({ ...current, [key]: value }));
		setClinicProfileDirty(true);
		setClinicProfileSaveState("idle");
	}


	function toggleClinicWorkingDay(day: number) {
		setClinicProfileDraft((current) => {
			const nextDays = current.workingDays.includes(day)
				? current.workingDays.filter((item) => item !== day)
				: [...current.workingDays, day];
			return { ...current, workingDays: normalizeWorkingDaysDraft(nextDays) };
		});
		setClinicProfileDirty(true);
		setClinicProfileSaveState("idle");
	}


	function toggleStaffWorkingDay(staffId: string, day: number) {
		const currentDraft =
			staffScheduleDrafts[staffId] ?? defaultStaffScheduleDraft();
		const workingDays = currentDraft.workingDays.includes(day)
			? currentDraft.workingDays.filter((item) => item !== day)
			: [...currentDraft.workingDays, day];
		updateStaffScheduleDraft(staffId, {
			workingDays: normalizeWorkingDaysDraft(workingDays),
		});
	}


	function toggleChairWorkingDay(chairId: string, day: number) {
		const currentDraft =
			chairScheduleDrafts[chairId] ?? defaultStaffScheduleDraft();
		const workingDays = currentDraft.workingDays.includes(day)
			? currentDraft.workingDays.filter((item) => item !== day)
			: [...currentDraft.workingDays, day];
		updateChairScheduleDraft(chairId, {
			workingDays: normalizeWorkingDaysDraft(workingDays),
		});
	}


	

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
	async function saveClinicProfileIfDirty(): Promise<boolean> {
		if (!clinicProfileDirty) return true;
		return saveClinicProfileFromDraft();
	}


	async function removeClinicalRule(ruleId: string) {
		if (!dashboard) return;
		if (isClinicalRuleSaving) return;
		setIsClinicalRuleSaving(true);
		try {
			const response = await fetch(`/api/clinical/rules/${ruleId}`, {
				method: "DELETE",
				headers: auth.denteClinicalMutationHeaders(),
			});
			if (!response.ok) {
				throw new Error(
					await responseErrorMessage(response, "Ошибка при удалении"),
				);
			}
			await loadDashboard();
		} catch (ruleError) {
			setError(
				operatorWorkflowFailureMessage("Ошибка удаления правила", ruleError),
			);
		} finally {
			setIsClinicalRuleSaving(false);
		}
	}


	async function createServiceCatalogItem(data: any) {
		try {
			const response = await fetch("/api/settings/catalog", {
				method: "POST",
				headers: auth.settingsAccessHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify(data),
			});
			if (!response.ok) {
				setError(
					await responseErrorMessage(response, "Ошибка создания услуги"),
				);
				return;
			}
			await loadDashboard();
		} catch (error) {
			setError("Сбой сети при создании услуги");
		}
	}


	async function updateServiceCatalogItem(serviceId: string, updates: any) {
		try {
			const response = await fetch(`/api/settings/catalog/${serviceId}`, {
				method: "PUT",
				headers: auth.settingsAccessHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify(updates),
			});
			if (!response.ok) {
				setError(
					await responseErrorMessage(response, "Ошибка обновления услуги"),
				);
				return;
			}
			await loadDashboard();
		} catch (error) {
			setError("Сбой сети при обновлении услуги");
		}
	}


	async function deleteServiceCatalogItem(serviceId: string) {
		try {
			const response = await fetch(`/api/settings/catalog/${serviceId}`, {
				method: "DELETE",
				headers: auth.settingsAccessHeaders(),
			});
			if (!response.ok) {
				setError(
					await responseErrorMessage(response, "Ошибка удаления услуги"),
				);
				return;
			}
			await loadDashboard();
		} catch (error) {
			setError("Сбой сети при удалении услуги");
		}
	}


	async function createClinicalRuleFromSettings() {
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
	}

    return {
        updateClinicProfileDraft,
        toggleClinicWorkingDay,
        toggleStaffWorkingDay,
        toggleChairWorkingDay,
        saveClinicProfileFromDraft,
        saveClinicProfileIfDirty,
        removeClinicalRule,
        createServiceCatalogItem,
        updateServiceCatalogItem,
        deleteServiceCatalogItem,
        createClinicalRuleFromSettings
    };
}
