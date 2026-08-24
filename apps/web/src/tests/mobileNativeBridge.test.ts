import assert from "node:assert/strict";
import test from "node:test";
import {
	authenticateBiometricStaff,
	clearModalBackStack,
	getDeviceFormFactor,
	getModalBackStackDepth,
	getMobileNativeApi,
	getSafeAreaInsets,
	getSecureToken,
	handleHardwareBackAction,
	initHardwareBackButtonListener,
	isMobileApp,
	isMobileSmartphone,
	isTabletDevice,
	parseGs1DataMatrix,
	popModalBackHandler,
	pushModalBackHandler,
	removeSecureToken,
	requestPushNotificationPermission,
	saveSecureToken,
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

	await t.test("saveSecureToken and getSecureToken store and retrieve session tokens safely", async () => {
		const saveRes = await saveSecureToken("clinic_jwt", "bearer-test-token-123");
		assert.equal(saveRes.success, true);

		const getRes = await getSecureToken("clinic_jwt");
		assert.equal(getRes.success, true);

		const removeRes = await removeSecureToken("clinic_jwt");
		assert.equal(removeRes.success, true);
	});

	await t.test("requestPushNotificationPermission handles browser environment gracefully", async () => {
		const res = await requestPushNotificationPermission();
		assert.equal(typeof res.granted, "boolean");
		assert.ok(["granted", "denied", "default"].includes(res.status));
	});

	await t.test("Device form factor detection handles responsive breakpoints", () => {
		const factor = getDeviceFormFactor();
		assert.ok(["tablet", "phone", "desktop"].includes(factor));
		assert.equal(typeof isTabletDevice(), "boolean");
		assert.equal(typeof isMobileSmartphone(), "boolean");

		const insets = getSafeAreaInsets();
		assert.equal(typeof insets.top, "number");
		assert.equal(typeof insets.bottom, "number");
		assert.equal(typeof insets.left, "number");
		assert.equal(typeof insets.right, "number");
	});

	await t.test("Simulated Android Capacitor bridge delegates biometrics & Keystore properly", async () => {
		const mockTokens = new Map<string, string>();
		const mockNativeApi = {
			isMobileApp: true,
			platform: "android" as const,
			appVersion: "1.4.2",
			scanBarcode: async () => ({
				success: true,
				barcode: "010460123456789021SN102938\u001d91EE06\u001d92SIG12345",
				format: "DATA_MATRIX" as const,
			}),
			authenticateBiometric: async () => ({
				success: true,
				authenticated: true,
				biometryType: "fingerprint" as const,
			}),
			hapticFeedback: () => {},
			shareFile: async () => ({ success: true }),
			setSecureSecret: async (k: string, v: string) => {
				mockTokens.set(k, v);
				return { success: true };
			},
			getSecureSecret: async (k: string) => ({
				success: true,
				value: mockTokens.get(k),
			}),
			removeSecureSecret: async (k: string) => {
				mockTokens.delete(k);
				return { success: true };
			},
			registerPushNotifications: async () => ({
				success: true,
				token: "fcm-registration-token-live-2026",
			}),
		};

		// Inject mock bridge
		const original = (globalThis as any).window;
		(globalThis as any).window = {
			denteMobileNative: mockNativeApi,
		};

		try {
			assert.equal(isMobileApp(), true);
			const bio = await authenticateBiometricStaff("Вход врача в клинику");
			assert.equal(bio.success, true);
			assert.equal(bio.authenticated, true);
			assert.equal(bio.biometryType, "fingerprint");

			const scan = await scanDataMatrixWithCamera();
			assert.equal(scan.success, true);
			assert.equal(scan.format, "DATA_MATRIX");

			await saveSecureToken("auth_pin", "9988");
			const retrieved = await getSecureToken("auth_pin");
			assert.equal(retrieved.value, "9988");

			await removeSecureToken("auth_pin");
			const afterDelete = await getSecureToken("auth_pin");
			assert.equal(afterDelete.value, undefined);
		} finally {
			(globalThis as any).window = original;
		}
	});

	await t.test("Hardware Back Button LIFO Modal Stack intercepts back actions and closes top modal", () => {
		clearModalBackStack();
		assert.equal(getModalBackStackDepth(), 0);

		// With empty stack, back action is not consumed
		assert.equal(handleHardwareBackAction(), false);

		const closedModals: string[] = [];

		// Push Modal 1 (e.g. PatientCardModal)
		const unsubModal1 = pushModalBackHandler("modal_patient_card", () => {
			closedModals.push("modal_patient_card");
			return true;
		}, 10);

		// Push Submodal 2 (e.g. SbpPaymentSheet on top)
		const unsubModal2 = pushModalBackHandler("submodal_sbp_payment", () => {
			closedModals.push("submodal_sbp_payment");
			return true;
		}, 20);

		assert.equal(getModalBackStackDepth(), 2);

		// First Back Action -> must close top Submodal 2
		const action1Consumed = handleHardwareBackAction();
		assert.equal(action1Consumed, true);
		assert.deepEqual(closedModals, ["submodal_sbp_payment"]);
		assert.equal(getModalBackStackDepth(), 1);

		// Second Back Action -> must close Modal 1
		const action2Consumed = handleHardwareBackAction();
		assert.equal(action2Consumed, true);
		assert.deepEqual(closedModals, ["submodal_sbp_payment", "modal_patient_card"]);
		assert.equal(getModalBackStackDepth(), 0);

		// Third Back Action -> stack is now empty, allows app exit/minimize
		const action3Consumed = handleHardwareBackAction();
		assert.equal(action3Consumed, false);

		// Test explicit unsubscribe
		const unsubModal3 = pushModalBackHandler("modal_temp", () => {
			closedModals.push("modal_temp");
		}, 10);
		assert.equal(getModalBackStackDepth(), 1);
		unsubModal3();
		assert.equal(getModalBackStackDepth(), 0);
	});
});

