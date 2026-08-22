import assert from "node:assert/strict";
import test from "node:test";
import {
	authenticateBiometricStaff,
	getMobileNativeApi,
	isMobileApp,
	parseGs1DataMatrix,
	scanDataMatrixWithCamera,
	triggerHaptic,
} from "../native/mobileBridge";

test("Mobile Android (.APK) & GS1 DataMatrix Verification Suite", async (t) => {
	await t.test("parseGs1DataMatrix correctly parses standard Russian MDLP / Chestny ZNAK codes", () => {
		// Example standard GS1 DataMatrix code with FNC1:
		// (01) 04601234567890 (21) abcd123456 (91) EE06 (92) a1b2c3d4e5f6...
		const rawCode = "010460123456789021abcd123456\u001d91EE06\u001d92abcdefghijklmnopqrstuvwxyz0123456789ABCDEF";
		const parsed = parseGs1DataMatrix(rawCode);

		assert.equal(parsed.isValidMdlp, true);
		assert.equal(parsed.gtin, "04601234567890");
		assert.equal(parsed.serialNumber, "abcd123456");
		assert.equal(parsed.cryptoKey, "EE06");
		assert.equal(parsed.cryptoSignature, "abcdefghijklmnopqrstuvwxyz0123456789ABCDEF");
	});

	await t.test("parseGs1DataMatrix parses parenthesized AI notation", () => {
		const rawParenthesized = "(01)04607008371234(21)1A2B3C4D(17)280630(10)LOT998(91)9876(92)ABCDEF12345678901234567890123456789012345678";
		const parsed = parseGs1DataMatrix(rawParenthesized);

		assert.equal(parsed.isValidMdlp, true);
		assert.equal(parsed.gtin, "04607008371234");
		assert.equal(parsed.serialNumber, "1A2B3C4D");
		assert.equal(parsed.expirationDate, "280630");
		assert.equal(parsed.batchLot, "LOT998");
		assert.equal(parsed.cryptoKey, "9876");
	});

	await t.test("parseGs1DataMatrix gracefully handles non-GS1 strings", () => {
		const rawSimple = "4601234567890";
		const parsed = parseGs1DataMatrix(rawSimple);

		assert.equal(parsed.raw, "4601234567890");
		assert.equal(parsed.isValidMdlp, false);
	});

	await t.test("authenticateBiometricStaff provides clear guidance in non-mobile environment", async () => {
		const result = await authenticateBiometricStaff();
		assert.equal(result.success, false);
		assert.equal(result.authenticated, false);
		assert.ok(result.error?.includes("Биометрическая"));
	});

	await t.test("scanDataMatrixWithCamera returns fallback instruction in browser", async () => {
		const result = await scanDataMatrixWithCamera();
		assert.equal(result.success, false);
		assert.ok(result.error?.includes("Android (.apk)"));
	});

	await t.test("triggerHaptic does not throw in headless environment", () => {
		assert.doesNotThrow(() => triggerHaptic("success"));
		assert.doesNotThrow(() => triggerHaptic("error"));
		assert.doesNotThrow(() => triggerHaptic("heavy"));
	});
});
