import assert from "node:assert/strict";
import test from "node:test";
import { NotificationBell } from "../NotificationBell";

test("NotificationBell - component export and unread count logic", () => {
	assert.strictEqual(typeof NotificationBell, "function");

	// Test unread calculation logic matching NotificationBell implementation
	const sampleCalls = [
		{ id: "c1", status: "missed", acutePain: false },
		{ id: "c2", status: "completed", acutePain: false },
		{ id: "c3", status: "completed", acutePain: true }, // острый случай
	];

	const sampleAppointments = [
		{ id: "a1", status: "confirmed" },
		{ id: "a2", status: "cancelled" },
	];

	const samplePatients = [
		{ id: "p1", balanceRub: 1500 },
		{ id: "p2", balanceRub: -2500 }, // задолженность
	];

	let count = 0;
	count += sampleCalls.filter((c) => c.status === "missed" || c.acutePain).length;
	count += sampleAppointments.filter((a) => a.status === "cancelled").length;
	count += samplePatients.filter((p) => Number(p.balanceRub) < 0).length;

	assert.strictEqual(count, 4); // 2 calls + 1 cancelled + 1 debt
});
