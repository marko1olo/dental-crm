import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	createImplantInstallationSchema,
	isPermanentFdiTooth,
	permanentToothNumberFdiSchema,
} from "../implantologyAndPrescriptionSchemas.js";
import {
	SURGICAL_SERVICES_CATALOG,
	SURGICAL_SERVICES_804N,
} from "../../clinical/implants/catalog.js";

describe("Implantology Dentition Gate (Mandate 8e, Clinical Safety Invariants)", () => {
	it("1. isPermanentFdiTooth correctly accepts all 32 permanent teeth", () => {
		const permanentTeeth = [
			11, 12, 13, 14, 15, 16, 17, 18,
			21, 22, 23, 24, 25, 26, 27, 28,
			31, 32, 33, 34, 35, 36, 37, 38,
			41, 42, 43, 44, 45, 46, 47, 48,
		];

		for (const tooth of permanentTeeth) {
			assert.equal(isPermanentFdiTooth(tooth), true, `Permanent tooth #${tooth} should be valid`);
			const res = permanentToothNumberFdiSchema.safeParse(tooth);
			assert.equal(res.success, true, `Permanent tooth #${tooth} should parse successfully`);
		}
	});

	it("2. strictly rejects deciduous teeth (51–85) with clinical error", () => {
		const deciduousTeeth = [
			51, 52, 53, 54, 55,
			61, 62, 63, 64, 65,
			71, 72, 73, 74, 75,
			81, 82, 83, 84, 85,
		];

		for (const tooth of deciduousTeeth) {
			assert.equal(isPermanentFdiTooth(tooth), false, `Deciduous tooth #${tooth} must be rejected`);
			const res = permanentToothNumberFdiSchema.safeParse(tooth);
			assert.equal(res.success, false, `Deciduous tooth #${tooth} must fail validation`);
			if (!res.success) {
				assert.ok(
					res.error.issues[0]?.message.includes("молочных зубов"),
					`Error message for #${tooth} must mention prohibition of deciduous teeth`,
				);
			}
		}
	});

	it("3. rejects invalid FDI numbers outside dentition ranges (e.g. 19, 29, 39, 49, 90, 0)", () => {
		const invalidNumbers = [0, 9, 10, 19, 20, 29, 30, 39, 40, 49, 50, 86, 99];
		for (const invalid of invalidNumbers) {
			assert.equal(isPermanentFdiTooth(invalid), false);
			const res = permanentToothNumberFdiSchema.safeParse(invalid);
			assert.equal(res.success, false);
		}
	});

	it("4. createImplantInstallationSchema rejects deciduous teeth in payload", () => {
		const validBasePayload = {
			patientId: "00000000-0000-4000-8000-000000000001",
			implantBrand: "osstem",
			implantDiameterMm: 4.0,
			implantLengthMm: 10.0,
			boneDensityClass: "D2",
			finalInsertionTorqueNcm: 35,
		};

		// Permanent tooth 46 -> OK
		const validRes = createImplantInstallationSchema.safeParse({
			...validBasePayload,
			toothNumberFdi: 46,
		});
		assert.equal(validRes.success, true);

		// Deciduous tooth 55 -> Rejected
		const deciduousRes = createImplantInstallationSchema.safeParse({
			...validBasePayload,
			toothNumberFdi: 55,
		});
		assert.equal(deciduousRes.success, false);
	});

	it("5. Mandate 8x: SURGICAL_SERVICES_CATALOG is canonical and equals SURGICAL_SERVICES_804N alias", () => {
		assert.ok(Array.isArray(SURGICAL_SERVICES_CATALOG));
		assert.ok(SURGICAL_SERVICES_CATALOG.length >= 7);
		assert.strictEqual(SURGICAL_SERVICES_804N, SURGICAL_SERVICES_CATALOG);
		assert.ok(SURGICAL_SERVICES_CATALOG.some((s) => s.code === "A16.07.054"));
	});
});
