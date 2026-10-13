/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — Visit Completion Pipeline
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Асинхронный пайплайн пост-завершения визита (Мандаты 8e, 8k, 8n):
 * 1. Списание расходных материалов BOM по технологическим картам 804н
 * 2. Фоновое автосохранение черновика приёма
 * 3. Завершение наряда-заказа приёма (complete-work-order)
 * 4. Закрытие выполненных позиций плана лечения (complete-items)
 * 5. Фиксация вылеченных зубов в истории одонтограммы (tooth-states batch)
 * 
 * Отказоустойчивость: сбои сети или отдельных фоновых микросервисов
 * НИКОГДА не блокируют врача и не прерывают завершение приёма (Soft Mode).
 */

import { denteAdminSecretRequestHeaders } from "../../../AppHelpers";
import { logger } from "../../../utils/logger";
import { fetchWithHandling } from "../../../utils/networkUtils";
import { performAutoVisitBomDeduction } from "../../inventory/autoBomDeductionEngine";
import { useInventoryStore } from "../../../store/inventoryStore";
import type { AutoVisitBomDeductionResult } from "@dental/shared";
import {
	useVisitStore,
	mapVisitUiStateToToothDataState,
	inferToothStateFromService,
} from "../../../store/visitStore";
import {
	loadStoredTeethData,
	saveStoredTeethData,
} from "../../odontogram/odontogramStorage";
import {
	createDefaultAdultTeethData,
	type ToothData,
} from "../../odontogram/chart/toothChartTypes";
import type { ClinicalVisitCompletionResult } from "../clinicalVisitWorkflow";

export interface VisitPostCompletionContext {
	effectiveVisitId: string;
	effectivePatientId: string;
	effectivePatientName: string;
	effectiveDoctorName: string;
	effectiveDiary: {
		anamnesis: string;
		statusLocalis: string;
		diagnosisIcd10: string;
		diagnosisTooth: string;
		treatmentDescription: string;
	};
	effectiveCompletedPlan: readonly any[];
	targetPlanId?: string | null | undefined;
	stageNumber?: number | null | undefined;
	activeVisit?: any;
	dashboard?: any;
	result: ClinicalVisitCompletionResult;
}

const isUuid = (id: string): boolean =>
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

/**
 * 1. Фоновое списание расходных материалов BOM
 */
export async function executeBomDeduction(
	ctx: VisitPostCompletionContext,
): Promise<AutoVisitBomDeductionResult | undefined> {
	try {
		return await performAutoVisitBomDeduction({
			visitId: ctx.effectiveVisitId,
			patientId: ctx.effectivePatientId,
			patientFullName: ctx.effectivePatientName,
			doctorId: ctx.effectiveDoctorName,
			doctorFullName: ctx.effectiveDoctorName,
			renderedServices: ctx.result.items,
			allowOverdraft: true, // Мягкий овердрафт: дефицит склада никогда не блокирует приём (Мандат 8e, 8n)
			includeStandardPpe: true,
			organizationId:
				ctx.activeVisit?.organizationId ||
				ctx.dashboard?.clinicSettings?.profile?.organizationId ||
				"org-default",
			warehouseItems: useInventoryStore.getState().items as any,
			fetchFn: fetchWithHandling as unknown as typeof fetch,
		});
	} catch (deductionErr) {
		logger.warn(
			"[visitCompletionPipeline] Фоновое списание материалов выполнено в локальном режиме:",
			deductionErr,
		);
		return undefined;
	}
}

/**
 * 2. Фоновое автосохранение черновика приёма
 */
export async function executeDraftAutosave(
	ctx: VisitPostCompletionContext,
): Promise<void> {
	const targetVisitId =
		ctx.activeVisit?.id && ctx.activeVisit.id !== "no-active-visit"
			? ctx.activeVisit.id
			: isUuid(ctx.effectiveVisitId)
				? ctx.effectiveVisitId
				: null;
	if (
		!targetVisitId ||
		ctx.activeVisit?.status === "signed" ||
		ctx.activeVisit?.status === "voided"
	) {
		return;
	}

	try {
		const storeSnap = useVisitStore.getState();
		const currentForm = storeSnap.visitNoteForm;
		await fetchWithHandling(`/api/visits/${targetVisitId}/draft/autosave`, {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				"Idempotency-Key": `autosave-completion-${targetVisitId}-${ctx.activeVisit?.revision ?? 0}`,
				...denteAdminSecretRequestHeaders(),
			},
			body: JSON.stringify({
				patientId: ctx.effectivePatientId,
				selectedSpecialty: storeSnap.selectedSpecialty || "therapist",
				transcript:
					storeSnap.transcript ||
					(ctx.activeVisit as { transcript?: string })?.transcript ||
					"",
				draft: {
					complaint: currentForm?.complaint || ctx.effectiveDiary.anamnesis || "",
					anamnesis: currentForm?.anamnesis || ctx.effectiveDiary.anamnesis || "",
					objectiveStatus:
						currentForm?.objectiveStatus || ctx.effectiveDiary.statusLocalis || "",
					diagnosis:
						currentForm?.diagnosis || ctx.effectiveDiary.diagnosisIcd10 || "",
					treatmentPlan:
						currentForm?.treatmentPlan || ctx.effectiveDiary.treatmentDescription || "",
					warnings: [],
				},
				clientDraftId: `completion-${targetVisitId}`,
				clientSavedAt: new Date().toISOString(),
				baseRevision: ctx.activeVisit?.revision ?? null,
			}),
		}).catch((err) => {
			logger.warn("[visitCompletionPipeline] Мягкое фоновое автосохранение:", err);
		});
	} catch {
		// Не блокируем завершение при сетевой задержке
	}
}

