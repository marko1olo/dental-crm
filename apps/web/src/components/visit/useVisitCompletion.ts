/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — Visit Completion & Estimate Assembly Hook
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Автономия врача:
 * 1. Завершение приёма без обязательного участия ассистента или медсестры (assistantUserId: null).
 * 2. Нулевая зависимость от штрихкодов лотков/крафт-пакетов или журналов СанПиН.
 * 3. Мгновенная сборка itemized-сметы и чека 54-ФЗ с точностью до копейки.
 * 4. Генерация СБП QR-кода для оплаты в кресле.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useCallback, useState } from "react";
import {
	completeClinicalVisitAndAssembleEstimate,
	type ClinicalEstimateItem,
	type ClinicalVisitCompletionInput,
	type ClinicalVisitCompletionResult,
	type ProcedureCategory,
} from "./clinicalVisitWorkflow";
import type { DiaryState } from "../useVisitDiaryLogic";

/**
 * Извлекает все фактически выполненные врачом услуги из стора визита
 * (из completedServices и visitToothRecordsByCode) в формате сметы (Мандаты 8b, 8e, 8n).
 */
export function assembleVisitStoreCompletedServices(): ClinicalEstimateItem[] {
	const visitState = useVisitStore.getState();
	const assembled: ClinicalEstimateItem[] = [];

	// 1. Из completedServices стора визита
	for (const [idx, s] of (visitState.completedServices || []).entries()) {
		const code = s.code804n || s.serviceId || "A16.07.002";
		let category: ProcedureCategory = "therapy";
		if (code.startsWith("A11") || code.startsWith("A25")) category = "anesthesia";
		else if (code.startsWith("A06")) category = "diagnostics";
		else if (code.startsWith("A16.07.030") || code.startsWith("A16.07.082")) category = "endodontics";
		else if (code.startsWith("A16.07.001") || code.startsWith("A16.07.097")) category = "surgery";
		else if (code.startsWith("A16.07.050") || code.startsWith("A16.07.051")) category = "hygiene";
		else if (code.startsWith("A16.07.004") || code.startsWith("A16.07.006")) category = "orthopedics";
		else if (code === "A16.07.002.009") category = "isolation";

		assembled.push({
			id: s.serviceId || `srv-store-${idx}-${code}`,
			code,
			name: s.toothNumber ? `${s.name} (зуб ${s.toothNumber})` : s.name,
			quantity: s.quantity || 1,
			priceRub: s.priceRub || 0,
			discountRub: 0,
			totalRub: (s.priceRub || 0) * (s.quantity || 1),
			category,
			toothNumber: s.toothNumber ?? s.toothCode,
		});
	}

	// 2. Из visitToothRecordsByCode (если врач добавлял услуги в структурированные записи зуба)
	for (const [codeStr, rec] of Object.entries(visitState.visitToothRecordsByCode || {})) {
		if (rec.services && rec.services.length > 0) {
			for (const s of rec.services) {
				const isDup = assembled.some(
					(existing) =>
						existing.code === s.code && String(existing.toothNumber ?? "") === codeStr,
				);
				if (!isDup) {
					let category: ProcedureCategory = "therapy";
					if (s.code.startsWith("A11") || s.code.startsWith("A25")) category = "anesthesia";
					else if (s.code.startsWith("A06")) category = "diagnostics";
					else if (s.code.startsWith("A16.07.030") || s.code.startsWith("A16.07.082")) category = "endodontics";
					else if (s.code.startsWith("A16.07.001")) category = "surgery";
					else if (s.code.startsWith("A16.07.004")) category = "orthopedics";

					assembled.push({
						id: `tooth-rec-${codeStr}-${s.code}`,
						code: s.code,
						name: `${s.title} (зуб ${codeStr})`,
						quantity: 1,
						priceRub: s.price || 0,
						discountRub: 0,
						totalRub: s.price || 0,
						category,
						toothNumber: codeStr,
					});
				}
			}
		}
	}

	return assembled;
}
import { useAppStore } from "../../store/appStore";
import { denteAdminSecretRequestHeaders } from "../../AppHelpers";
import { showToast } from "../GlobalToast";
import { logger } from "../../utils/logger";
import { fetchWithHandling } from "../../utils/networkUtils";
import { performAutoVisitBomDeduction } from "../inventory/autoBomDeductionEngine";
import { useInventoryStore } from "../../store/inventoryStore";
import type { AutoVisitBomDeductionResult } from "@dental/shared";
import {
	useVisitStore,
	mapVisitUiStateToToothDataState,
	inferToothStateFromService,
} from "../../store/visitStore";
import {
	loadStoredTeethData,
	saveStoredTeethData,
} from "../odontogram/odontogramStorage";
import {
	createDefaultAdultTeethData,
	type ToothData,
} from "../odontogram/chart/toothChartTypes";

