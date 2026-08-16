import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
import { mock } from "node:test";
import {
	MissedCallCallbackQueueService,
	type MissedCallData,
} from "./MissedCallCallbackQueueService.js";

describe("MissedCallCallbackQueueService — Feature #250 Missed Call SLA Queue", () => {
	const callTime = new Date("2026-08-17T12:00:00Z");

	test("1. Calculates correct SLA deadline based on patient status tier", () => {
		const vipDeadline = MissedCallCallbackQueueService.calculateSlaDeadline("vip_patient", callTime);
		assert.equal(vipDeadline.getTime() - callTime.getTime(), 2 * 60 * 1000); // 2 min

		const activeDeadline = MissedCallCallbackQueueService.calculateSlaDeadline("active_treatment", callTime);
		assert.equal(activeDeadline.getTime() - callTime.getTime(), 5 * 60 * 1000); // 5 min

		const leadDeadline = MissedCallCallbackQueueService.calculateSlaDeadline("new_lead", callTime);
		assert.equal(leadDeadline.getTime() - callTime.getTime(), 10 * 60 * 1000); // 10 min
	});

	test("2. Detects SLA breach and assigns priority score", () => {
		const callData: MissedCallData = {
			organizationId: "org-1",
			patientStatus: "vip_patient",
			phoneNumber: "+79991234567",
			receivedAt: callTime,
		};

		// 1 minute later -> Not breached, pending
		const itemNormal = MissedCallCallbackQueueService.createQueueItem(
			"call-1",
			callData,
			new Date(callTime.getTime() + 1 * 60 * 1000),
		);
		assert.equal(itemNormal.status, "pending");
		assert.equal(itemNormal.priorityScore, 100);

		// 3 minutes later -> Breached (SLA is 2 min)
		const itemBreached = MissedCallCallbackQueueService.createQueueItem(
			"call-2",
			callData,
			new Date(callTime.getTime() + 3 * 60 * 1000),
		);
		assert.equal(itemBreached.status, "sla_breached");
	});
});
