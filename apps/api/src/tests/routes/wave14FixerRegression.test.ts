import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Fastify from "fastify";
import { inventoryQuery, serializeInventoryItem } from "../../db/inventoryQuery.js";
import { inventoryRoutes, calculateAlertsFromItems } from "../../routes/inventory.js";
import { treatmentConsumablesRoutes } from "../../routes/inventory/consumables/index.js";
import { registerLanNetworkRoutes } from "../../routes/lanNetwork.js";
import { resetLanMeshAutoJoinServiceForTest } from "../../services/lanMeshAutoJoinService.js";
import { registerMdlpRoutes } from "../../routes/mdlp.js";
import { registerScheduleDoctorShiftsRoutes } from "../../routes/scheduleModules/scheduleDoctorShiftsRoutes.js";
import { registerShiftRoutes } from "../../routes/shifts/index.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { CLINIC_TOKEN_HEADER, STAFF_TOKEN_HEADER } from "../../security/identity.js";
import { signToken } from "../../utils/cryptoHelper.js";

const ORG_A = "11111111-1111-4111-8111-111111111111";
const ORG_B = "22222222-2222-4222-8222-222222222222";
const USER_A = "33333333-3333-4333-8333-333333333333";

function makeClinicAndStaffHeaders(orgId: string, role = "admin"): Record<string, string> {
	const secret = authTokenSecret();
	return {
		[CLINIC_TOKEN_HEADER]: signToken({ organizationId: orgId, role: "clinic" }, secret, 3600),
		[STAFF_TOKEN_HEADER]: signToken({ organizationId: orgId, userId: USER_A, role }, secret, 3600),
	};
}

