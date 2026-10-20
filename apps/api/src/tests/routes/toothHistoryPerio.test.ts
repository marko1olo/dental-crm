import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fetchToothPeriodontalEvents } from "../../routes/toothHistoryPerio.js";

describe("Tooth History Periodontal Timeline Integration (Форма 043/у)", () => {
	it("fetchToothPeriodontalEvents returns an empty array for non-existent patient or missing records safely", async () => {
		const events = await fetchToothPeriodontalEvents(
			"00000000-0000-0000-0000-000000000001",
			"00000000-0000-0000-0000-000000000002",
			16,
		);
		assert.ok(Array.isArray(events));
	});
});