export interface UseVisitCompletionOptions {
	visitId?: string | null | undefined;
	patientId?: string | null | undefined;
	patientName?: string | null | undefined;
	patientPhone?: string | null | undefined;
	doctorName?: string | null | undefined;
	doctorSpecialty?: string | null | undefined;
	clinicName?: string | null | undefined;
	treatmentPlanId?: string | null | undefined;
	stageNumber?: number | null | undefined;
	diary?: DiaryState | {
		anamnesis?: string | null | undefined;
		statusLocalis?: string | null | undefined;
		diagnosisIcd10?: string | null | undefined;
		diagnosisTooth?: string | null | undefined;
		treatmentDescription?: string | null | undefined;
	} | undefined;
	completedPlanItems?: readonly any[] | undefined;
	additionalServices?: readonly ClinicalEstimateItem[] | undefined;
	discountPercent?: number | undefined;
	onCompleteSuccess?: ((result: ClinicalVisitCompletionResult) => void) | undefined;
	onCompleteError?: ((error: unknown) => void) | undefined;
}

export interface UseVisitCompletionReturn {
	isCompleting: boolean;
	completionResult: ClinicalVisitCompletionResult | null;
	completeVisit: (overrideInput?: Partial<ClinicalVisitCompletionInput>) => Promise<ClinicalVisitCompletionResult>;
	resetCompletion: () => void;
}

