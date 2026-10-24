import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { isEmergencyBookingOverride } from "./appointmentsQuery.js";

/**
 * Инвариант честной записи: экстренность приёма включается ТОЛЬКО явным
 * структурным флагом администратора. Регулярка по свободному тексту причины
 * («пульпит», «флюс», «острая боль») была саботажем целостности расписания —
 * плановый приём с диагнозом в формулировке молча обходил черный список,
 * архив и проверку занятости слота.
 */
describe("Emergency booking override via structural flags only", () => {
	test("planned pulpit treatment text never triggers emergency override", () => {
		assert.equal(
			isEmergencyBookingOverride({
				allowEmergencyOverride: false,
				allowOverbooking: false,
				urgency: "routine",
			}),
			false,
		);
	});

	test("routine flags-less input (free text only) does not bypass blacklist and overlap checks", () => {
		assert.equal(isEmergencyBookingOverride({}), false);
		assert.equal(isEmergencyBookingOverride({ urgency: "routine" }), false);
		assert.equal(isEmergencyBookingOverride({ urgency: null }), false);
	});

	test("explicit allowOverbooking flag enables overbooking", () => {
		assert.equal(isEmergencyBookingOverride({ allowOverbooking: true }), true);
	});

	test("explicit allowEmergencyOverride flag enables emergency override", () => {
		assert.equal(
			isEmergencyBookingOverride({ allowEmergencyOverride: true }),
			true,
		);
	});

	test("urgency urgent/emergency enables override", () => {
		assert.equal(isEmergencyBookingOverride({ urgency: "urgent" }), true);
		assert.equal(isEmergencyBookingOverride({ urgency: "emergency" }), true);
	});
});
