import assert from "node:assert/strict";
import test from "node:test";
import {
	generateSecureAlphanumericId,
	hashStringSeed,
	generateDeterministicOrSecureInteger,
	generatePrescriptionSeriesNumber,
	generateAnesthesiaPkuRecordNumber,
	generateAnesthesiaPkuRecordId,
	generateFamilyDepositTransactionId,
	generatePartialRefundOperationNumber,
	generateTreatmentPlanNumber,
	generateTreatmentPlanId,
	generatePurchaseOrderNumber,
	generatePurchaseOrderId,
	generatePurchaseReceiptId,
	generateTransferM11Id,
	generateClassBWasteSealAndBarcode,
	generateSecureUuid,
	generateBridgeId,
	resetSequenceCounter,
} from "../idGenerators.js";

test("packages/shared/utils/idGenerators: generateSecureAlphanumericId generates proper length and chars", () => {
	const id1 = generateSecureAlphanumericId(8);
	const id2 = generateSecureAlphanumericId(16, false);

	assert.equal(id1.length, 8);
	assert.equal(id2.length, 16);
	assert.match(id1, /^[0-9a-z]{8}$/);
	assert.match(id2, /^[0-9A-Za-z]{16}$/);
});

test("packages/shared/utils/idGenerators: hashStringSeed is deterministic", () => {
	const h1 = hashStringSeed("patient-12345");
	const h2 = hashStringSeed("patient-12345");
	const h3 = hashStringSeed("patient-67890");

	assert.equal(h1, h2);
	assert.notEqual(h1, h3);
});

test("packages/shared/utils/idGenerators: generateDeterministicOrSecureInteger stays within bounds", () => {
	for (let i = 0; i < 50; i++) {
		const val = generateDeterministicOrSecureInteger(100, 200);
		assert.ok(val >= 100 && val <= 200, `val ${val} should be between 100 and 200`);
	}

	const detVal1 = generateDeterministicOrSecureInteger(1000, 9999, "seed-key-1");
	const detVal2 = generateDeterministicOrSecureInteger(1000, 9999, "seed-key-1");
	assert.equal(detVal1, detVal2);
});

test("packages/shared/utils/idGenerators: generatePrescriptionSeriesNumber satisfies Order 1094n", () => {
	const rec = generatePrescriptionSeriesNumber("РЕЦ", { year: 2026, seedKey: "card-99" });
	assert.match(rec, /^РЕЦ-2026-\d{4}$/);

	const pku = generatePrescriptionSeriesNumber("ПКУ", { year: 2026, seedKey: "card-99" });
	assert.match(pku, /^ПКУ-2026-\d{6}$/);

	const custom = generatePrescriptionSeriesNumber("РЕЦ", { customSeriesNumber: "CUSTOM-001" });
	assert.equal(custom, "CUSTOM-001");
});

test("packages/shared/utils/idGenerators: generateAnesthesiaPkuRecord satisfies SanPiN 3.3686-21", () => {
	const num = generateAnesthesiaPkuRecordNumber(2026, { seedKey: "art-1" });
	assert.match(num, /^ПКУ-АН-2026\/\d{3}$/);

	const id = generateAnesthesiaPkuRecordId();
	assert.match(id, /^pku_an_\d+_[a-z0-9]{6}$/);
});

test("packages/shared/utils/idGenerators: generateFamilyDepositTransactionId formats transactions", () => {
	const dep = generateFamilyDepositTransactionId("DEP", { seedKey: "family-1" });
	const deb = generateFamilyDepositTransactionId("DEB", { seedKey: "family-1" });
	const ref = generateFamilyDepositTransactionId("REF", { seedKey: "family-1" });

	assert.match(dep, /^TX-DEP-\d+-\d{4}$/);
	assert.match(deb, /^TX-DEB-\d+-\d{4}$/);
	assert.match(ref, /^TX-REF-\d+-\d{4}$/);
});

test("packages/shared/utils/idGenerators: generatePartialRefundOperationNumber formats 54-FZ returns", () => {
	const opNum = generatePartialRefundOperationNumber("2026-10-02T12:00:00.000Z", { seedKey: "inv-42" });
	assert.match(opNum, /^ВЗВ-20261002-\d{4}$/);
});

test("packages/shared/utils/idGenerators: generateTreatmentPlanNumber & Id", () => {
	const num = generateTreatmentPlanNumber(new Date("2026-05-15"), { seedKey: "pat-1:doc-1" });
	assert.match(num, /^ПЛ-2026-\d{4}$/);

	const id = generateTreatmentPlanId();
	assert.match(id, /^plan_\d+_[a-z0-9]{6}$/);
});

test("packages/shared/utils/idGenerators: Purchase Order numbers and IDs", () => {
	const poNum = generatePurchaseOrderNumber(2026, { seedKey: "sup-99" });
	assert.match(poNum, /^PO-2026-\d{3}$/);

	const poId = generatePurchaseOrderId();
	assert.match(poId, /^po-\d+-[a-z0-9]{6}$/);

	const rcptId = generatePurchaseReceiptId();
	assert.match(rcptId, /^rcpt-\d+-[a-z0-9]{6}$/);
});

test("packages/shared/utils/idGenerators: Transfer M-11 document IDs", () => {
	const m11Id = generateTransferM11Id();
	assert.match(m11Id, /^m11_\d+_[a-z0-9]{6}$/);
});

test("packages/shared/utils/idGenerators: Class B Medical Waste seal and barcode (SanPiN 2.1.3684-21)", () => {
	const refDate = new Date("2026-10-02");
	const waste = generateClassBWasteSealAndBarcode(refDate, { seedKey: "visit-123" });

	assert.match(waste.sealNumber, /^ПЛ-Б-2026-\d{5}$/);
	assert.match(waste.barcode, /^WASTE-CLASS_B-DENT-20261002-\d{4}$/);
});

test("packages/shared/utils/idGenerators: generateSecureUuid generates valid RFC 4122 v4 UUIDs without Math.random", () => {
	const uuid1 = generateSecureUuid();
	const uuid2 = generateSecureUuid();

	assert.notEqual(uuid1, uuid2);
	// RFC 4122 v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx where y in [8, 9, a, b]
	const uuidv4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
	assert.match(uuid1, uuidv4Regex, `UUID ${uuid1} must match RFC 4122 v4`);
	assert.match(uuid2, uuidv4Regex, `UUID ${uuid2} must match RFC 4122 v4`);
});

test("packages/shared/utils/idGenerators: generateBridgeId formats deterministic and CSPRNG identifiers", () => {
	// Deterministic with patientId
	const b1 = generateBridgeId([16, 15, 14], "pat-test-1");
	const b2 = generateBridgeId([14, 15, 16], "pat-test-1");
	assert.equal(b1, "bridge_14_15_16_pat-test-1");
	assert.equal(b1, b2, "Sorted order guarantees deterministic ID irrespective of input order");

	// CSPRNG without patientId
	const bRand = generateBridgeId([24, 25, 26]);
	assert.match(bRand, /^bridge_24_25_26_[a-z0-9]{6}$/);
});
