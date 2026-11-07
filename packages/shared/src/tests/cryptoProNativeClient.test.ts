/**
 * ═══════════════════════════════════════════════════════════════════════════
 * UNIT TESTS: CRYPTOPRO NATIVE FASTIFY CLI BRIDGE & CLIENT ([CRY-03])
 * Verifies transparent native CLI call when browser cadesplugin is absent,
 * PIN code handling for hardware tokens, and Tamper Resistance invariants.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	fetchCryptoProNativeCertificates,
	fetchCryptoProNativeStatus,
	signWithCryptoProNative,
} from "../crypto/cryptoProNativeClient.js";
import {
	createDemonstrationGostCmsSignature,
	validateGostCmsPkcs7Signature,
} from "../crypto/index.js";

describe("CryptoPro Native Fastify CLI Bridge Client ([CRY-03])", () => {
	it("fetchCryptoProNativeStatus handles active and offline bridge gracefully without crashing", async () => {
		// Тест проверяет вызов с мок-функцией fetch
		const prevFetch = globalThis.fetch;
		try {
			// 1. Успешный ответ от нативного бэкенда Fastify
			globalThis.fetch = async (input: RequestInfo | URL) => {
				const url = String(input);
				if (url.includes("/api/cryptopro/native/status")) {
					return {
						ok: true,
						json: async () => ({
							success: true,
							installed: true,
							signingAvailable: true,
							paperFallbackAvailable: true,
							message: "КриптоПро CSP установлен и готов к подписанию",
							paths: { csptest: "csptest.exe", cryptcp: "cryptcp.exe", certmgr: null },
						}),
					} as Response;
				}
				throw new Error("Unexpected url: " + url);
			};

			const status = await fetchCryptoProNativeStatus();
			assert.strictEqual(status.success, true);
			assert.strictEqual(status.installed, true);
			assert.strictEqual(status.signingAvailable, true);
			assert.strictEqual(status.paperFallbackAvailable, true);

			// 2. Бэкенд сообщает об отсутствии CSP (fallback на бумагу по Мандату 8e)
			globalThis.fetch = async () => {
				return {
					ok: false,
					status: 503,
					json: async () => ({
						success: false,
						code: "CSP_NOT_INSTALLED",
						paperFallbackAvailable: true,
						message: "КриптоПро CSP не обнаружен в операционной системе",
					}),
				} as Response;
			};

			const offlineStatus = await fetchCryptoProNativeStatus();
			assert.strictEqual(offlineStatus.success, false);
			assert.strictEqual(offlineStatus.paperFallbackAvailable, true);
			assert.strictEqual(offlineStatus.code, "CSP_NOT_INSTALLED");

			// 3. Сетевой сбой
			globalThis.fetch = async () => {
				throw new Error("Connection refused");
			};

			const networkErrorStatus = await fetchCryptoProNativeStatus();
			assert.strictEqual(networkErrorStatus.success, false);
			assert.strictEqual(networkErrorStatus.code, "NETWORK_ERROR");
			assert.strictEqual(networkErrorStatus.paperFallbackAvailable, true);
		} finally {
			globalThis.fetch = prevFetch;
		}
	});

	it("fetchCryptoProNativeCertificates returns typed digital certificates from native bridge", async () => {
		const prevFetch = globalThis.fetch;
		try {
			globalThis.fetch = async (input: RequestInfo | URL) => {
				const url = String(input);
				if (url.includes("/api/cryptopro/native/certificates")) {
					return {
						ok: true,
						json: async () => ({
							success: true,
							certificates: [
								{
									thumbprint: "38F8B1029384756A1029384756A1029384756A10",
									serialNumber: "4B28DF892019A87C0001",
									subjectName: "CN=Смирнова Анна Викторовна, OGRN=1027700132195",
									doctorFullName: "Смирнова Анна Викторовна",
									issuerName: "АО ПФ СКБ Контур",
									validFrom: "2025-05-12T14:00:00.000Z",
									validTo: "2026-08-12T14:00:00.000Z",
									hasPrivateKey: true,
									isValid: true,
									algorithmOid: "1.2.643.7.1.1.1.1",
								},
							],
							total: 1,
						}),
					} as Response;
				}
				throw new Error("Unexpected url: " + url);
			};

			const certs = await fetchCryptoProNativeCertificates();
			assert.strictEqual(certs.length, 1);
			assert.strictEqual(certs[0]?.doctorFullName, "Смирнова Анна Викторовна");
			assert.strictEqual(certs[0]?.thumbprint, "38F8B1029384756A1029384756A1029384756A10");
			assert.strictEqual(certs[0]?.hasPrivateKey, true);
		} finally {
			globalThis.fetch = prevFetch;
		}
	});

	it("signWithCryptoProNative transmits hash and PIN code, receiving valid CAdES-BES signature", async () => {
		const prevFetch = globalThis.fetch;
		try {
			const docHashHex = "a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0";
			const demoSig = createDemonstrationGostCmsSignature({
				documentId: "doc-test-101",
				documentKind: "form043u",
				documentHashHex: docHashHex,
				doctorFullName: "Смирнова Анна Викторовна",
			});

			let sentBody: string | null = null;

			globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
				const url = String(input);
				if (url.includes("/api/cryptopro/native/sign")) {
					sentBody = String(init?.body);
					return {
						ok: true,
						json: async () => ({
							success: true,
							signatureBase64: demoSig.signatureBase64,
							thumbprint: "38F8B1029384756A1029384756A1029384756A10",
							documentId: "doc-test-101",
							documentKind: "form043u",
							algorithm: "GOST R 34.10-2012",
							containerFormat: "CMS_PKCS7_DETACHED_CADES_BES",
							signedAt: new Date().toISOString(),
						}),
					} as Response;
				}
				throw new Error("Unexpected url: " + url);
			};

			const signRes = await signWithCryptoProNative({
				data: docHashHex,
				dataEncoding: "hex",
				thumbprint: "38F8B1029384756A1029384756A1029384756A10",
				pin: "1234",
				documentId: "doc-test-101",
				documentKind: "form043u",
			});

			assert.strictEqual(signRes.success, true);
			assert.ok(signRes.signatureBase64);
			assert.strictEqual(signRes.containerFormat, "CMS_PKCS7_DETACHED_CADES_BES");

			// Проверяем тело отправленного запроса: хэш и PIN переданы
			assert.ok(sentBody);
			const parsedSent = JSON.parse(sentBody);
			assert.strictEqual(parsedSent.data, docHashHex);
			assert.strictEqual(parsedSent.pin, "1234");
			assert.strictEqual(parsedSent.thumbprint, "38F8B1029384756A1029384756A1029384756A10");

			// Проверяем инвариант [CRY-01]/[CRY-02]: валидация полученной от нативного моста подписи
			const validation = validateGostCmsPkcs7Signature(signRes.signatureBase64!, docHashHex);
			assert.strictEqual(validation.valid, true);

			// Подмена хэша строго отвергается с TamperDetected
			const tamperedCheck = validateGostCmsPkcs7Signature(
				signRes.signatureBase64!,
				"ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
			);
			assert.strictEqual(tamperedCheck.valid, false);
			assert.strictEqual(tamperedCheck.errorCode, "TamperDetected");
			assert.strictEqual(tamperedCheck.tamperDetected, true);
		} finally {
			globalThis.fetch = prevFetch;
		}
	});
});
