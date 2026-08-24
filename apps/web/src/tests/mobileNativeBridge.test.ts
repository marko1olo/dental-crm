import assert from "node:assert/strict";
import test from "node:test";
import {
	authenticateBiometricStaff,
	classifyBiometricFallbackReason,
	clearModalBackStack,
	createDenteDeepLink,
	generateTelegramDocShareLink,
	generateWhatsAppDocShareLink,
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
	isValidStaffPinFormat,
	parseDenteDeepLink,
	parseGs1DataMatrix,
	popModalBackHandler,
	pushModalBackHandler,
	removeSecureToken,
	requestPushNotificationPermission,
	saveSecureToken,
	scanDataMatrixWithCamera,
	shareClinicalDocumentMobile,
	triggerHaptic,
	verifyStaffPinCode,
	type MobileNativeApi,
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

	await t.test("triggerHaptic dispatches distinct vibration feedback patterns across platforms", () => {
		// Headless / Browser safe invocation
		assert.doesNotThrow(() => triggerHaptic("light")); // tooth formula tap
		assert.doesNotThrow(() => triggerHaptic("selection")); // menu select
		assert.doesNotThrow(() => triggerHaptic("medium")); // modal open
		assert.doesNotThrow(() => triggerHaptic("heavy")); // delete action
		assert.doesNotThrow(() => triggerHaptic("success")); // GS1 DataMatrix / Passport OCR scan
		assert.doesNotThrow(() => triggerHaptic("warning")); // clinical allergy warning
		assert.doesNotThrow(() => triggerHaptic("error")); // auth lockout / PIN failure

		// Test delegation to MobileNativeApi
		const receivedHaptics: string[] = [];
		const mockHapticApi: MobileNativeApi = {
			isMobileApp: true,
			platform: "android",
			appVersion: "1.0.0",
			scanBarcode: async () => ({ success: true }),
			authenticateBiometric: async () => ({ success: true, authenticated: true }),
			hapticFeedback: (type) => {
				receivedHaptics.push(type || "light");
			},
			shareFile: async () => ({ success: true }),
		};

		const original = (globalThis as any).window;
		(globalThis as any).window = {
			denteMobileNative: mockHapticApi,
		};

		try {
			triggerHaptic("light");
			triggerHaptic("success");
			triggerHaptic("warning");
			triggerHaptic("error");

			assert.deepEqual(receivedHaptics, ["light", "success", "warning", "error"]);
		} finally {
			(globalThis as any).window = original;
		}
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

	await t.test("Staff PIN validation & constant-time verification protects against side-channel timing attacks", () => {
		// Valid PIN format: 4 to 6 digits
		assert.equal(isValidStaffPinFormat("1234"), true);
		assert.equal(isValidStaffPinFormat("987654"), true);
		assert.equal(isValidStaffPinFormat("123"), false); // too short
		assert.equal(isValidStaffPinFormat("1234567"), false); // too long
		assert.equal(isValidStaffPinFormat("12a4"), false); // letters
		assert.equal(isValidStaffPinFormat(""), false);

		// Constant-time PIN verification
		assert.equal(verifyStaffPinCode("4455", "4455"), true);
		assert.equal(verifyStaffPinCode("4455", "4456"), false);
		assert.equal(verifyStaffPinCode("123456", "123456"), true);
		assert.equal(verifyStaffPinCode("123456", "123457"), false);
	});

	await t.test("Biometric error classification triggers seamless fallback to 4/6-digit PIN", () => {
		const notEnrolled = classifyBiometricFallbackReason("No biometric identities enrolled on device");
		assert.equal(notEnrolled.fallbackRequired, true);
		assert.equal(notEnrolled.reason, "not_enrolled");

		const userCancel = classifyBiometricFallbackReason("User cancelled biometric prompt to use PIN passcode");
		assert.equal(userCancel.fallbackRequired, true);
		assert.equal(userCancel.reason, "user_fallback");

		const lockedOut = classifyBiometricFallbackReason("Biometric sensor locked due to too many failed attempts");
		assert.equal(lockedOut.fallbackRequired, true);
		assert.equal(lockedOut.reason, "locked_out");

		const hwUnavailable = classifyBiometricFallbackReason("Biometric hardware not present");
		assert.equal(hwUnavailable.fallbackRequired, true);
		assert.equal(hwUnavailable.reason, "hardware_unavailable");
	});

	await t.test("Simulated Android device seamlessly falls back to PIN on biometric refusal", async () => {
		const mockNativeWithFallback: MobileNativeApi = {
			isMobileApp: true,
			platform: "android",
			appVersion: "1.0.0",
			scanBarcode: async () => ({ success: true }),
			authenticateBiometric: async () => ({
				success: false,
				authenticated: false,
				biometryType: "fingerprint",
				error: "User selected fallback PIN",
			}),
			hapticFeedback: () => {},
			shareFile: async () => ({ success: true }),
		};

		const original = (globalThis as any).window;
		(globalThis as any).window = {
			denteMobileNative: mockNativeWithFallback,
		};

		try {
			const res = await authenticateBiometricStaff();
			assert.equal(res.success, false);
			assert.equal(res.authenticated, false);
			assert.equal(res.authMethod, "pin");
			assert.equal(res.fallbackRequired, true);
			assert.equal(res.fallbackReason, "user_fallback");
		} finally {
			(globalThis as any).window = original;
		}
	});

	await t.test("Deep link parser & creator accurately routes dente:// URLs to clinical workspaces", () => {
		// 1. Visit Deep Link: dente://open-visit?patientId=pat-100&visitId=vis-200
		const visitLink = "dente://open-visit?patientId=pat-100&visitId=vis-200";
		const parsedVisit = parseDenteDeepLink(visitLink);
		assert.ok(parsedVisit);
		assert.equal(parsedVisit.protocol, "dente");
		assert.equal(parsedVisit.action, "open-visit");
		assert.equal(parsedVisit.patientId, "pat-100");
		assert.equal(parsedVisit.visitId, "vis-200");

		// 2. Tax Deduction Deep Link: dente://open-tax-cert?patientId=pat-400
		const taxLink = "dente://open-tax-cert?patientId=pat-400";
		const parsedTax = parseDenteDeepLink(taxLink);
		assert.ok(parsedTax);
		assert.equal(parsedTax.action, "open-tax-cert");
		assert.equal(parsedTax.patientId, "pat-400");

		// 3. HTTPS Web PWA fallback routing: https://crm.dente.ru/open-patient?pid=pat-999
		const webLink = "https://crm.dente.ru/open-patient?pid=pat-999";
		const parsedWeb = parseDenteDeepLink(webLink);
		assert.ok(parsedWeb);
		assert.equal(parsedWeb.protocol, "https");
		assert.equal(parsedWeb.action, "open-patient");
		assert.equal(parsedWeb.patientId, "pat-999");

		// 4. Create Deep Link URL
		const generated = createDenteDeepLink("open-visit", {
			patientId: "pat-555",
			visitId: "vis-777",
		});
		assert.equal(generated, "dente://open-visit?patientId=pat-555&visitId=vis-777");
	});

	await t.test("Clinical document messenger sharing dispatches WhatsApp SOS and Telegram links safely", async () => {
		// WhatsApp Share Link
		const waLink = generateWhatsAppDocShareLink("89161234567", "Справка КНД 1151156 готова");
		assert.ok(waLink.startsWith("https://api.whatsapp.com/send?phone=79161234567&text="));
		assert.ok(waLink.includes(encodeURIComponent("Справка КНД 1151156 готова")));

		// Telegram Share Link
		const tgLink = generateTelegramDocShareLink("Чек 54-ФЗ №1042", "https://crm.dente.ru/receipt/1042");
		assert.ok(tgLink.startsWith("https://t.me/share/url?"));
		assert.ok(tgLink.includes(encodeURIComponent("https://crm.dente.ru/receipt/1042")));

		// Dispatch via shareClinicalDocumentMobile (fallback messenger)
		const res = await shareClinicalDocumentMobile({
			title: "Справка об оплате медицинских услуг (КНД 1151156)",
			text: "Клиника ДЕНТЕ: Ваша справка за 2025 год сформирована.",
			phone: "+7 (999) 111-22-33",
		});
		assert.equal(res.success, true);
		assert.equal(res.sharedVia, "whatsapp_sos");
		assert.ok(res.urlOrPayload?.includes("79991112233"));
	});
});

