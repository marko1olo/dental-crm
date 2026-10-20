/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — Visit Protocol Sync & Continuity Intake Hook
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Синхронизация протокола приёма, автоподхват активного визита смены (Continuity Intake)
 * и приём этапов согласованного плана лечения в приём врача (Мандаты 8b, 8e, 8n).
 */

import { useEffect, useState, useCallback } from "react";
import { denteAdminSecretRequestHeaders } from "../../../../AppHelpers";
import { showToast } from "../../../GlobalToast";
import { useVisitStore } from "../../../../store/visitStore";
import {
	formatStageItemForBilling,
	buildStageMedicalDiaryText,
} from "../../visitPlanStageHandoff";
import type { VisitLoadedTreatmentPlan, VisitViewProps } from "../types";

export interface UseVisitProtocolSyncParams {
	activePatient: VisitViewProps["activePatient"];
	activeAppointment: VisitViewProps["activeAppointment"];
	dashboard: VisitViewProps["dashboard"];
	updateVisitNoteField: VisitViewProps["updateVisitNoteField"];
	flushPendingVisitSaves: VisitViewProps["flushPendingVisitSaves"];
	isQueueCockpitForced: boolean;
	setSelectedPatientId?: ((id: string) => void) | undefined;
	appLogic?: Record<string, any> | undefined;
}