describe("Wave 14 Fixer Surgeon Regression Guard", () => {
	it("[P0-1] serializeInventoryItem & calculateAlertsFromItems convert BigInt columns to JSON-safe numbers", () => {
		const fakeItem: typeof import("../../db/schema.js").inventoryItems.$inferSelect = {
			id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
			organizationId: ORG_A,
			clinicId: null,
			name: "Ультракаин Д-С форте",
			category: "anesthesia",
			sku: "ULT-01",
			unit: "carpule",
			packageMultiplier: "10",
			stockQuantity: "5",
			currentQty: "5",
			minQty: "10",
			criticalThreshold: "10",
			pricePerUnit: "420.50",
			unitCostRub: "420.50",
			pricePerUnitKopecks: 42050n,
			unitCostKopecks: 42050n,
			lotNumber: "LOT-2026",
			expirationDate: "2027-06-01",
			barcode: "4600000000012",
			storageZone: null,
			createdAt: new Date("2026-01-01T00:00:00Z"),
			updatedAt: new Date("2026-01-01T00:00:00Z"),
		};

		const serialized = serializeInventoryItem(fakeItem);
		assert.equal(typeof serialized.pricePerUnitKopecks, "number");
		assert.equal(serialized.pricePerUnitKopecks, 42050);
		assert.equal(typeof serialized.unitCostKopecks, "number");
		assert.equal(serialized.unitCostKopecks, 42050);

		const alerts = calculateAlertsFromItems([fakeItem]);
		assert.equal(typeof alerts.summary.totalValuationKopecks, "number");
		assert.equal(alerts.summary.totalValuationKopecks, 210250);
		assert.doesNotThrow(() => JSON.stringify(alerts));
	});

	it("[P0-3] lanNetwork rejects clinic-default auto-join fallback and cross-tenant org mismatch", async () => {
		resetLanMeshAutoJoinServiceForTest();
		const app = Fastify();
		await app.register(registerLanNetworkRoutes);
		await app.ready();

		try {
			const noOrgRes = await app.inject({
				method: "POST",
				url: "/api/network/mesh/auto-join/verify",
				payload: { pin: "123456" },
			});
			assert.equal(noOrgRes.statusCode, 400);
			assert.equal(noOrgRes.json().error, "OrganizationRequired");

			const mismatchVerifyRes = await app.inject({
				method: "POST",
				url: "/api/network/mesh/auto-join/verify",
				headers: makeClinicAndStaffHeaders(ORG_A),
				payload: { pin: "123456", organizationId: ORG_B },
			});
			assert.equal(mismatchVerifyRes.statusCode, 403);

			const mismatchPairGenRes = await app.inject({
				method: "POST",
				url: "/api/network/pair/generate",
				headers: makeClinicAndStaffHeaders(ORG_A),
				payload: { role: "doctor", organizationId: ORG_B },
			});
			assert.equal(mismatchPairGenRes.statusCode, 403);
		} finally {
			await app.close();
		}
	});

	it("[P0-3 & Block 2] shifts/send-shift-summary enforces .strict() and blocks arbitrary chatId", async () => {
		const app = Fastify();
		await app.register(registerShiftRoutes);
		await app.ready();

		try {
			const evilChatRes = await app.inject({
				method: "POST",
				url: "/api/shifts/send-shift-summary",
				headers: makeClinicAndStaffHeaders(ORG_A),
				payload: {
					doctorFullName: "Доктор Иванов",
					chatId: "999999999",
					channel: "telegram",
				},
			});
			assert.equal(evilChatRes.statusCode, 400);

			const validSummaryRes = await app.inject({
				method: "POST",
				url: "/api/shifts/send-shift-summary",
				headers: makeClinicAndStaffHeaders(ORG_A),
				payload: {
					doctorFullName: "Доктор Иванов",
					doctorSpecialtyRu: "Терапевт",
					shiftDateLabel: "26.11.2026",
					totalRevenueRub: 15000,
					calculatedPayoutRub: 4500,
					completedCount: 5,
					channel: "journal",
				},
			});
			assert.equal(validSummaryRes.statusCode, 200);
			assert.equal(validSummaryRes.json().success, true);
		} finally {
			await app.close();
		}
	});

	it("[Block 2] MDLP routes and schedule shifts enforce .strict() and UUID query validation", async () => {
		const app = Fastify();
		await app.register(registerMdlpRoutes);
		await app.register(registerScheduleDoctorShiftsRoutes);
		await app.ready();

		try {
			const mdlpExtraFieldRes = await app.inject({
				method: "POST",
				url: "/api/mdlp/scan",
				headers: makeClinicAndStaffHeaders(ORG_A),
				payload: {
					rawBarcode: "0103664798000016211A2B3C4D5E6F7\x1d91ABCD\x1d92SIG",
					unexpectedField: true,
				},
			});
			assert.equal(mdlpExtraFieldRes.statusCode, 400);

			const badShiftsQueryRes = await app.inject({
				method: "GET",
				url: "/api/schedule/shifts?clinicId=not-a-uuid",
				headers: makeClinicAndStaffHeaders(ORG_A),
			});
			assert.equal(badShiftsQueryRes.statusCode, 400);

			const strictShiftBodyRes = await app.inject({
				method: "POST",
				url: "/api/schedule/shifts",
				headers: makeClinicAndStaffHeaders(ORG_A),
				payload: {
					shifts: [
						{
							doctorId: USER_A,
							doctorName: "Тест",
							extraUnknownProp: "nope",
						},
					],
				},
			});
			assert.equal(strictShiftBodyRes.statusCode, 400);
		} finally {
			await app.close();
		}
	});

	it("[Block 2] Inventory & tech-card routes return 400 on invalid UUIDs / NaN daysAhead instead of 500", async () => {
		const app = Fastify();
		await app.register(inventoryRoutes, { prefix: "/api/inventory" });
		await app.register(treatmentConsumablesRoutes, { prefix: "/api/treatment-consumables" });
		await app.ready();

		try {
			const badDeleteIdRes = await app.inject({
				method: "DELETE",
				url: "/api/treatment-consumables/not-a-uuid",
				headers: makeClinicAndStaffHeaders(ORG_A),
			});
			assert.equal(badDeleteIdRes.statusCode, 400);

			const badRuleServiceRes = await app.inject({
				method: "GET",
				url: `/api/inventory/${ORG_A}/rules/not-a-uuid`,
				headers: makeClinicAndStaffHeaders(ORG_A),
			});
			assert.equal(badRuleServiceRes.statusCode, 400);

			const badStockItemRes = await app.inject({
				method: "PATCH",
				url: "/api/inventory/not-a-uuid/stock",
				headers: makeClinicAndStaffHeaders(ORG_A),
				payload: { adjustment: 1 },
			});
			assert.equal(badStockItemRes.statusCode, 400);

			const badDaysAheadRes = await app.inject({
				method: "GET",
				url: `/api/inventory/${ORG_A}/batches/expiring?daysAhead=NaN`,
				headers: makeClinicAndStaffHeaders(ORG_A),
			});
			assert.equal(badDaysAheadRes.statusCode, 400);

			const badBatchItemRes = await app.inject({
				method: "GET",
				url: `/api/inventory/${ORG_A}/batches?itemId=not-a-uuid`,
				headers: makeClinicAndStaffHeaders(ORG_A),
			});
			assert.equal(badBatchItemRes.statusCode, 400);

			assert.equal(typeof inventoryQuery.getInventoryItems, "function");
		} finally {
			await app.close();
		}
	});
});
