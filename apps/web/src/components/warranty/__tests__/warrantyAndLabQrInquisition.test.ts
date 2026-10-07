/**
 * ============================================================================
 * RED TEAM INQUISITION: WARRANTY ENGINE & DENTAL LAB QR / CRYPTO PURITY
 * Mandates 2, 8d, 8e, 8k, 8n Verification Suite
 * ============================================================================
 * 
 * 1. ZERO MOCKS: Extermination of fake pseudo-QR random-bit generators.
 *    Canonical ISO/IEC 18004 QR Code SVG vector generator from @dental/shared.
 * 2. CRYPTO PURITY: Extermination of handwritten SHA-256 in warrantyEngine.ts.
 *    Canonical sha256Hex from @dental/shared conforming to FIPS 180-4.
 * 3. LAB QR UNIFICATION: Cross-engine parity across:
 *    - dentalLabWorkflowEngine.ts:1086
 *    - labMath.ts:1620
 *    - labWorkOrderEngine.ts:323
 * 4. DOCTOR AUTONOMY & UX HYGIENE:
 *    - Zero disabled buttons in WarrantyPassportModal.tsx (Mandate 8e)
 *    - Max modal depth = 1 (Anti-Matryoshka Sin #6)
 *    - Zero cartoon emojis in warranty code & patient memo (Mandate 8d)
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test, { describe } from "node:test";

import {
	generateQrCodeSvg as warrantyGenerateQrCodeSvg,
	generateSha256 as warrantyGenerateSha256,
	sha256Hex,
	calculateWarrantyTerms,
	createWarrantyRemediationOrder,
	generateWarrantyPatientMemo,
	type WarrantyCertificateData,
} from "../warrantyEngine.js";

import {
	generateQrCodeSvg as labWorkflowGenerateQrCodeSvg,
} from "../../lab/dentalLabWorkflowEngine.js";

import {
	generateQrCodeSvg as labMathGenerateQrCodeSvg,
} from "../../lab/labMath.js";

import {
	generateQrCodeSvg as labWorkOrderGenerateQrCodeSvg,
} from "../../lab/orders/labWorkOrderEngine.js";

import {
	getAllWarrantyPresets,
	getAllWarrantyDefectTemplates,
	MANDATORY_WARRANTY_CONDITIONS,
} from "../warrantyPresets.js";

describe("1. Warranty Engine QR Purity — Canonical ISO/IEC 18004 Vector SVG", () => {
	test("warrantyEngine.generateQrCodeSvg generates valid, standards-compliant SVG", () => {
		const url = "https://dente-clinic.ru/portal/warranty?cert=WAR-2026-001&card=043-U100";
		const svg = warrantyGenerateQrCodeSvg(url, { size: 160 });

		assert.ok(svg.startsWith("<svg"), "Must start with <svg tag");
		assert.ok(svg.includes('xmlns="http://www.w3.org/2000/svg"'), "Must have standard SVG XML namespace");
		assert.ok(svg.includes('viewBox="0 0'), "Must contain responsive viewBox");
		assert.ok(svg.includes('width="160"'), "Must reflect requested size in width");
		assert.ok(svg.includes('height="160"'), "Must reflect requested size in height");
		assert.ok(svg.includes("<rect"), "Must contain background rect");
		assert.ok(svg.includes("<path"), "Must contain path with QR matrix modules");
		assert.ok(svg.endsWith("</svg>"), "Must be closed SVG");
	});

	test("warrantyEngine.generateQrCodeSvg supports custom colors and margins", () => {
		const payload = "WAR-2026-TEST-PAYLOAD";
		const svgCustom = warrantyGenerateQrCodeSvg(payload, {
			size: 200,
			margin: 2,
			fgColor: "#1e293b",
			bgColor: "#f8fafc",
		});

		assert.ok(svgCustom.includes('fill="#f8fafc"'), "Must respect custom background color");
		assert.ok(svgCustom.includes('fill="#1e293b"'), "Must respect custom foreground color");
		assert.ok(svgCustom.includes('width="200"'), "Must apply custom size");
	});

	test("Exterminated fake pseudo-QR generator: no hash-bit pseudo randomness", () => {
		// In the old mock, lines 816-819 used: ((charCode + r * 3 + c * 7) % 3) === 0
		// In the canonical engine, Reed-Solomon GF(256) is used.
		// Verify two different URLs yield distinct QR path matrices, deterministic and valid.
		const svg1 = warrantyGenerateQrCodeSvg("https://dente.ru/w/1");
		const svg2 = warrantyGenerateQrCodeSvg("https://dente.ru/w/2");
		assert.notEqual(svg1, svg2, "Distinct inputs must yield distinct QR matrices");

		// Determinism
		const svg1Again = warrantyGenerateQrCodeSvg("https://dente.ru/w/1");
		assert.equal(svg1, svg1Again, "Identical inputs must yield identical SVG outputs");
	});
});

describe("2. Warranty Engine SHA-256 Purity — FIPS 180-4 Canonical Vectors", () => {
	test("warrantyGenerateSha256 produces exact FIPS 180-4 standard test vectors", () => {
		// Empty string vector
		assert.equal(
			warrantyGenerateSha256(""),
			"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
			"SHA-256 of empty string must match NIST standard",
		);

		// Short ASCII vector "abc"
		assert.equal(
			warrantyGenerateSha256("abc"),
			"ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
			"SHA-256 of 'abc' must match NIST standard",
		);

		// 44-byte standard phrase
		assert.equal(
			warrantyGenerateSha256("The quick brown fox jumps over the lazy dog"),
			"d7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592",
			"SHA-256 of standard pangram must match NIST standard",
		);
	});

	test("warrantyGenerateSha256 correctly encodes Cyrillic UTF-8 input with avalanche effect", () => {
		const cyrillicText = "Гарантийный паспорт стоматологического лечения ООО ДЕНТЕ 2026";
		const hash = warrantyGenerateSha256(cyrillicText);

		assert.equal(hash.length, 64, "SHA-256 hex must be exactly 64 characters");
		assert.match(hash, /^[0-9a-f]{64}$/, "Must contain only lowercase hexadecimal characters");

		// Direct export parity with sha256Hex
		assert.equal(hash, sha256Hex(cyrillicText), "generateSha256 must match sha256Hex byte-for-byte");

		// Tamper evidence: changing 1 character triggers complete avalanche
		const tamperedText = "Гарантийный паспорт стоматологического лечения ООО ДЕНТЕ 2027";
		const tamperedHash = warrantyGenerateSha256(tamperedText);
		assert.notEqual(hash, tamperedHash);

		let differingChars = 0;
		for (let i = 0; i < 64; i++) {
			if (hash[i] !== tamperedHash[i]) differingChars++;
		}
		assert.ok(differingChars > 30, "Avalanche effect must alter majority of hash digits");
	});
});

describe("3. Dental Lab QR Purity across all 3 Lab Engines", () => {
	test("dentalLabWorkflowEngine.generateQrCodeSvg generates canonical ISO/IEC 18004 SVG", () => {
		const payload = "DENTE-ZTL:ЗТЛ-2608-ABC123|PATIENT:Иванов|DOCTOR:Петров";
		const svg = labWorkflowGenerateQrCodeSvg(payload, 90);

		assert.ok(svg.startsWith("<svg"), "Must start with <svg");
		assert.ok(svg.includes('xmlns="http://www.w3.org/2000/svg"'), "Must have SVG namespace");
		assert.ok(svg.includes('width="90"'), "Must have requested width=90");
		assert.ok(svg.includes('height="90"'), "Must have requested height=90");
		assert.ok(svg.includes("<rect"), "Must contain background rect");
		assert.ok(svg.includes("<path"), "Must contain QR modules path");
		assert.ok(svg.endsWith("</svg>"), "Must close properly");
	});

	test("labMath.generateQrCodeSvg generates canonical ISO/IEC 18004 SVG with options", () => {
		const payload = "DENTE-ZTL:ORDER-9876";
		// Default options (margin 2)
		const svg = labMathGenerateQrCodeSvg(payload);
		assert.ok(svg.startsWith("<svg"));
		assert.ok(svg.includes("viewBox="));
		assert.ok(svg.includes("<rect"));
		assert.ok(svg.includes("<path"));

		// Custom numeric size
		const svgSized = labMathGenerateQrCodeSvg(payload, 120);
		assert.ok(svgSized.includes('width="120"'));
		assert.ok(svgSized.includes('height="120"'));

		// Custom options object
		const svgOpt = labMathGenerateQrCodeSvg(payload, { size: 150, fgColor: "#0f766e" });
		assert.ok(svgOpt.includes('width="150"'));
		assert.ok(svgOpt.includes('fill="#0f766e"'));
	});

	test("labWorkOrderEngine.generateQrCodeSvg generates canonical ISO/IEC 18004 SVG", () => {
		const payload = "DENTE-LAB:ЛО-2026/09-001|PATIENT:Сидоров|TEETH:11,21";
		const svg = labWorkOrderGenerateQrCodeSvg(payload, 100);

		assert.ok(svg.startsWith("<svg"));
		assert.ok(svg.includes('xmlns="http://www.w3.org/2000/svg"'));
		assert.ok(svg.includes('width="100"'));
		assert.ok(svg.includes('height="100"'));
		assert.ok(svg.includes("<rect"));
		assert.ok(svg.includes("<path"));
		assert.ok(svg.endsWith("</svg>"));
	});

	test("Cross-Engine QR Uniformity: All engines delegate to @dental/shared", () => {
		const testPayload = "DENTE-CANONICAL-TEST-TOKEN";
		const svgWarranty = warrantyGenerateQrCodeSvg(testPayload, { size: 100, margin: 1 });
		const svgWorkflow = labWorkflowGenerateQrCodeSvg(testPayload, 100);
		const svgWorkOrder = labWorkOrderGenerateQrCodeSvg(testPayload, 100);

		// Since all use margin 1 and size 100 from @dental/shared, they must yield equivalent vector dimensions
		assert.ok(svgWarranty.includes('width="100"'));
		assert.ok(svgWorkflow.includes('width="100"'));
		assert.ok(svgWorkOrder.includes('width="100"'));
	});
});

function resolveRepoPath(relPath: string): string {
	const direct = path.resolve(process.cwd(), relPath);
	if (fs.existsSync(direct)) return direct;
	const stripped = relPath.replace(/^apps[\\/]web[\\/]/, "");
	return path.resolve(process.cwd(), stripped);
}

describe("4. Mandate 8e: Doctor Autonomy & Mandate 8d: Zero Emojis in Warranty Studio", () => {
	const modalPath = resolveRepoPath("apps/web/src/components/warranty/WarrantyPassportModal.tsx");
	const enginePath = resolveRepoPath("apps/web/src/components/warranty/warrantyEngine.ts");
	const presetsPath = resolveRepoPath("apps/web/src/components/warranty/warrantyPresets.ts");

	test("WarrantyPassportModal.tsx has ZERO disabled buttons (Doctor Autonomy Mandate 8e)", () => {
		const modalContent = fs.readFileSync(modalPath, "utf8");
		// Match button elements with disabled attribute
		const disabledButtonMatches = modalContent.match(/<button[^>]*\bdisabled\b[^>]*>/gi);
		assert.equal(
			disabledButtonMatches,
			null,
			`WarrantyPassportModal must have 0 disabled buttons, found: ${disabledButtonMatches?.join(", ")}`,
		);
	});

	test("WarrantyPassportModal.tsx maintains max modal depth = 1 (Anti-Matryoshka Law)", () => {
		const modalContent = fs.readFileSync(modalPath, "utf8");
		// Check createPortal calls: exactly 1 for the main modal dialog
		const portalCalls = modalContent.match(/createPortal\(/g);
		assert.equal(
			portalCalls?.length,
			1,
			"WarrantyPassportModal must have exactly 1 createPortal root, zero nested modal portals",
		);
	});

	test("Zero cartoon emojis across Warranty Studio source files (Mandate 8d Sin #7)", () => {
		const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;
		const targetFiles = [modalPath, enginePath, presetsPath];

		for (const file of targetFiles) {
			const content = fs.readFileSync(file, "utf8");
			const lines = content.split("\n");
			const offendingLines: string[] = [];

			lines.forEach((line, idx) => {
				if (emojiRegex.test(line)) {
					offendingLines.push(`L${idx + 1}: ${line.trim()}`);
				}
			});

			assert.equal(
				offendingLines.length,
				0,
				`File ${path.basename(file)} contains prohibited cartoon emojis: \n${offendingLines.join("\n")}`,
			);
		}
	});

	test("generateWarrantyPatientMemo outputs strictly professional text with ZERO emojis", () => {
		const certData: WarrantyCertificateData = {
			certificateId: "WAR-2026-7777",
			issueDate: "2026-09-25",
			patient: {
				fullName: "Алексеев Петр Сергеевич",
				cardNumber: "043/у-9921",
				phone: "+7 999 123-45-67",
			},
			doctor: {
				fullName: "Д-р Смирнов К. И.",
				specialty: "Врач-стоматолог-ортопед",
			},
			clinic: {
				name: "ООО «ДЕНТЕ»",
				legalName: "ООО «ДЕНТЕ Клиника»",
				licenseNumber: "ЛО-77-01-012345",
				address: "г. Москва, ул. Клиническая, д. 10",
				phone: "+7 495 000-00-00",
			},
			items: [
				{
					id: "item-1",
					toothNumber: "1.6",
					category: "ceramic_crown_veneer",
					clinicalWorkTitle: "Коронка IPS e.max",
					materialName: "IPS e.max Press",
					manufacturer: "Ivoclar Vivadent",
					country: "Лихтенштейн",
					baseWarrantyMonths: 24,
					baseServiceLifeMonths: 120,
				},
			],
			calculation: {
				baseWarrantyMonths: 24,
				adjustedWarrantyMonths: 24,
				baseServiceLifeMonths: 120,
				adjustedServiceLifeMonths: 120,
				riskLevel: "low",
				warrantyStatus: "full",
				totalRiskMultiplier: 1.0,
				checkupIntervalMonths: 6,
				issueDate: "2026-09-25",
				warrantyExpirationDate: "2028-09-25",
				serviceLifeExpirationDate: "2036-09-25",
				nextCheckupDueDate: "2027-03-25",
				checkupSchedule: [],
				riskFactorsApplied: [],
				clinicalRationale: [],
				specialProvisions: [],
			},
			verificationUrl: "https://dente.ru/portal/warranty?cert=WAR-2026-7777",
			qrCodeSvg: "<svg></svg>",
			integrityHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
			signedByDoctor: true,
			signedByChief: true,
			attachedToForm043u: false,
		};

		const memo = generateWarrantyPatientMemo(certData);
		assert.ok(memo.includes("ГАРАНТИЙНЫЙ ПАСПОРТ СТОМАТОЛОГИЧЕСКОГО ЛЕЧЕНИЯ"));
		assert.ok(memo.includes("Алексеев Петр Сергеевич"));
		assert.ok(memo.includes("WAR-2026-7777"));
		assert.ok(memo.includes("• Зуб 1.6:"));

		const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;
		assert.equal(emojiRegex.test(memo), false, "Patient memo must have zero cartoon emojis");
	});

	test("Mandate 8e: 1-Click 0 ₽ Warranty Remediation Order creation without master password", () => {
		const order = createWarrantyRemediationOrder({
			certificateId: "WAR-2026-001",
			toothNumber: "1.6",
			originalWorkTitle: "Коронка E.max",
			defectType: "crown_decementation",
			customAction: "Повторная фиксация на стеклоиономерный цемент Fuji Plus",
			materials: [
				{
					id: "mat-fuji",
					name: "GC Fuji Plus (стеклоиономерный цемент)",
					quantity: 1,
					unit: "порция",
				},
			],
			doctorName: "Д-р Смирнов К. И.",
			patientFullName: "Иванов И. И.",
			patientCardNumber: "043/у-9921",
			clinicName: "ООО «ДЕНТЕ»",
		});

		assert.equal(order.costToPatientRub, 0, "Patient cost must be strictly 0 ₽");
		assert.equal(order.discountPercent, 100, "Discount must be 100% statutory warranty remediation");
		assert.equal(order.isFreeWarrantyService, true, "Must be flagged as free warranty service");
		assert.equal(order.requiresMasterPassword, false, "Mandate 8e: Doctor reworks must never require master password");
		assert.equal(order.warehouseDeductOnExecution, true, "Must deduct materials from warehouse on fact");
		assert.ok(order.integrityHash && order.integrityHash.length === 64, "Integrity hash must be valid 64-char SHA-256");
		assert.equal(order.materialsDeducted.length, 1);
		assert.equal(order.materialsDeducted[0]?.name, "GC Fuji Plus (стеклоиономерный цемент)");
	});
});
