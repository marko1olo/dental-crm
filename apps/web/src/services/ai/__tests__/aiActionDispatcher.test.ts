import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	isDestructiveAction,
	getActionTitleRu,
	dispatchCrmAction,
} from "../aiActionDispatcher";
import { useVisitStore } from "../../../store/visitStore";
import { useAppStore } from "../../../store/appStore";

describe("aiActionDispatcher", () => {
	it("correctly classifies destructive actions", () => {
		assert.equal(isDestructiveAction("cancel_appointment"), true);
		assert.equal(isDestructiveAction("delete_record"), true);
		assert.equal(isDestructiveAction("refund_payment"), true);
		assert.equal(
			isDestructiveAction("update_tooth_status", { tooth: 36, status: "удален" }),
			true,
		);
		assert.equal(
			isDestructiveAction("update_tooth_status", { tooth: 36, status: "x" }),
			true,
		);

		// Safe actions
		assert.equal(isDestructiveAction("update_tooth_status", { tooth: 36, status: "кариес" }), false);
		assert.equal(isDestructiveAction("draft_043u_soap_diary", { tooth: 36 }), false);
		assert.equal(isDestructiveAction("calculate_804n_estimate", { tooth: 36 }), false);
		assert.equal(isDestructiveAction("book_chairside_appointment"), false);
	});

	it("returns readable Russian titles without bureaucratic ciphers", () => {
		assert.equal(getActionTitleRu("update_tooth_status"), "Изменение статуса зуба в одонтограмме");
		assert.equal(getActionTitleRu("draft_043u_soap_diary"), "Заполнение дневника приёма");
		assert.equal(getActionTitleRu("calculate_804n_estimate"), "Формирование клинической сметы");
		assert.equal(getActionTitleRu("book_appointment"), "Запись пациента на приём");
		assert.equal(getActionTitleRu("cancel_appointment"), "Отмена приёма");
	});

	it("prevents unconfirmed destructive actions with needsConfirmation flag", async () => {
		const result = await dispatchCrmAction({
			callId: "call_cancel_1",
			name: "cancel_appointment",
			arguments: { appointmentId: "app_123", reason: "Пациент заболел" },
			confirmed: false,
		});

		assert.equal(result.success, false);
		assert.equal(result.needsConfirmation, true);
		assert.equal(result.destructive, true);
	});

	it("updates odontogram store directly on tooth status change", async () => {
		const result = await dispatchCrmAction({
			callId: "call_tooth_36",
			name: "update_tooth_status",
			arguments: {
				tooth: 36,
				status: "кариес",
				diagnosisText: "K02.1 Кариес дентина",
			},
			confirmed: true,
		});

		assert.equal(result.success, true);
		assert.equal(result.category, "clinical_odontogram");

		const visitState = useVisitStore.getState();
		assert.equal(visitState.visitToothStateByCode["36"], "treatment");
		assert.equal(visitState.visitAiDiagnosesByCode["36"], "K02.1 Кариес дентина");

		const appState = useAppStore.getState();
		assert.equal(appState.activeTooth, 36);
	});

	it("populates 043/u diary protocol in visit store", async () => {
		const result = await dispatchCrmAction({
			callId: "call_diary_1",
			name: "draft_043u_soap_diary",
			arguments: {
				tooth: 46,
				complaint: "Ноющие боли от холодного",
				anamnesis: "Боли в течение недели",
				objective: "Глубокая кариозная полость",
				diagnosis: "K02.1 Кариес дентина",
				treatment: "Препарирование, наложение лечебной прокладки и фотокомпозита",
			},
			confirmed: true,
		});

		assert.equal(result.success, true);
		assert.equal(result.category, "clinical_diary");

		const visitState = useVisitStore.getState();
		assert.equal(visitState.visitNoteForm.complaint, "Ноющие боли от холодного");
		assert.equal(visitState.visitNoteForm.diagnosis, "K02.1 Кариес дентина");
	});

	it("dispatches add_procedure_to_invoice to active visit invoice (Mandate 8e)", async () => {
		const result = await dispatchCrmAction({
			callId: "call_add_proc_1",
			name: "add_procedure_to_invoice",
			arguments: {
				toothNumber: 36,
				serviceCode: "A16.07.002.010",
				serviceName: "Восстановление зуба светоотверждаемым композитом",
				price: 4500,
				quantity: 1,
			},
			confirmed: true,
		});

		assert.equal(result.success, true);
		assert.equal(result.category, "billing_estimate");
		assert.ok(result.message.includes("Восстановление зуба светоотверждаемым композитом"));
		assert.ok(/4[\s\u00a0\u202f]?500/.test(result.message));
		assert.equal((result.data as any)?.total, 4500);
	});

	it("handles warehouse supplies tool via background auto-deduction without doctor interruption (Mandate 8ab)", async () => {
		const result = await dispatchCrmAction({
			callId: "call_stock_1",
			name: "check_warehouse_supplies",
			arguments: {
				itemName: "Артикаин 4% 1.7 мл",
			},
			confirmed: true,
		});

		assert.equal(result.success, true);
		assert.equal(result.category, "warehouse");
		assert.ok(result.message.includes("фоновым сервисом по техкарте"));
		assert.equal((result.data as any)?.doctorAutonomyGuaranteed, true);
	});
});
