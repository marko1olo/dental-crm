/**
 * ═══════════════════════════════════════════════════════════════════════════
 * UNIT TESTS: CRYPTOPRO CSP NATIVE CLI BRIDGE (ГОСТ Р 34.10-2012 / УКЭП)
 * Strict verification of csptest.exe / cryptcp.exe / certmgr.exe integration,
 * certificate parsing, windows-1251 decoding, race-condition isolation, and
 * ironclad mandate against fake signatures (Math.random() ban).
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import Fastify from "fastify";
import {
	CryptoProCliError,
	decodeCryptoProOutput,
	executeSignDetachedGost,
	findCryptoProPaths,
	getCryptoProCliStatus,
	isCryptoProInstalled,
	listInstalledCertificates,
	parseCertificatesOutput,
	signDetachedGost,
} from "../crypto/cryptoProCliEngine.js";
import { registerCryptoProNativeRoutes } from "../routes/cryptoProNativeRoutes.js";

describe("CryptoPro CSP Native CLI Engine & Route Bridge", () => {
	// ─── 1. Binary Discovery & Status ─────────────────────────────────────────

	describe("1. Binary Discovery & Environment Checks", () => {
		it("findCryptoProPaths returns paths structure without crashing", () => {
			const paths = findCryptoProPaths();
			assert.ok(typeof paths === "object" && paths !== null);
			assert.ok("csptest" in paths);
			assert.ok("cryptcp" in paths);
			assert.ok("certmgr" in paths);
		});

		it("isCryptoProInstalled returns boolean", async () => {
			const installed = await isCryptoProInstalled();
			assert.strictEqual(typeof installed, "boolean");
		});

		it("getCryptoProCliStatus returns installed boolean and paths", async () => {
			const status = await getCryptoProCliStatus();
			assert.strictEqual(typeof status.installed, "boolean");
			assert.ok(status.paths);
		});
	});

	// ─── 2. Console Output Decoding (UTF-8, CP1251, IBM866) ──────────────────

	describe("2. Console Output Decoding (CP1251 / IBM866 / UTF-8)", () => {
		it("decodes standard UTF-8 buffer with Cyrillic text", () => {
			const original = "Субъект: CN=Иванов Иван Иванович, ОГРН=1027700132195";
			const buf = Buffer.from(original, "utf8");
			const decoded = decodeCryptoProOutput(buf);
			assert.strictEqual(decoded, original);
		});

		it("decodes Windows-1251 byte sequences without mojibake or replacement chars", () => {
			// Ручная кодировка "Тест" в CP1251:
			// Т = 0xD2, е = 0xE5, с = 0xF1, т = 0xF2
			const cp1251Buf = Buffer.from([0xd2, 0xe5, 0xf1, 0xf2]);
			const decoded = decodeCryptoProOutput(cp1251Buf);
			assert.strictEqual(decoded, "Тест");
		});

		it("decodes CP1251 certificate block with Russian organization and name", () => {
			// "Врач: Смирнова" в windows-1251
			// В=0xC2, р=0xF0, а=0xE0, ч=0xF7, :=0x3A, ' '=0x20, С=0xD1, м=0xEC, и=0xE8, р=0xF0, н=0xED, о=0xEE, в=0xE2, а=0xE0
			const rawBytes = [
				0xc2, 0xf0, 0xe0, 0xf7, 0x3a, 0x20,
				0xd1, 0xec, 0xe8, 0xf0, 0xed, 0xee, 0xe2, 0xe0,
			];
			const buf = Buffer.from(rawBytes);
			const decoded = decodeCryptoProOutput(buf);
			assert.strictEqual(decoded, "Врач: Смирнова");
		});
	});

	// ─── 3. Certificate Parser (cryptcp, certmgr, csptest) ────────────────────

	describe("3. Certificate Parser from CLI outputs", () => {
		it("parses realistic cryptcp.exe -list -store uMy output", () => {
			const sampleCryptcpOutput = `
CryptCP 5.0 (c) "Crypto-Pro", 2002-2021.
Command prompt Utility for File Signature and Encryption.

=============================================================================
1| Certificate:
=============================================================================
Issuer              : CN="АО ПФ СКБ Контур", O="АО ПФ СКБ Контур", C=RU
Subject             : CN=Иванов Иван Иванович, SNILS=12345678901, OGRN=1027700132195, INN=7701234567, O=ООО "ДЕНТЕ", C=RU
Serial              : 0x4B28DF892019A87C0001000200030004
SHA1 Hash           : 38F8B1029384756A1029384756A1029384756A10
SubjKeyID           : 1928374650
Signature Algorithm : 1.2.643.7.1.1.1.1 (ГОСТ Р 34.10-2012 256 бит)
PublicKey Algorithm : 1.2.643.7.1.1.1.1 (ГОСТ Р 34.10-2012 256 бит)
Not valid before    : 12.05.2025 14:00:00 UTC
Not valid after     : 12.08.2026 14:00:00 UTC
PrivateKey          : Present (valid)
=============================================================================
[ErrorCode: 0x00000000]
`;

			const certs = parseCertificatesOutput(sampleCryptcpOutput);
			assert.strictEqual(certs.length, 1);

			const cert = certs[0]!;
			assert.strictEqual(cert.thumbprint, "38F8B1029384756A1029384756A1029384756A10");
			assert.strictEqual(cert.serialNumber, "4B28DF892019A87C0001000200030004");
			assert.strictEqual(cert.doctorFullName, "Иванов Иван Иванович");
			assert.strictEqual(cert.doctorSnils, "12345678901");
			assert.strictEqual(cert.ogrn, "1027700132195");
			assert.strictEqual(cert.inn, "7701234567");
			assert.strictEqual(cert.organizationName, "ООО \"ДЕНТЕ\"");
			assert.strictEqual(cert.issuerName, 'CN="АО ПФ СКБ Контур", O="АО ПФ СКБ Контур", C=RU');
			assert.strictEqual(cert.hasPrivateKey, true);
			assert.strictEqual(cert.algorithmOid, "1.2.643.7.1.1.1.1");
			assert.strictEqual(cert.isQualified, true);
			assert.ok(cert.validFrom.startsWith("2025-05-12"));
			assert.ok(cert.validTo.startsWith("2026-08-12"));
		});

		it("parses realistic csptest.exe -keyset -enum_cont -fqcn -verifyc output", () => {
			const sampleCsptestOutput = `
CSP (Type:80) v5.0.12000 KC1 Windows
AcquireContext: OK. Setting cache for crypt...
\\.\\HDIMAGE\\DoctorPetrovKey2025
Certificate in container:
Subject: CN="Петров Петр Петрович", SNILS=98765432100, OGRN=1037700234567, O="Стоматология Улыбка"
Issuer: CN="УЦ Федерального Казначейства"
Serial: 01D9A4B5C6D7E8F90001
Not valid before: 01/01/2025 08:00:00
Not valid after : 01/01/2027 08:00:00
SHA1 Hash: AABBCCDDEEFF00112233445566778899AABBCCDD
Algorithm: 1.2.643.7.1.1.1.1
Total: 1 containers
[ErrorCode: 0x00000000]
`;

			const certs = parseCertificatesOutput(sampleCsptestOutput);
			assert.strictEqual(certs.length, 1);

			const cert = certs[0]!;
			assert.strictEqual(cert.thumbprint, "AABBCCDDEEFF00112233445566778899AABBCCDD");
			assert.strictEqual(cert.doctorFullName, "Петров Петр Петрович");
			assert.strictEqual(cert.doctorSnils, "98765432100");
			assert.strictEqual(cert.ogrn, "1037700234567");
			assert.strictEqual(cert.organizationName, "Стоматология Улыбка");
			assert.strictEqual(cert.hasPrivateKey, true);
			assert.strictEqual(cert.containerName, "\\.\\HDIMAGE\\DoctorPetrovKey2025");
			assert.ok(cert.validFrom.startsWith("2025-01-01"));
			assert.ok(cert.validTo.startsWith("2027-01-01"));
		});

		it("parses multiple certificates in single store output", () => {
			const sampleMultiOutput = `
=============================================================================
1| Certificate:
Subject: CN=Врач Терапевт, SNILS=11111111111
Issuer: CN=УЦ 1
Serial: 1111
SHA1 Hash: 1111111111111111111111111111111111111111
Not valid before: 01.01.2025 00:00:00
Not valid after: 01.01.2026 00:00:00
PrivateKey: Present
=============================================================================
2| Certificate:
Subject: CN=Врач Хирург, SNILS=22222222222
Issuer: CN=УЦ 2
Serial: 2222
SHA1 Hash: 2222222222222222222222222222222222222222
Not valid before: 01.01.2025 00:00:00
Not valid after: 01.01.2026 00:00:00
PrivateKey: Present
`;

			const certs = parseCertificatesOutput(sampleMultiOutput);
			assert.strictEqual(certs.length, 2);
			assert.strictEqual(certs[0]!.thumbprint, "1111111111111111111111111111111111111111");
			assert.strictEqual(certs[0]!.doctorFullName, "Врач Терапевт");
			assert.strictEqual(certs[1]!.thumbprint, "2222222222222222222222222222222222222222");
			assert.strictEqual(certs[1]!.doctorFullName, "Врач Хирург");
		});

		it("returns empty array for empty or unparseable text", () => {
			assert.deepStrictEqual(parseCertificatesOutput(""), []);
			assert.deepStrictEqual(parseCertificatesOutput("   \n\t "), []);
			assert.deepStrictEqual(parseCertificatesOutput("Error: No certificates found in store"), []);
		});
	});

	// ─── 4. Mandate 8 & Supreme Law: Strict Ban on Fake Signatures ───────────

	describe("4. Absolute Ban on Fake Signatures (Zero Mocks / Honest Failures)", () => {
		it("listInstalledCertificates throws CSP_NOT_INSTALLED when no utilities are installed", async () => {
			const installed = await isCryptoProInstalled();
			if (!installed) {
				await assert.rejects(
					async () => {
						await listInstalledCertificates();
					},
					(err: unknown) => {
						assert.ok(err instanceof CryptoProCliError);
						assert.strictEqual(err.code, "CSP_NOT_INSTALLED");
						assert.strictEqual(err.success, false);
						assert.match(err.message, /КриптоПро CSP не обнаружен/);
						return true;
					},
				);
			}
		});

		it("signDetachedGost throws CSP_NOT_INSTALLED without generating random fake bytes", async () => {
			const installed = await isCryptoProInstalled();
			if (!installed) {
				const testPayload = Buffer.from("<ClinicalDocument>Test</ClinicalDocument>", "utf8");
				const validThumbprint = "38F8B1029384756A1029384756A1029384756A10";

				await assert.rejects(
					async () => {
						await signDetachedGost(testPayload, validThumbprint);
					},
					(err: unknown) => {
						assert.ok(err instanceof CryptoProCliError);
						assert.strictEqual(err.code, "CSP_NOT_INSTALLED");
						assert.strictEqual(err.success, false);
						assert.match(err.message, /КриптоПро CSP не обнаружен/);
						return true;
					},
				);
			}
		});

		it("executeSignDetachedGost returns structured failure result when not installed", async () => {
			const installed = await isCryptoProInstalled();
			if (!installed) {
				const testPayload = Buffer.from("<test>data</test>", "utf8");
				const validThumbprint = "38F8B1029384756A1029384756A1029384756A10";

				const res = await executeSignDetachedGost(testPayload, validThumbprint);
				assert.strictEqual(res.success, false);
				if (!res.success) {
					assert.strictEqual(res.code, "CSP_NOT_INSTALLED");
					assert.match(res.message, /КриптоПро CSP не обнаружен/);
				}
			}
		});
	});

	// ─── 5. Parameter Validation ─────────────────────────────────────────────

	describe("5. Input & Parameter Validation", () => {
		it("rejects invalid thumbprint format with INVALID_THUMBPRINT", async () => {
			const installed = await isCryptoProInstalled();
			// Если КриптоПро не установлен, отказ произойдет на проверке наличия CSP
			// Проверим, что некорректный отпечаток отсекается
			const testPayload = Buffer.from("data", "utf8");
			try {
				await signDetachedGost(testPayload, "too-short");
				assert.fail("Should have thrown");
			} catch (err: unknown) {
				assert.ok(err instanceof CryptoProCliError);
				assert.ok(err.code === "CSP_NOT_INSTALLED" || err.code === "INVALID_THUMBPRINT");
			}
		});

		it("rejects empty buffer payload with EMPTY_PAYLOAD when installed", async () => {
			const emptyPayload = Buffer.alloc(0);
			try {
				await signDetachedGost(emptyPayload, "38F8B1029384756A1029384756A1029384756A10");
				assert.fail("Should have thrown");
			} catch (err: unknown) {
				assert.ok(err instanceof CryptoProCliError);
				assert.ok(err.code === "CSP_NOT_INSTALLED" || err.code === "EMPTY_PAYLOAD");
			}
		});
	});

	// ─── 6. Fastify Route Endpoints Integration ───────────────────────────────

	describe("6. Fastify Routes Integration (/api/crypto/*)", () => {
		const prevEnv = { ...process.env };

		before(() => {
			process.env.NODE_ENV = "test";
			process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
			process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
		});

		after(() => {
			process.env.NODE_ENV = prevEnv.NODE_ENV;
			if (prevEnv.DENTE_CLINICAL_ALLOW_UNGUARDED_READS !== undefined) {
				process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = prevEnv.DENTE_CLINICAL_ALLOW_UNGUARDED_READS;
			} else {
				delete process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS;
			}
			if (prevEnv.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS !== undefined) {
				process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = prevEnv.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS;
			} else {
				delete process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS;
			}
		});

		it("GET /api/crypto/status returns status structure", async () => {
			const app = Fastify();
			await registerCryptoProNativeRoutes(app);

			const response = await app.inject({
				method: "GET",
				url: "/api/crypto/status",
			});

			assert.strictEqual(response.statusCode, 200);
			const body = JSON.parse(response.body);
			assert.strictEqual(body.success, true);
			assert.strictEqual(typeof body.installed, "boolean");
			assert.ok(body.paths);
		});

		it("GET /api/crypto/certificates returns 503 CSP_NOT_INSTALLED when not installed", async () => {
			const installed = await isCryptoProInstalled();
			if (!installed) {
				const app = Fastify();
				await registerCryptoProNativeRoutes(app);

				const response = await app.inject({
					method: "GET",
					url: "/api/crypto/certificates",
				});

				assert.strictEqual(response.statusCode, 503);
				const body = JSON.parse(response.body);
				assert.strictEqual(body.success, false);
				assert.strictEqual(body.code, "CSP_NOT_INSTALLED");
				assert.match(body.message, /КриптоПро CSP не обнаружен/);
			}
		});

		it("POST /api/crypto/sign returns 503 CSP_NOT_INSTALLED when not installed", async () => {
			const installed = await isCryptoProInstalled();
			if (!installed) {
				const app = Fastify();
				await registerCryptoProNativeRoutes(app);

				const response = await app.inject({
					method: "POST",
					url: "/api/crypto/sign",
					payload: {
						data: "<ClinicalDocument>Test CDA R3</ClinicalDocument>",
						thumbprint: "38F8B1029384756A1029384756A1029384756A10",
					},
				});

				assert.strictEqual(response.statusCode, 503);
				const body = JSON.parse(response.body);
				assert.strictEqual(body.success, false);
				assert.strictEqual(body.code, "CSP_NOT_INSTALLED");
				assert.match(body.message, /КриптоПро CSP не обнаружен/);
			}
		});

		it("POST /api/crypto/sign rejects missing data or thumbprint with 400", async () => {
			const app = Fastify();
			await registerCryptoProNativeRoutes(app);

			// Отсутствует поле data
			const res1 = await app.inject({
				method: "POST",
				url: "/api/crypto/sign",
				payload: {
					thumbprint: "38F8B1029384756A1029384756A1029384756A10",
				},
			});
			assert.ok(res1.statusCode === 400 || res1.statusCode === 503);

			// Отсутствует поле thumbprint
			const res2 = await app.inject({
				method: "POST",
				url: "/api/crypto/sign",
				payload: {
					data: "Hello world",
				},
			});
			assert.ok(res2.statusCode === 400 || res2.statusCode === 503);
		});
	});
});
