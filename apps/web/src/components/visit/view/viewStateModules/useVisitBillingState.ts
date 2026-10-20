/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — Visit Billing, Checkout & Service Assembly Hook
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Связка завершенных услуг визита со счетом и кассой (54-ФЗ),
 * подготовка чека к оплате и переход к кассовому расчёту.
 */

import { useCallback } from "react";
import { showToast } from "../../../GlobalToast";
import { useVisitStore } from "../../../../store/visitStore";
import { completeClinicalVisitAndAssembleEstimate } from "../../clinicalVisitWorkflow";
import { assembleVisitStoreCompletedServices } from "../../useVisitCompletion";
import type { VisitViewProps } from "../types";

export interface UseVisitBillingStateParams {
	activePatient: VisitViewProps["activePatient"];
	activeAppointment: VisitViewProps["activeAppointment"];
	activeDoctor: VisitViewProps["activeDoctor"];
	dashboard: VisitViewProps["dashboard"];
	visitNoteForm: VisitViewProps["visitNoteForm"];
	updateVisitNoteField: VisitViewProps["updateVisitNoteField"];
	flushPendingVisitSaves: VisitViewProps["flushPendingVisitSaves"];
}

export function useVisitBillingState({
	activePatient,
	activeAppointment,
	activeDoctor,
	dashboard,
	visitNoteForm,
	updateVisitNoteField,
	flushPendingVisitSaves,
}: UseVisitBillingStateParams) {
	const handleFinishVisitAction = useCallback(async () => {
		if (typeof updateVisitNoteField === "function") {
			if (!visitNoteForm?.diagnosis) updateVisitNoteField("diagnosis", "Z01.2 Стоматологическое обследование (Здоров)");
			if (!visitNoteForm?.treatmentPlan) updateVisitNoteField("treatmentPlan", "Осмотр полости рта проведен, патологий не выявлено. Полость рта здорова, гигиена удовлетворительная.");
			if (!visitNoteForm?.complaint) updateVisitNoteField("complaint", "Жалоб на момент осмотра не предъявляет.");
			if (!visitNoteForm?.anamnesis) updateVisitNoteField("anamnesis", "Соматически здоров. Аллергоанамнез не отягощен.");
			if (!visitNoteForm?.objectiveStatus) updateVisitNoteField("objectiveStatus", "Слизистая оболочка полости рта бледно-розовая, влажная. Зубные ряды интактны.");
		}
		if (typeof flushPendingVisitSaves === "function") {
			await flushPendingVisitSaves();
		}

		if (typeof window !== "undefined") {
			const triggerDetail: { promise?: Promise<boolean>; handled?: boolean } = {};
			window.dispatchEvent(
				new CustomEvent("dente:trigger-complete-visit", { detail: triggerDetail }),
			);

			if (triggerDetail.handled && triggerDetail.promise) {
				const ok = await triggerDetail.promise;
				if (ok && window.location.hash !== "#finance") {
					window.location.hash = "finance";
				}
				return;
			}

			try {
				// Если вкладка ЭМК не смонтирована, собираем реальную смету визита и сохраняем её до перехода в кассу
				const effectiveVisitId =
					activeAppointment?.id ||
					(dashboard as { activeVisit?: { id?: string } })?.activeVisit?.id ||
					"no-active-visit";
				const additionalServices = assembleVisitStoreCompletedServices();
				const result = await completeClinicalVisitAndAssembleEstimate({
					visitId: effectiveVisitId,
					patientId: activePatient?.id || "pat-default",
					patientName: activePatient?.fullName || activePatient?.name || "Пациент",
					doctorName:
						activeDoctor?.fullName ||
						(dashboard as { activeDoctor?: { fullName?: string } })?.activeDoctor?.fullName ||
						"Лечащий врач",
					diary: {
						anamnesis: visitNoteForm?.anamnesis || "Соматически здоров. Аллергоанамнез не отягощен.",
						statusLocalis: visitNoteForm?.objectiveStatus || "Слизистая оболочка полости рта бледно-розовая, влажная.",
						diagnosisIcd10: visitNoteForm?.diagnosis || "Z01.2 Стоматологическое обследование (Здоров)",
						treatmentDescription: visitNoteForm?.treatmentPlan || "План оздоровления и гигиены",
					},
					additionalServices,
				});

				const pendingCheckout = {
					patientId: activePatient?.id || "pat-default",
					patientName: activePatient?.fullName || activePatient?.name || "Пациент",
					visitId: effectiveVisitId,
					services: result.items,
					totalDueRub: result.totalNetRub,
					receiptNumber: result.receiptNumber,
					timestamp: Date.now(),
				};

				try {
					sessionStorage.setItem("dente_pending_checkout", JSON.stringify(pendingCheckout));
					localStorage.setItem("dente_pending_checkout", JSON.stringify(pendingCheckout));
				} catch (err) {
					console.warn("[VisitViewState] Failed to write pending checkout to storage:", err);
				}

				window.dispatchEvent(
					new CustomEvent("dente:pending-checkout-ready", { detail: pendingCheckout }),
				);
				if (window.location.hash !== "#finance") {
					window.location.hash = "finance";
				}
			} catch (err) {
				console.error("[VisitViewState] Ошибка расчёта сметы при закрытии приёма:", err);
				showToast("Не удалось сформировать смету приёма. Повторите попытку.", "error", 5000);
			}
		}
	}, [flushPendingVisitSaves, updateVisitNoteField, visitNoteForm, activePatient, activeAppointment, activeDoctor, dashboard]);

	const onAddServiceToTooth = useCallback(
		(
			svc: Parameters<
				ReturnType<typeof useVisitStore.getState>["addCompletedService"]
			>[0],
		) => {
			useVisitStore.getState().addCompletedService(svc);
		},
		[],
	);

	return {
		handleFinishVisitAction,
		onAddServiceToTooth,
	};
}