/**
 * 3. Фоновое закрытие наряда приёма на бэкенде
 */
export async function executeWorkOrderCompletion(
	ctx: VisitPostCompletionContext,
): Promise<void> {
	if (!isUuid(ctx.effectiveVisitId)) return;

	try {
		await fetchWithHandling(
			`/api/visits/${ctx.effectiveVisitId}/complete-work-order`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Idempotency-Key": `complete-work-order-${ctx.effectiveVisitId}`,
					...denteAdminSecretRequestHeaders(),
				},
				body: JSON.stringify({ status: "signed" }),
			},
		).catch((workErr) => {
			logger.warn(
				"[visitCompletionPipeline] Фоновое закрытие наряда на бэкенде:",
				workErr,
			);
		});
	} catch {
		// Мягкий режим: сбой сети не блокирует работу врача
	}
}

/**
 * 4. Закрытие выполненных позиций плана лечения (Closed Loop)
 */
export async function executeTreatmentPlanItemCompletion(
	ctx: VisitPostCompletionContext,
): Promise<void> {
	if (!isUuid(ctx.effectivePatientId)) return;

	try {
		let targetPlanId =
			ctx.targetPlanId ||
			(ctx.activeVisit as any)?.treatmentPlanId ||
			((ctx.dashboard as any)?.activeAppointment as any)?.treatmentPlanId ||
			null;

		const effectiveStage =
			ctx.stageNumber !== undefined
				? ctx.stageNumber
				: (ctx.activeVisit as any)?.stageNumber ??
					((ctx.dashboard as any)?.activeAppointment as any)?.stageNumber ??
					undefined;

		if (!targetPlanId || !isUuid(targetPlanId)) {
			const plansRes = await fetchWithHandling(
				`/api/patients/${ctx.effectivePatientId}/treatment-plans`,
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
							String(p.planNumber || "").toLowerCase() ===
								String(targetPlanId).toLowerCase() ||
							String(p.title || "")
								.toLowerCase()
								.includes(String(targetPlanId).toLowerCase()),
					);
					if (matched?.id) targetPlanId = matched.id;
				}
				if (!targetPlanId || !isUuid(targetPlanId)) {
					const activePlan =
						planList.find(
							(p: any) => p.status === "Active" || p.status === "Approved",
						) ||
						planList.find((p: any) => p.status === "Draft") ||
						planList[0];
					if (activePlan?.id) targetPlanId = activePlan.id;
				}
			}
		}

		if (targetPlanId && isUuid(targetPlanId)) {
			const planItemIds = (ctx.effectiveCompletedPlan || [])
				.map((x: any) => String(x.id || x.itemId || ""))
				.filter(Boolean);

			await fetchWithHandling(
				`/api/patients/${ctx.effectivePatientId}/treatment-plans/${targetPlanId}/complete-items`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						...denteAdminSecretRequestHeaders(),
					},
					body: JSON.stringify({
						visitId: isUuid(ctx.effectiveVisitId) ? ctx.effectiveVisitId : undefined,
						phase: effectiveStage ? Number(effectiveStage) : undefined,
						itemIds: planItemIds.length > 0 ? planItemIds : undefined,
						renderedServices: ctx.result.items.map((it) => ({
							code: it.code,
							name: it.name,
							toothNumber: it.toothNumber,
						})),
					}),
				},
			).catch((planErr) => {
				logger.warn(
					"[visitCompletionPipeline] Мягкое фоновое завершение позиций плана лечения:",
					planErr,
				);
			});

			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("dente-treatment-plans-reload", {
						detail: {
							patientId: ctx.effectivePatientId,
							planId: targetPlanId,
							visitId: ctx.effectiveVisitId,
						},
					}),
				);
			}
		}
	} catch (planLifecycleErr) {
		logger.warn(
			"[visitCompletionPipeline] Ошибка в цикле завершения позиций плана лечения:",
			planLifecycleErr,
		);
	}
}