export function useVisitCompletion(options?: UseVisitCompletionOptions): UseVisitCompletionReturn {
	const [isCompleting, setIsCompleting] = useState<boolean>(false);
	const [completionResult, setCompletionResult] = useState<ClinicalVisitCompletionResult | null>(null);

	const dashboard = useAppStore((s) => s.dashboard);
	const activeDoctorName = useAppStore((s) => s.activeDoctorName);
	const activeVisit = useAppStore((s) => s.dashboard?.activeVisit);

	const resetCompletion = useCallback(() => {
		setCompletionResult(null);
		setIsCompleting(false);
	}, []);

	const completeVisit = useCallback(
		async (overrideInput?: Partial<ClinicalVisitCompletionInput>): Promise<ClinicalVisitCompletionResult> => {
			setIsCompleting(true);
			try {
				const effectiveVisitId =
					overrideInput?.visitId ||
					options?.visitId ||
					activeVisit?.id ||
					`VIS-${Date.now()}`;

				const effectivePatientId =
					overrideInput?.patientId ||
					options?.patientId ||
					activeVisit?.patientId ||
					"pat-unknown";

				const effectivePatientName =
					overrideInput?.patientName ||
					options?.patientName ||
					"Пациент";

				const effectivePatientPhone =
					overrideInput?.patientPhone ||
					options?.patientPhone ||
					"";

				const effectiveDoctorName =
					overrideInput?.doctorName ||
					options?.doctorName ||
					activeDoctorName ||
					"Лечащий врач";

				const effectiveDoctorSpecialty =
					overrideInput?.doctorSpecialty ||
					options?.doctorSpecialty ||
					"Врач-стоматолог";

				const effectiveClinicName =
					overrideInput?.clinicName ||
					options?.clinicName ||
					dashboard?.clinicSettings?.profile?.clinicName ||
					"Стоматологическая клиника «DENTE»";

				const rawDiary = overrideInput?.diary || options?.diary || {};
				const effectiveDiary = {
					anamnesis: rawDiary.anamnesis || "Жалоб на момент осмотра активно не предъявляет.",
					statusLocalis: rawDiary.statusLocalis || "Слизистая оболочка полости рта бледно-розовая, влажная.",
					diagnosisIcd10: rawDiary.diagnosisIcd10 || "Z01.2",
					diagnosisTooth: rawDiary.diagnosisTooth || "",
					treatmentDescription: rawDiary.treatmentDescription || "Проведен осмотр и санация полости рта.",
				};

				const effectiveCompletedPlan =
					overrideInput?.completedPlanItems ||
					options?.completedPlanItems ||
					[];

				const storeServices = assembleVisitStoreCompletedServices();
				const explicitServices =
					overrideInput?.additionalServices ||
					options?.additionalServices ||
					[];
				const effectiveAdditionalServices: ClinicalEstimateItem[] = [...explicitServices];
				for (const stItem of storeServices) {
					const isDup = effectiveAdditionalServices.some(
						(x) =>
							(x.id && x.id === stItem.id) ||
							(x.code && x.code === stItem.code && String(x.toothNumber ?? "") === String(stItem.toothNumber ?? "")),
					);
					if (!isDup) {
						effectiveAdditionalServices.push(stItem);
					}
				}

				const effectiveDiscountPercent =
					overrideInput?.discountPercent !== undefined
						? overrideInput.discountPercent
						: options?.discountPercent ?? 0;

				// Сборка сметы и чека
				const result = completeClinicalVisitAndAssembleEstimate({
					visitId: effectiveVisitId,
					patientId: effectivePatientId,
					patientName: effectivePatientName,
					patientPhone: effectivePatientPhone,
					doctorName: effectiveDoctorName,
					doctorSpecialty: effectiveDoctorSpecialty,
					clinicName: effectiveClinicName,
					diary: effectiveDiary,
					completedPlanItems: effectiveCompletedPlan,
					additionalServices: effectiveAdditionalServices,
					discountPercent: effectiveDiscountPercent,
				});

				// Фоновое автоматическое списание расходных материалов по технологическим картам 804н (Мандат 8e / 8k / 8n)
				let materialsDeduction: AutoVisitBomDeductionResult | undefined;
				try {
					materialsDeduction = await performAutoVisitBomDeduction({
						visitId: effectiveVisitId,
						patientId: effectivePatientId,
						patientFullName: effectivePatientName,
						doctorId: effectiveDoctorName,
						doctorFullName: effectiveDoctorName,
						renderedServices: result.items,
						allowOverdraft: true, // Мягкий овердрафт: дефицит склада никогда не блокирует приём (Мандат 8e, 8n)
						includeStandardPpe: true,
						organizationId: activeVisit?.organizationId || (dashboard as any)?.clinicSettings?.profile?.organizationId || "org-default",
						warehouseItems: useInventoryStore.getState().items as any,
						fetchFn: fetchWithHandling as unknown as typeof fetch,
					});
				} catch (deductionErr) {
					logger.warn("[useVisitCompletion] Фоновое списание материалов выполнено в локальном режиме:", deductionErr);
				}

				const finalResult: ClinicalVisitCompletionResult = {
					...result,
					...(materialsDeduction ? { materialsDeduction } : {}),
				};

				// Опциональная синхронизация с бэкендом (если визит зарегистрирован в БД)
				if (activeVisit?.id && activeVisit.id !== "no-active-visit") {
					try {
						await fetchWithHandling(`/api/visits/${activeVisit.id}/draft/autosave`, {
							method: "PUT",
							headers: {
								"Content-Type": "application/json",
								...denteAdminSecretRequestHeaders(),
							},
							body: JSON.stringify({
								patientId: effectivePatientId,
								transcript: "",
								clientDraftId: `completion-${activeVisit.id}`,
								clientSavedAt: new Date().toISOString(),
								baseRevision: activeVisit.revision ?? null,
							}),
						}).catch((err) => {
							logger.warn("[useVisitCompletion] Мягкое фоновое автосохранение:", err);
						});
					} catch {
						// Не блокируем завершение при сетевой задержке
					}
				}

				// Фоновое завершение наряда приёма на бэкенде (списание склада + закрытие наряда)
				const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
				if (isUuid(effectiveVisitId)) {
					try {
						await fetchWithHandling(`/api/visits/${effectiveVisitId}/complete-work-order`, {
							method: "POST",
							headers: {
								"Content-Type": "application/json",
								...denteAdminSecretRequestHeaders(),
							},
							body: JSON.stringify({ status: "signed" }),
						}).catch((workErr) => {
							logger.warn("[useVisitCompletion] Фоновое закрытие наряда на бэкенде:", workErr);
						});
					} catch {
						// Мягкий режим: сбой сети не блокирует работу врача
					}
				}

				// ── Закрытие позиций плана лечения (Closed Loop: complete-items) ──
				if (isUuid(effectivePatientId)) {
					try {
						let targetPlanId: string | null =
							overrideInput?.treatmentPlanId ||
							options?.treatmentPlanId ||
							(activeVisit as any)?.treatmentPlanId ||
							((dashboard as any)?.activeAppointment as any)?.treatmentPlanId ||
							null;

						const effectiveStage =
							overrideInput?.stageNumber !== undefined
								? overrideInput.stageNumber
								: options?.stageNumber !== undefined
									? options.stageNumber
									: (activeVisit as any)?.stageNumber ?? ((dashboard as any)?.activeAppointment as any)?.stageNumber ?? undefined;

						if (!targetPlanId || !isUuid(targetPlanId)) {
							const plansRes = await fetchWithHandling(
								`/api/patients/${effectivePatientId}/treatment-plans`,
								{
									method: "GET",
									headers: {
										...denteAdminSecretRequestHeaders(),
									},
								},
							).catch(() => null);

							const planList = Array.isArray((plansRes as any)?.plans)
								? (plansRes as any).plans
								: Array.isArray(plansRes)
									? (plansRes as any)
									: [];

							if (planList.length > 0) {
								if (targetPlanId) {
									const matched = planList.find(
										(p: any) =>
											p.id === targetPlanId ||
											String(p.planNumber || "").toLowerCase() === String(targetPlanId).toLowerCase() ||
											String(p.title || "").toLowerCase().includes(String(targetPlanId).toLowerCase()),
									);
									if (matched?.id) targetPlanId = matched.id;
								}
								if (!targetPlanId || !isUuid(targetPlanId)) {
									const activePlan =
										planList.find((p: any) => p.status === "Active" || p.status === "Approved") ||
										planList.find((p: any) => p.status === "Draft") ||
										planList[0];
									if (activePlan?.id) targetPlanId = activePlan.id;
								}
							}
						}

						if (targetPlanId && isUuid(targetPlanId)) {
							const planItemIds = (effectiveCompletedPlan || [])
								.map((x: any) => String(x.id || x.itemId || ""))
								.filter(Boolean);

							await fetchWithHandling(
								`/api/patients/${effectivePatientId}/treatment-plans/${targetPlanId}/complete-items`,
								{
									method: "POST",
									headers: {
										"Content-Type": "application/json",
										...denteAdminSecretRequestHeaders(),
									},
									body: JSON.stringify({
										visitId: isUuid(effectiveVisitId) ? effectiveVisitId : undefined,
										phase: effectiveStage ? Number(effectiveStage) : undefined,
										itemIds: planItemIds.length > 0 ? planItemIds : undefined,
										renderedServices: result.items.map((it) => ({
											code: it.code,
											name: it.name,
											toothNumber: it.toothNumber,
										})),
									}),
								},
							).catch((planErr) => {
								logger.warn("[useVisitCompletion] Мягкое фоновое завершение позиций плана лечения:", planErr);
							});

							if (typeof window !== "undefined") {
								window.dispatchEvent(
									new CustomEvent("dente-treatment-plans-reload", {
										detail: {
											patientId: effectivePatientId,
											planId: targetPlanId,
											visitId: effectiveVisitId,
										},
									}),
								);
							}
						}
					} catch (planLifecycleErr) {
						logger.warn("[useVisitCompletion] Ошибка в цикле завершения позиций плана лечения:", planLifecycleErr);
					}
				}

				// ── Фиксация вылеченных зубов в истории одонтограммы (POST /api/patients/:id/tooth-states/batch) ──
				if (effectivePatientId && effectivePatientId !== "pat-unknown") {
					try {
						const visitState = useVisitStore.getState();
						const treatedTeethMap = new Map<number, { state: string; reason: string }>();

						// 1. Из структурированных записей зубов текущего визита
						for (const [codeStr, record] of Object.entries(visitState.visitToothRecordsByCode)) {
							const num = Number.parseInt(codeStr, 10);
							if (!Number.isFinite(num)) continue;
							if (record.state && record.state !== "idle" && record.state !== "watch") {
								const clinicalState = mapVisitUiStateToToothDataState(record.state);
								const srvNames = (record.services || []).map((s) => s.title).filter(Boolean);
								const reason =
									srvNames.length > 0
										? srvNames.join(", ")
										: record.diagnosis || `Лечение зуба ${num}`;
								treatedTeethMap.set(num, { state: clinicalState, reason });
							}
						}

						// 2. Из выполненных услуг сметы текущего визита
						for (const item of result.items) {
							let toothNum: number | null = null;
							if (item.toothNumber !== undefined && item.toothNumber !== null) {
								const parsed = Number.parseInt(String(item.toothNumber), 10);
								if (Number.isFinite(parsed) && parsed > 0) toothNum = parsed;
							}
							if (!toothNum && item.name) {
								const match = item.name.match(/(?:\(?зуб(?:ы)?\s+([A-Za-z0-9]+)\)?|^зуб(?:ы)?\s+([A-Za-z0-9]+):)/i);
								if (match) {
									const parsed = Number.parseInt(match[1] || match[2] || "", 10);
									if (Number.isFinite(parsed) && parsed > 0) toothNum = parsed;
								}
							}
							if (toothNum) {
								const existing = treatedTeethMap.get(toothNum);
								const uiState = inferToothStateFromService({
									code: item.code || "",
									title: item.name,
								});
								const clinicalState = mapVisitUiStateToToothDataState(uiState);
								const reason = existing
									? `${existing.reason}; ${item.name}`
									: item.name;
								treatedTeethMap.set(toothNum, {
									state: existing?.state || clinicalState,
									reason,
								});
							}
						}

						// 3. Из completedServices стора визита
						for (const srv of visitState.completedServices) {
							const toothCandidate = srv.toothNumber ?? srv.toothCode;
							if (toothCandidate !== undefined && toothCandidate !== null) {
								const parsed = Number.parseInt(String(toothCandidate), 10);
								if (Number.isFinite(parsed) && parsed > 0) {
									const existing = treatedTeethMap.get(parsed);
									const uiState = inferToothStateFromService({ code: srv.code804n, title: srv.name });
									const clinicalState = mapVisitUiStateToToothDataState(uiState);
									const reason = existing ? existing.reason : srv.name;
									treatedTeethMap.set(parsed, {
										state: existing?.state || clinicalState,
										reason,
									});
								}
							}
						}

						// Обновление локального хранилища ToothChart и диспетчеризация
						if (treatedTeethMap.size > 0) {
							const existingTeeth =
								loadStoredTeethData(effectivePatientId) || createDefaultAdultTeethData();
							const updatedTeeth: ToothData[] = [...existingTeeth];

							for (const [toothNum, info] of treatedTeethMap.entries()) {
								const idx = updatedTeeth.findIndex((t) => t.toothNumber === toothNum);
								if (idx >= 0 && updatedTeeth[idx]) {
									updatedTeeth[idx] = {
										...updatedTeeth[idx],
										toothNumber: toothNum,
										state: info.state as any,
										updatedAt: new Date().toISOString(),
									};
								} else {
									updatedTeeth.push({
										toothNumber: toothNum,
										state: info.state as any,
										updatedAt: new Date().toISOString(),
									});
								}
							}
							saveStoredTeethData(effectivePatientId, updatedTeeth, true);

							if (typeof window !== "undefined") {
								window.dispatchEvent(
									new CustomEvent("dente-odontogram-update", {
										detail: {
											patientId: effectivePatientId,
											states: updatedTeeth,
											teeth: updatedTeeth,
										},
									}),
								);
							}

							// Группировка по целевому клиническому статусу и фиксация перехода в PostgreSQL (tooth_state_history)
							const stateGroups = new Map<string, { teeth: number[]; reasons: string[] }>();
							for (const [toothNum, info] of treatedTeethMap.entries()) {
								const group = stateGroups.get(info.state) || { teeth: [], reasons: [] };
								group.teeth.push(toothNum);
								if (info.reason && !group.reasons.includes(info.reason)) {
									group.reasons.push(info.reason);
								}
								stateGroups.set(info.state, group);
							}

							for (const [targetState, group] of stateGroups.entries()) {
								await fetchWithHandling(`/api/patients/${effectivePatientId}/tooth-states/batch`, {
									method: "POST",
									headers: {
										"Content-Type": "application/json",
										...denteAdminSecretRequestHeaders(),
									},
									body: JSON.stringify({
										toothNumbers: group.teeth,
										state: targetState,
										visitId: effectiveVisitId,
										reason: group.reasons.join("; ") || "Завершение визита и оказание услуг",
									}),
								}).catch((batchErr) => {
									logger.warn("[useVisitCompletion] Мягкое фоновое обновление статуса зубов:", batchErr);
								});
							}
						}
					} catch (toothHistoryErr) {
						logger.warn("[useVisitCompletion] Ошибка синхронизации истории одонтограммы:", toothHistoryErr);
					}
				}

				setCompletionResult(finalResult);
				showToast(`Приём завершён! ${finalResult.statusBannerText}`, "success", 4500);
				options?.onCompleteSuccess?.(finalResult);

				return finalResult;
			} catch (error) {
				logger.error("[useVisitCompletion] Ошибка при завершении визита:", error);
				showToast("Ошибка при формировании сметы и чека визита", "error", 4000);
				options?.onCompleteError?.(error);
				throw error;
			} finally {
				setIsCompleting(false);
			}
		},
		[options, activeVisit, activeDoctorName, dashboard],
	);

	return {
		isCompleting,
		completionResult,
		completeVisit,
		resetCompletion,
	};
}
