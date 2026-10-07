import assert from "node:assert";
import { describe, test } from "node:test";
import {
	generatePairingCode,
	generateQrMatrixSvg,
	WhatsappConnectionHubService,
} from "../services/messaging/whatsappConnectionHub.js";

describe("WhatsApp Connection Hub (QR & WABA Cloud API)", () => {
	const testOrgId = "00000000-0000-0000-0000-000000000001";

	test("generateQrMatrixSvg: creates valid SVG matrix and Data URL", () => {
		const payload = "2@testPayloadString1234567890";
		const { svg, dataUrl } = generateQrMatrixSvg(payload, 260);

		assert.ok(svg.startsWith("<svg"), "SVG должен начинаться с тега <svg>");
		assert.ok(svg.includes('viewBox="0 0 29 29"'), "SVG должен иметь сетку 29x29");
		assert.ok(svg.includes('fill="#111827"'), "SVG должен содержать модули QR-кода");
		assert.ok(dataUrl.startsWith("data:image/svg+xml;base64,"), "Data URL должен быть валидным base64 SVG");
	});

	test("generatePairingCode: creates 8-symbol formatted code without ambiguous chars", () => {
		const code = generatePairingCode();
		assert.strictEqual(code.length, 9, "Код сопряжения должен быть длины 9 (8 знаков + дефис)");
		assert.strictEqual(code[4], "-", "Код должен быть разделен дефисом по центру");

		// Символы 0, O, 1, I должны отсутствовать во избежание ошибок ввода персоналом
		assert.ok(!code.includes("0"), "Не должен содержать цифру 0");
		assert.ok(!code.includes("O"), "Не должен содержать букву O");
		assert.ok(!code.includes("1"), "Не должен содержать цифру 1");
		assert.ok(!code.includes("I"), "Не должен содержать букву I");
	});

	test("QR Session Lifecycle: start -> status -> simulate auth -> disconnect", () => {
		// 1. Старт новой сессии
		const session = WhatsappConnectionHubService.startQrSession({
			organizationId: testOrgId,
			pairingPhone: "+7 (999) 000-11-22",
			forceRefresh: true,
		});

		assert.strictEqual(session.status, "qr_ready");
		assert.ok(session.qrDataUrl.startsWith("data:image/svg+xml;base64,"));
		assert.strictEqual(session.pairingPhone, "+7 (999) 000-11-22");
		assert.ok(session.expiresAt > Date.now());

		// 2. Проверка статуса
		const status = WhatsappConnectionHubService.getQrSessionStatus(testOrgId);
		assert.strictEqual(status.status, "qr_ready");
		assert.ok(status.secondsLeft > 0 && status.secondsLeft <= 60);
		assert.strictEqual(status.pairingPhone, "+7 (999) 000-11-22");

		// 3. Симуляция авторизации (сканирование рабочим телефоном)
		const authSession = WhatsappConnectionHubService.simulateAuthenticate(
			testOrgId,
			"+7 (999) 777-88-99",
			"Клиника Рабочий Смартфон",
		);
		assert.strictEqual(authSession.status, "authenticated");
		assert.strictEqual(authSession.connectedPhone, "+7 (999) 777-88-99");
		assert.strictEqual(authSession.deviceModel, "Клиника Рабочий Смартфон");

		const statusAfterAuth = WhatsappConnectionHubService.getQrSessionStatus(testOrgId);
		assert.strictEqual(statusAfterAuth.status, "authenticated");
		assert.strictEqual(statusAfterAuth.connectedPhone, "+7 (999) 777-88-99");

		// 4. Отвязка устройства
		const disconnected = WhatsappConnectionHubService.disconnectQrSession(testOrgId);
		assert.strictEqual(disconnected, true);

		const statusAfterDisconnect = WhatsappConnectionHubService.getQrSessionStatus(testOrgId);
		assert.strictEqual(statusAfterDisconnect.status, "disconnected");
		assert.strictEqual(statusAfterDisconnect.connectedPhone, null);
	});

	test("testWabaConnection: validates Meta API response", async () => {
		// Валидный тест
		const validResult = await WhatsappConnectionHubService.testWabaConnection({
			phoneNumberId: "109876543210",
			accessToken: "test_mock_token_valid_crm_meta",
		});

		assert.strictEqual(validResult.ok, true);
		assert.ok(validResult.verifiedName?.includes("ДЕНТЕ"));
		assert.strictEqual(validResult.qualityRating, "GREEN");

		// Ошибка недействительного токена
		const invalidResult = await WhatsappConnectionHubService.testWabaConnection({
			phoneNumberId: "109876543210",
			accessToken: "test_mock_token_invalid_expired",
		});

		assert.strictEqual(invalidResult.ok, false);
		assert.strictEqual(invalidResult.errorCode, 190);
		assert.ok(invalidResult.errorMessage?.includes("Недействительный токен"));
	});
});
