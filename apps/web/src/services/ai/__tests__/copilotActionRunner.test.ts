import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CopilotActionRunner } from "../copilotActionRunner";
import { useVisitStore } from "../../../store/visitStore";

describe("CopilotActionRunner", () => {
	it("registers unconfirmed destructive action in pending queue", async () => {
		const runner = new CopilotActionRunner();
		const result = await runner.executeAction({
			callId: "call_del_1",
			name: "cancel_appointment",
			arguments: { appointmentId: "app_999" },
			confirmed: false,
		});

		assert.equal(result.success, false);
		assert.equal(result.needsConfirmation, true);

		const pending = runner.getPendingActions();
		assert.equal(pending.length, 1);
		assert.equal(pending[0]?.callId, "call_del_1");
		assert.equal(pending[0]?.name, "cancel_appointment");
	});

	it("confirms pending action and clears it from pending queue", async () => {
		const runner = new CopilotActionRunner();
		await runner.executeAction({
			callId: "call_del_2",
			name: "cancel_appointment",
			arguments: { appointmentId: "app_888", reason: "Пациент отменил" },
			confirmed: false,
		});

		assert.equal(runner.getPendingActions().length, 1);

		const confirmRes = await runner.confirmAction("call_del_2");
		assert.equal(confirmRes.success, true);
		assert.equal(confirmRes.destructive, true);

		assert.equal(runner.getPendingActions().length, 0);
		const history = runner.getExecutionHistory();
		assert.equal(history.length, 1);
		assert.equal(history[0]?.callId, "call_del_2");
	});

	it("allows undoing previous odontogram status change", async () => {
		const runner = new CopilotActionRunner();

		// Initially set 36 to idle
		useVisitStore.getState().setToothState("36", "idle");

		// Execute update to treatment
		await runner.executeAction({
			callId: "call_tooth_undo",
			name: "update_tooth_status",
			arguments: { tooth: 36, status: "кариес" },
			confirmed: true,
		});

		assert.equal(useVisitStore.getState().visitToothStateByCode["36"], "treatment");

		// Undo action
		const undone = runner.undoLastAction();
		assert.equal(undone, true);
		assert.equal(useVisitStore.getState().visitToothStateByCode["36"], "idle");
	});
});
