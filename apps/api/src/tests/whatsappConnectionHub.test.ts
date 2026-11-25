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

	test("QR Session Lifecycle: honest unconfigured outside demo mode, and start -> status -> disconnect with gateway", () => {
		const prevGateway = process.env.WHATSAPP_GATEWAY_URL;
		const prevGreenApi = process.env.GREEN_API_INSTANCE_ID;
		const prevDemo = process.env.DENTE_DEMO_MODE;
		const prevDemoLogin = process.env.DENTE_ALLOW_DEMO_LOGIN;
		const prevDemoShowcase = process.env.DENTE_DEMO_SHOWCASE;
		delete process.env.WHATSAPP_GATEWAY_URL;
		delete process.env.GREEN_API_INSTANCE_ID;
		delete process.env.DENTE_DEMO_MODE;
		delete process.env.DENTE_ALLOW_DEMO_LOGIN;
		delete process.env.DENTE_DEMO_SHOWCASE;

		try {
			const unconf = WhatsappConnectionHubService.startQrSession({
				organizationId: testOrgId,
				forceRefresh: true,
			});
			assert.strictEqual(unconf.status, "disconnected");
			assert.ok(unconf.notConfiguredReason);

			process.env.WHATSAPP_GATEWAY_URL = "https://gateway.example.test";
			// 1. Старт новой сессии при настроенном шлюзе
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

			// 3. Отвязка устройства
			const disconnected = WhatsappConnectionHubService.disconnectQrSession(testOrgId);
			assert.strictEqual(disconnected, true);

			const statusAfterDisconnect = WhatsappConnectionHubService.getQrSessionStatus(testOrgId);
			assert.strictEqual(statusAfterDisconnect.status, "disconnected");
			assert.strictEqual(statusAfterDisconnect.connectedPhone, null);
		} finally {
			if (prevGateway === undefined) delete process.env.WHATSAPP_GATEWAY_URL;
			else process.env.WHATSAPP_GATEWAY_URL = prevGateway;
			if (prevGreenApi === undefined) delete process.env.GREEN_API_INSTANCE_ID;
			else process.env.GREEN_API_INSTANCE_ID = prevGreenApi;
			if (prevDemo === undefined) delete process.env.DENTE_DEMO_MODE;
			else process.env.DENTE_DEMO_MODE = prevDemo;
			if (prevDemoLogin === undefined) delete process.env.DENTE_ALLOW_DEMO_LOGIN;
			else process.env.DENTE_ALLOW_DEMO_LOGIN = prevDemoLogin;
			if (prevDemoShowcase === undefined) delete process.env.DENTE_DEMO_SHOWCASE;
			else process.env.DENTE_DEMO_SHOWCASE = prevDemoShowcase;
		}
	});

	test("testWabaConnection: validates Meta API response via real HTTP client", async (t) => {
		// 1. Валидный ответ Meta Graph API v21.0
		const fetchMock = t.mock.method(
			globalThis,
			"fetch",
			async (input: string | URL | Request, init?: RequestInit) => {
				const url = String(input);
				const headers = init?.headers as Record<string, string> | undefined;

				assert.ok(
					url.startsWith("https://graph.facebook.com/v21.0/109876543210"),
					`Ожидался запрос к Meta Graph API v21.0, получено: ${url}`,
				);
				assert.equal(headers?.Authorization, "Bearer meta_crm_valid_token");

				return new Response(
					JSON.stringify({
						verified_name: "Стоматологическая Клиника ДЕНТЕ",
						display_phone_number: "+7 (495) 911-20-20",
						quality_rating: "GREEN",
						code_verification_status: "VERIFIED",
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			},
		);

		const validResult = await WhatsappConnectionHubService.testWabaConnection({
			phoneNumberId: "109876543210",
			accessToken: "meta_crm_valid_token",
		});

		assert.strictEqual(validResult.ok, true);
		assert.strictEqual(validResult.verifiedName, "Стоматологическая Клиника ДЕНТЕ");
		assert.strictEqual(validResult.displayPhoneNumber, "+7 (495) 911-20-20");
		assert.strictEqual(validResult.qualityRating, "GREEN");
		assert.strictEqual(validResult.codeVerificationStatus, "VERIFIED");

		// 2. Ошибка недействительного токена Meta Graph API (HTTP 401)
		fetchMock.mock.mockImplementation(async () => {
			return new Response(
				JSON.stringify({
					error: {
						message: "Error validating access token: Session has expired",
						code: 190,
					},
				}),
				{ status: 401, headers: { "Content-Type": "application/json" } },
			);
		});

		const invalidResult = await WhatsappConnectionHubService.testWabaConnection({
			phoneNumberId: "109876543210",
			accessToken: "test_mock_token_invalid_expired",
		});

		assert.strictEqual(invalidResult.ok, false);
		assert.strictEqual(invalidResult.errorCode, 190);
		assert.ok(invalidResult.errorMessage?.includes("Error validating access token"));
	});
});
