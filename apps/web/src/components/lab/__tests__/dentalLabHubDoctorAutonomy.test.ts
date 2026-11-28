import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	checkDentalLabFinancialGate,
	createDoctorClinicalOverride,
} from "../dentalLabFinancialGateEngine";
import { DentalLabFinancialGate } from "../DentalLabFinancialGate";
import { DentalLabShadePicker } from "../DentalLabShadePicker";
import { DentalLabRegistryOrderCard } from "../ordersView/DentalLabRegistryOrderCard";
import { SEED_LAB_ORDERS } from "../dentalLabCatalogData";

describe("Wave 239 — Doctor Autonomy & Zero Emojis Compliance", () => {
	it("3. Mandate 8e & 8n: Doctor Autonomy — Plan > 30 days & Advance < 50% do not block ZTL orders", () => {
		const checkResultOldPlan = checkDentalLabFinancialGate({
			stageTotalKopecks: 2400000,
			paidKopecks: 1500000,
			treatmentPlanAgeDays: 45,
			isPlanExpired: true,
		});

		assert.equal(checkResultOldPlan.isGatePassed, true);
		assert.equal(checkResultOldPlan.isPlanExpiredNotice !== undefined, true);

		const checkResultLowAdvance = checkDentalLabFinancialGate({
			stageTotalKopecks: 2400000,
			paidKopecks: 500000,
			doctorOverride: createDoctorClinicalOverride(
				"Клиническое решение лечащего врача-ортопеда: пациент в процессе протезирования",
			),
		});

		assert.equal(checkResultLowAdvance.isGatePassed, true);
		assert.equal(checkResultLowAdvance.gateStatus, "DOCTOR_OVERRIDE");
	});

	it("4. Rendered ZTL components contain zero cartoon emojis (Mandate 8d)", () => {
		const gateResult = checkDentalLabFinancialGate({
			stageTotalKopecks: 2400000,
			paidKopecks: 500000,
		});
		const order = SEED_LAB_ORDERS[0];
		assert.ok(order);

		const renders = [
			renderToString(React.createElement(DentalLabFinancialGate, { gateResult, isOpen: true })),
			renderToString(
				React.createElement(DentalLabShadePicker, {
					selectedShade: "A2",
					onSelectShade: () => {},
				}),
			),
			renderToString(
				React.createElement(DentalLabRegistryOrderCard, {
					ord: order,
					onMarkInClinic: () => {},
					onCallPatient: () => {},
					onPrintOrder: () => {},
					onAdvanceStage: () => {},
				}),
			),
		];

		const emojiRegex = /\p{Extended_Pictographic}/u;
		for (const html of renders) {
			assert.equal(emojiRegex.test(html.replace(/[✓✕•→]/g, "")), false);
		}
	});
});