/**
 * 5. Фиксация вылеченных зубов в истории одонтограммы
 */
export async function executeOdontogramToothHistorySync(
	ctx: VisitPostCompletionContext,
): Promise<void> {
	if (!ctx.effectivePatientId || ctx.effectivePatientId === "pat-unknown") return;

	try {
		const visitState = useVisitStore.getState();
		const treatedTeethMap = new Map<number, { state: string; reason: string }>();

		// 1. Из структурированных записей зубов текущего визита
		for (const [codeStr, record] of Object.entries(
			visitState.visitToothRecordsByCode || {},
		)) {
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
		for (const item of ctx.result.items) {
			let toothNum: number | null = null;
			if (item.toothNumber !== undefined && item.toothNumber !== null) {
				const parsed = Number.parseInt(String(item.toothNumber), 10);
				if (Number.isFinite(parsed) && parsed > 0) toothNum = parsed;
			}
			if (!toothNum && item.name) {
				const match = item.name.match(
					/(?:\(?зуб(?:ы)?\s+([A-Za-z0-9]+)\)?|^зуб(?:ы)?\s+([A-Za-z0-9]+):)/i,
				);
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
		for (const srv of visitState.completedServices || []) {
			const toothCandidate = srv.toothNumber ?? srv.toothCode;
			if (toothCandidate !== undefined && toothCandidate !== null) {
				const parsed = Number.parseInt(String(toothCandidate), 10);
				if (Number.isFinite(parsed) && parsed > 0) {
					const existing = treatedTeethMap.get(parsed);
					const uiState = inferToothStateFromService({
						code: srv.code804n,
						title: srv.name,
					});
					const clinicalState = mapVisitUiStateToToothDataState(uiState);
					const reason = existing ? existing.reason : srv.name;
					treatedTeethMap.set(parsed, {
						state: existing?.state || clinicalState,
						reason,
					});
				}
			}
		}

		// Обновление локального хранилища ToothChart и событий шины
		if (treatedTeethMap.size > 0) {
			const existingTeeth =
				loadStoredTeethData(ctx.effectivePatientId) ||
				createDefaultAdultTeethData();
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
			saveStoredTeethData(ctx.effectivePatientId, updatedTeeth, true);

			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("dente-odontogram-update", {
						detail: {
							patientId: ctx.effectivePatientId,
							states: updatedTeeth,
							teeth: updatedTeeth,
						},
					}),
				);
			}

			// Фиксация перехода в PostgreSQL (tooth_state_history)
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
				await fetchWithHandling(
					`/api/patients/${ctx.effectivePatientId}/tooth-states/batch`,
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							...denteAdminSecretRequestHeaders(),
						},
						body: JSON.stringify({
							toothNumbers: group.teeth,
							state: targetState,
							visitId: ctx.effectiveVisitId,
							reason:
								group.reasons.join("; ") || "Завершение визита и оказание услуг",
						}),
					},
				).catch((batchErr) => {
					logger.warn(
						"[visitCompletionPipeline] Мягкое фоновое обновление статуса зубов:",
						batchErr,
					);
				});
			}
		}
	} catch (toothHistoryErr) {
		logger.warn(
			"[visitCompletionPipeline] Ошибка синхронизации истории одонтограммы:",
			toothHistoryErr,
		);
	}
}

/**
 * Главный оркестратор фонового пайплайна пост-завершения
 */
export async function executeVisitPostCompletionPipeline(
	ctx: VisitPostCompletionContext,
): Promise<AutoVisitBomDeductionResult | undefined> {
	// 1. Списание материалов и сохранение черновика выполняются ДО закрытия наряда (исключает гонку 409 VISIT_CLOSED)
	const [deduction] = await Promise.all([
		executeBomDeduction(ctx),
		executeDraftAutosave(ctx),
	]);

	// 2. Закрытие наряда, плана лечения и синхронизация истории одонтограммы запускаются после фиксации черновика
	Promise.allSettled([
		executeWorkOrderCompletion(ctx),
		executeTreatmentPlanItemCompletion(ctx),
		executeOdontogramToothHistorySync(ctx),
	]).catch((err) => {
		logger.warn(
			"[visitCompletionPipeline] Ошибка в группе фоновых пост-процессов:",
			err,
		);
	});

	return deduction;
}
