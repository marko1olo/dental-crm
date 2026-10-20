/**
 * copilotEngineInquisition.test.ts — Red Team Sovereign Verification Suite for CRM Copilot Action Engine.
 *
 * Verifies:
 * - Mandate 8e: Doctor Autonomy & Two-Phase Guard (Extraction, Implant, Cancellation, Fiscal)
 * - Mandate 8l: Action Engine (Zero mocks, real Fastify endpoints, direct store mutations)
 * - Mandate 8n: Scale Sovereignty (Offline-resilient semantic fallback without hanging spinners)
 * - Navigation: Global voice commands routing to odontogram and inventory
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
	isDestructiveAction,
	getActionTitleRu,
	dispatchCrmAction,
} from "../aiActionDispatcher";
import { copilotActionRunner } from "../copilotActionRunner";
import { aiAssistantService, type AssistantMessage } from "../aiAssistantService";
import { AiOrchestrator } from "../../../lib/aiOrchestrator";
import { useVisitStore } from "../../../store/visitStore";
import { useAppStore } from "../../../store/appStore";

describe("Red Team Copilot Engine Inquisition", () => {
	beforeEach(() => {
		useVisitStore.getState().resetVisitToothState();
		useVisitStore.getState().setCompletedServices([]);
		useAppStore.getState().setActiveTooth(null);
		useAppStore.getState().setActivePatientId(null);
		useAppStore.getState().setDashboard({
			appointments: [],
			patients: [],
			queue: [],
			stats: {} as any,
		} as any);
	});

	it("1. Two-Phase Guard: accurately classifies destructive vs safe operations", () => {
		// Destructive actions requiring 2-phase confirmation (Mandate 8e)
		assert.equal(isDestructiveAction("cancel_appointment"), true);
		assert.equal(isDestructiveAction("delete_record"), true);
		assert.equal(isDestructiveAction("refund_payment"), true);
		assert.equal(isDestructiveAction("fiscal_sale"), true);
		assert.equal(isDestructiveAction("create_receipt"), true);
		assert.equal(isDestructiveAction("checkout"), true);
		assert.equal(isDestructiveAction("implant_placement"), true);
		assert.equal(
			isDestructiveAction("update_tooth_status", { tooth: 36, status: "удален" }),
			true,
		);
		assert.equal(
			isDestructiveAction("update_tooth_status", { tooth: 46, status: "имплант" }),
			true,
		);
		assert.equal(
			isDestructiveAction("update_teeth_chart", { tooth: 11, status: "x" }),
			true,
		);
		assert.equal(
			isDestructiveAction("update_teeth_chart", { tooth: 21, status: "i" }),
			true,
		);

		// Safe actions executing with 0-click doctor autonomy
		assert.equal(isDestructiveAction("book_chairside_appointment"), false);
		assert.equal(isDestructiveAction("calculate_anesthetic_dosage"), false);
		assert.equal(isDestructiveAction("calculate_804n_estimate"), false);
		assert.equal(isDestructiveAction("draft_043u_soap_diary"), false);
		assert.equal(isDestructiveAction("apply_clinical_protocol"), false);
		assert.equal(isDestructiveAction("check_warehouse_supplies"), false);
		assert.equal(isDestructiveAction("update_tooth_status", { tooth: 36, status: "кариес" }), false);
	});

	it("2. Tool Titles: maps both camelCase and snake_case dental tools to clear Russian titles", () => {
		assert.equal(getActionTitleRu("updateToothStatus"), "Изменение статуса зуба в одонтограмме");
		assert.equal(getActionTitleRu("update_teeth_chart"), "Изменение статуса зуба в одонтограмме");
		assert.equal(getActionTitleRu("draft043uSoapDiary"), "Заполнение дневника приёма");
		assert.equal(getActionTitleRu("calculate804nEstimate"), "Формирование клинической сметы");
		assert.equal(getActionTitleRu("createTreatmentPlan"), "Формирование клинической сметы");
		assert.equal(getActionTitleRu("bookAppointment"), "Запись пациента на приём");
		assert.equal(getActionTitleRu("cancelAppointment"), "Отмена приёма");
		assert.equal(getActionTitleRu("createDentalLabOrder"), "Наряд в зуботехническую лабораторию");
		assert.equal(getActionTitleRu("calculateAnestheticDosage"), "Расчет безопасной дозы анестетика");
		assert.equal(getActionTitleRu("addProcedureToInvoice"), "Добавление услуги в наряд приёма");
		assert.equal(getActionTitleRu("checkWarehouseSupplies"), "Расходные материалы (автосписание)");
		assert.equal(getActionTitleRu("analyzeRadiographVision"), "Анализ дентального снимка");
		assert.equal(getActionTitleRu("verifyKraftPack"), "Контроль стерилизации СанПиН");
	});

	it("3. Scheduling: direct synchronization into useAppStore.dashboard.appointments", async () => {
		// Create appointment
		const createResult = await dispatchCrmAction({
			callId: "call_book_1",
			name: "book_chairside_appointment",
			arguments: {
				patientId: "00000000-0000-7000-8000-000000000001",
				startsAt: "2026-10-20T10:00:00.000Z",
				reason: "Консультация ортопеда",
			},
			confirmed: true,
		});

		assert.equal(createResult.success, true);
		const apptsAfterCreate = useAppStore.getState().dashboard?.appointments ?? [];
		assert.equal(apptsAfterCreate.length, 1);
		assert.equal(apptsAfterCreate[0]?.reason, "Консультация ортопеда");
		const apptId = apptsAfterCreate[0]?.id;

		// Reschedule appointment
		const rescheduleResult = await dispatchCrmAction({
			callId: "call_resched_1",
			name: "reschedule_appointment",
			arguments: {
				appointmentId: apptId,
				newStartsAt: "2026-10-21T14:30:00.000Z",
			},
			confirmed: true,
		});

		assert.equal(rescheduleResult.success, true);
		const apptsAfterResched = useAppStore.getState().dashboard?.appointments ?? [];
		assert.equal(apptsAfterResched[0]?.startsAt, "2026-10-21T14:30:00.000Z");

		// Cancel appointment (confirmed)
		const cancelResult = await dispatchCrmAction({
			callId: "call_cancel_1",
			name: "cancel_appointment",
			arguments: {
				appointmentId: apptId,
				reason: "Пациент перенес визит",
			},
			confirmed: true,
		});

		assert.equal(cancelResult.success, true);
		const apptsAfterCancel = useAppStore.getState().dashboard?.appointments ?? [];
		assert.equal(apptsAfterCancel[0]?.status, "cancelled");
	});

	it("4. Clinical Billing: adds service to visitStore completedServices and reactively applies to tooth", async () => {
		const result = await dispatchCrmAction({
			callId: "call_service_1",
			name: "add_procedure_to_invoice",
			arguments: {
				toothNumber: 47,
				serviceCode: "A16.07.002.010",
				serviceName: "Восстановление зуба пломбой из композита",
				price: 5200,
				quantity: 1,
			},
			confirmed: true,
		});

		assert.equal(result.success, true);
		const visitState = useVisitStore.getState();
		assert.equal(visitState.completedServices.length, 1);
		assert.equal(visitState.completedServices[0]?.code, "A16.07.002.010");
		assert.equal(visitState.completedServices[0]?.price, 5200);

		// Tooth should be activated in appStore
		assert.equal(useAppStore.getState().activeTooth, 47);
	});

	it("5. Two-Phase Guard: unconfirmed destructive actions in local fallback register in pending queue and can be 1-click confirmed", async () => {
		// Doctor inputs offline voice command to extract tooth 38
		let confirmationReceived = false;
		aiAssistantService.setCallbacks({
			onConfirmationRequired: (toolCall) => {
				confirmationReceived = true;
				assert.equal(toolCall.destructive, true);
				assert.equal(toolCall.status, "confirmation_required");
			},
		});

		const message = await aiAssistantService.sendMessage("удалить зуб 38");

		assert.equal(confirmationReceived, true);
		assert.equal(message.toolCalls?.length, 1);
		assert.equal(message.toolCalls[0]?.status, "confirmation_required");
		assert.equal(message.toolCalls[0]?.destructive, true);

		// Verify action is tracked in copilotActionRunner pending queue
		const pendingActions = copilotActionRunner.getPendingActions();
		const pendingExtraction = pendingActions.find((a) => a.args.tooth === 38);
		assert.ok(pendingExtraction, "Pending extraction must be present in runner pendingActions");

		// Doctor performs 1-click approval
		const confirmResult = await copilotActionRunner.confirmAction(pendingExtraction.callId);
		assert.equal(confirmResult.success, true);

		// Odontogram must be updated to missing
		assert.equal(useVisitStore.getState().visitToothStateByCode["38"], "missing");

		// Queue must be cleared
		assert.equal(copilotActionRunner.getPendingActions().length, 0);
	});

	it("6. Navigation: voice command parser maps odontogram and warehouse views", () => {
		const navOdontogram = AiOrchestrator.parseGlobalNavigation("открой зубную формулу");
		assert.equal(navOdontogram.view, "odontogram");
		assert.ok(navOdontogram.feedbackText.includes("зубную формулу"));

		const navOdon = AiOrchestrator.parseGlobalNavigation("покажи одонтограмму");
		assert.equal(navOdon.view, "odontogram");

		const navInventory = AiOrchestrator.parseGlobalNavigation("перейди на склад материалов");
		assert.equal(navInventory.view, "inventory");
		assert.ok(navInventory.feedbackText.includes("склад материалов"));
	});
});