export function useVisitProtocolSync({
	activePatient,
	activeAppointment,
	dashboard,
	updateVisitNoteField,
	flushPendingVisitSaves,
	isQueueCockpitForced,
	setSelectedPatientId,
	appLogic,
}: UseVisitProtocolSyncParams) {
	const [loadedTreatmentPlan, setLoadedTreatmentPlan] =
		useState<VisitLoadedTreatmentPlan | null>(null);

	// Production PostgreSQL 18: загрузка согласованного плана лечения пациента
	useEffect(() => {
		if (!activePatient?.id) {
			setLoadedTreatmentPlan(null);
			return;
		}
		const patientId = activePatient.id;
		let cancelled = false;
		async function fetchPatientTreatmentPlan() {
			try {
				const res = await fetch(`/api/patients/${patientId}/treatment-plans`, {
					headers: denteAdminSecretRequestHeaders(),
				});
				if (!res.ok) return;
				const data = await res.json();
				if (cancelled) return;
				if (data?.success && Array.isArray(data.plans) && data.plans.length > 0) {
					const plan =
						data.plans.find(
							(p: VisitLoadedTreatmentPlan) =>
								p.status === "Approved" || p.status === "Active",
						) || data.plans[0];
					setLoadedTreatmentPlan(plan);
				}
			} catch {
				// Non-blocking in offline / test mode
			}
		}
		fetchPatientTreatmentPlan();
		const handleReload = () => fetchPatientTreatmentPlan();
		window.addEventListener("dente-treatment-plans-reload", handleReload);
		return () => {
			cancelled = true;
			window.removeEventListener("dente-treatment-plans-reload", handleReload);
		};
	}, [activePatient?.id]);

	// Сквозная связка: приём события «Взять этап в работу визита»
	useEffect(() => {
		const handleTakeStage = (e: Event) => {
			const detail = (e as CustomEvent)?.detail;
			if (!detail) return;
			const { stage, items } = detail;
			const stageItems = items || stage?.items || [];
			if (stageItems.length > 0) {
				const stageTitle = stage?.title || (stage?.stageNumber ? `Этап ${stage.stageNumber}` : "План лечения");
				const diaryText = buildStageMedicalDiaryText(stageTitle, stageItems);
				if (typeof updateVisitNoteField === "function") {
					updateVisitNoteField("treatmentPlan", diaryText);
				}

				// Перенос каждой услуги в стор визита, одонтограмму и биллинг у кресла
				const store = useVisitStore.getState();
				const formattedItems = stageItems.map((it: Record<string, unknown>) =>
					formatStageItemForBilling(it),
				);
				for (const [idx, billingItem] of formattedItems.entries()) {
					const toothNum =
						(billingItem as { toothNumber?: number }).toothNumber ??
						(billingItem.toothCode ? Number.parseInt(String(billingItem.toothCode), 10) || undefined : undefined);
					const alreadyInStore = store.completedServices.some(
						(s) =>
							s.code804n === billingItem.code804n &&
							String(s.toothNumber ?? s.toothCode ?? "") === String(toothNum ?? billingItem.toothCode ?? ""),
					);
					if (!alreadyInStore) {
						store.addCompletedService({
							serviceId: String(stageItems[idx]?.id || `stage-srv-${Date.now()}-${idx}`),
							code804n: billingItem.code804n,
							name: billingItem.title,
							priceRub: billingItem.unitPriceRub,
							priceKopecks: Math.round(billingItem.unitPriceRub * 100),
							quantity: billingItem.quantity || 1,
							category: String(stageItems[idx]?.category || "therapy"),
							...(toothNum !== undefined ? { toothNumber: toothNum } : {}),
							...(billingItem.toothCode ? { toothCode: String(billingItem.toothCode) } : {}),
						});
						window.dispatchEvent(
							new CustomEvent("dente-add-billing-item", {
								detail: {
									item: billingItem,
								},
							}),
						);
					}
				}
				store.applyServicesToToothState({
					patientId: activePatient?.id,
					services: formattedItems.map((b) => ({
						code804n: b.code804n,
						title: b.title,
						price: b.unitPriceRub,
						toothNumber: (b as { toothNumber?: number }).toothNumber,
						toothCode: b.toothCode,
					})),
				});
				showToast(
					`Этап «${stageTitle}» взят в работу визита (${stageItems.length} услуг)`,
					"success",
					4000,
				);
			}
		};

		window.addEventListener("dente-take-stage-to-visit", handleTakeStage);
		return () => window.removeEventListener("dente-take-stage-to-visit", handleTakeStage);
	}, [updateVisitNoteField, activePatient?.id]);

	// Автоподхват активного приёма смены (Continuity Intake)
	useEffect(() => {
		if (activePatient || isQueueCockpitForced) return;
		const selectFn = setSelectedPatientId || (appLogic as { setSelectedPatientId?: (id: string) => void })?.setSelectedPatientId;
		if (typeof selectFn !== "function") return;

		// 1. Приоритет: текущий активный визит в dashboard
		const activeVisitPatientId = (dashboard as { activeVisit?: { patientId?: string } })?.activeVisit?.patientId;
		if (activeVisitPatientId) {
			selectFn(activeVisitPatientId);
			return;
		}

		// 2. Визит со статусом in_chair / in_progress на сегодня
		const todayIso = (dashboard as { todayIso?: string })?.todayIso || new Date().toISOString().slice(0, 10);
		const inProgressApp = (dashboard?.appointments || []).find((a) => {
			const st = String(a.status || "").toLowerCase();
			const dt = (a.startsAt || "").slice(0, 10);
			return (!dt || dt === todayIso) && (st === "in_chair" || st === "in_progress");
		});
		if (inProgressApp?.patientId) {
			selectFn(inProgressApp.patientId);
			return;
		}

		// 3. Запланированная запись на сегодня
		const scheduledApp = (dashboard?.appointments || []).find((a) => {
			const dt = (a.startsAt || "").slice(0, 10);
			return (!dt || dt === todayIso) && a.patientId;
		});
		if (scheduledApp?.patientId) {
			selectFn(scheduledApp.patientId);
			return;
		}

		// 4. Первый пациент клиники из картотеки (Мандат 8e: ноль паралича)
		if (dashboard?.patients && dashboard.patients.length > 0 && dashboard.patients[0]?.id) {
			selectFn(dashboard.patients[0].id);
		}
	}, [activePatient, isQueueCockpitForced, dashboard, setSelectedPatientId, appLogic]);

	const flushAll = useCallback(async () => {
		if (typeof flushPendingVisitSaves === "function") await flushPendingVisitSaves();
	}, [flushPendingVisitSaves]);

	useEffect(() => {
		window.addEventListener("beforeunload", flushAll);
		window.addEventListener("pagehide", flushAll);
		return () => {
			window.removeEventListener("beforeunload", flushAll);
			window.removeEventListener("pagehide", flushAll);
		};
	}, [flushAll]);

	return {
		loadedTreatmentPlan,
		flushAll,
	};
}
