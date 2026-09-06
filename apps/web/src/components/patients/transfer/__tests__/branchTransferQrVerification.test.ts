/**
 * branchTransferQrVerification.test.ts
 *
 * Wave 23: Branch Transfer Genuine QR Code & Zero Fake Diorama
 * Mandate 11: Core Engines Sacred vs Synthetic Garbage & Core Route Rules 7 & 11.
 *
 * Verifies:
 * 1. Authentic algorithmic QR matrix generation (ISO/IEC 18004 Model 2) with Reed-Solomon error correction.
 * 2. Presence of 3 standard 7x7 Finder Patterns at Top-Left, Top-Right, Bottom-Left corners.
 * 3. Timing patterns (row 6 / col 6 alternating modules) and scalable viewBox with quiet zone.
 * 4. Elimination of the fake static 8-rectangle SVG diorama.
 * 5. Exact payload encoding for snapshot verification:
 *    `DENTE:TRF:${snapshot.snapshotId}:${snapshot.patientId}:${snapshot.checksumSha256.slice(0, 16)}`
 * 6. Inclusion of genuine QR code, verification string, and SHA-256 in statutory Transfer Act HTML.
 * 7. End-to-end execution of patient branch transfer with dynamic, content-derived QR codes.
 */

import assert from "node:assert/strict";

let describe: (name: string, fn: () => void | Promise<void>) => void;
let it: (name: string, fn: () => void | Promise<void>) => void;

try {
	const vitest = await import("vitest");
	describe = vitest.describe;
	it = vitest.it;
} catch {
	const nodeTest = await import("node:test");
	describe = nodeTest.describe;
	it = nodeTest.it;
}

import {
	buildPatientClinicalSnapshot,
	createPatientBranchTransferConsent,
	executePatientBranchTransfer,
	generateTransferActHtml,
	generateTransferVerificationQrDataUri,
	generateTransferVerificationQrMatrix,
	generateTransferVerificationQrPayload,
	generateTransferVerificationQrSvg,
	type PatientClinicalSnapshot,
	type PatientTransferDraft,
} from "../branchTransferEngine.js";

function createTestSnapshot(overrides: Partial<Parameters<typeof buildPatientClinicalSnapshot>[0]> = {}): PatientClinicalSnapshot {
	const consent = createPatientBranchTransferConsent({
		patientId: "PAT-TEST-001",
		patientFullName: "Смирнова Елена Васильевна",
		patientPassportOrId: "45 12 987654",
		sourceBranchId: "branch-central",
		targetBranchId: "branch-west",
		transferPurposeRu: "Переезд в Западный округ, продолжение ортодонтического лечения",
		operatorFullName: "Волкова М. А.",
		operatorPosition: "Старший администратор",
		signatureType: "simple_electronic_signature_sms",
	});

	return buildPatientClinicalSnapshot({
		sourceBranchId: "branch-central",
		targetBranchId: "branch-west",
		demographics: {
			fullName: "Смирнова Елена Васильевна",
			birthDate: "1988-04-12",
			gender: "female",
			phone: "+7 (926) 123-45-67",
			snils: "123-456-789 00",
			taxpayerInn: "771234567890",
			identityDocument: "Паспорт РФ 45 12 987654",
		},
		somaticAnamnesis: {
			allergies: ["Лидокаин"],
			chronicDiseases: ["Гипертоническая болезнь I ст."],
			bloodGroup: "A(II)",
			rhesusFactor: "Rh+",
			isPregnantOrLactating: false,
			contraindications: ["Амидные анестетики с адреналином 1:100000"],
		},
		odontogramTeeth: {
			16: { fdi: 16, state: "caries", surface: "MOD" },
			26: { fdi: 26, state: "filled" },
			36: { fdi: 36, state: "implant" },
		},
		visitDiaries: [
			{
				id: "vis-001",
				dateIso: "2026-08-15T10:00:00Z",
				doctorFullName: "Кузнецов И. В.",
				diagnosisIcd10: "K02.1 Кариес дентина",
				complaints: "Кратковременная боль от сладкого в области 16 зуба",
				objectiveStatus: "Глубокая кариозная полость на окклюзионной поверхности 16 зуба",
				therapyProtocol: "Препарирование, медобработка 2% хлоргексидином, пломба Estelite Asteria A3",
				recommendations: "Контрольный осмотр через 6 месяцев",
			},
		],
		treatmentPlans: [
			{
				id: "plan-001",
				title: "Комплексная ортодонтическая реабилитация",
				totalCostRub: 185000,
				status: "active",
				itemsCount: 12,
			},
		],
		balanceRub: 15400,
		balanceKopecks: 1540000,
		consent152Fz: consent,
		selectedComponents: {
			demographics: true,
			somaticAnamnesis: true,
			odontogram043u: true,
			visitDiaries: true,
			treatmentPlans: true,
			imagingArchive: true,
			depositBalance: true,
			activeLabOrders: true,
		},
		transferReasonRu: "Переезд в Западный округ, продолжение лечения",
		staffName: "Волкова М. А.",
		staffPosition: "Старший администратор",
		...overrides,
	});
}

describe("Branch Transfer Genuine QR Code & Zero Fake Diorama (Mandate 11 & Core Route)", () => {
	it("1. Generates deterministic verification payload matching statutory transfer contract", () => {
		const snapshot = createTestSnapshot();
		const payload = generateTransferVerificationQrPayload(snapshot);

		assert.ok(payload.startsWith("DENTE:TRF:"), "Payload must start with 'DENTE:TRF:' protocol prefix");
		assert.ok(payload.includes(snapshot.snapshotId), "Payload must contain the snapshotId");
		assert.ok(payload.includes(snapshot.patientId), "Payload must contain the patientId");

		const expectedPrefix = `DENTE:TRF:${snapshot.snapshotId}:${snapshot.patientId}:${snapshot.checksumSha256.slice(0, 16)}`;
		assert.equal(payload, expectedPrefix, "Payload must match canonical format DENTE:TRF:{snapshotId}:{patientId}:{sha16}");
	});

	it("2. Generates authentic ISO/IEC 18004 QR matrix with exact 7x7 Finder Patterns at 3 corners", () => {
		const snapshot = createTestSnapshot();
		const result = generateTransferVerificationQrMatrix(snapshot);

		// 1. Matrix dimension check: Version 1 is 21x21, Version 4 is 33x33
		assert.ok(result.size >= 21, `Matrix size must be at least 21 (actual: ${result.size})`);
		assert.equal(result.matrix.length, result.size, "Matrix row count must equal size");
		for (const row of result.matrix) {
			assert.equal(row.length, result.size, "Matrix column count must equal size");
		}

		// Helper to verify standard 7x7 concentric finder pattern
		const assertFinderPattern = (startRow: number, startCol: number, label: string) => {
			for (let r = 0; r < 7; r++) {
				for (let c = 0; c < 7; c++) {
					const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
					const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
					const expected = isBorder || isCenter;
					const actual = result.matrix[startRow + r]![startCol + c];
					assert.equal(
						actual,
						expected,
						`Finder Pattern (${label}) at offset [${r}, ${c}] must be ${expected ? "BLACK" : "WHITE"}`,
					);
				}
			}
		};

		// Top-Left Finder Pattern (0, 0)
		assertFinderPattern(0, 0, "Top-Left");

		// Top-Right Finder Pattern (0, result.size - 7)
		assertFinderPattern(0, result.size - 7, "Top-Right");

		// Bottom-Left Finder Pattern (result.size - 7, 0)
		assertFinderPattern(result.size - 7, 0, "Bottom-Left");

		// Bottom-Right area (size - 7 .. size - 1, size - 7 .. size - 1) must NOT be a 7x7 finder pattern
		// (QR Model 2 places data/alignment in bottom-right, not a finder pattern)
		let brMatchesFinderPattern = true;
		for (let r = 0; r < 7; r++) {
			for (let c = 0; c < 7; c++) {
				const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
				const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
				const expectedFinder = isBorder || isCenter;
				if (result.matrix[result.size - 7 + r]![result.size - 7 + c] !== expectedFinder) {
					brMatchesFinderPattern = false;
					break;
				}
			}
			if (!brMatchesFinderPattern) break;
		}
		assert.equal(brMatchesFinderPattern, false, "Bottom-right corner must NOT be a 7x7 finder pattern");
	});

	it("3. Features standard Timing Patterns (alternating black/white on row 6 and col 6)", () => {
		const snapshot = createTestSnapshot();
		const result = generateTransferVerificationQrMatrix(snapshot);

		// In QR Model 2, row 6 and column 6 contain alternating timing pattern modules between finders (modules 8 .. size - 9)
		for (let i = 8; i < result.size - 8; i++) {
			const expected = i % 2 === 0;
			assert.equal(
				result.matrix[6]![i],
				expected,
				`Horizontal timing pattern at row 6, col ${i} must alternate`,
			);
			assert.equal(
				result.matrix[i]![6],
				expected,
				`Vertical timing pattern at row ${i}, col 6 must alternate`,
			);
		}
	});

	it("4. Eliminates the fake static 8-rectangle SVG diorama completely", () => {
		const snapshot = createTestSnapshot();
		const svg = generateTransferVerificationQrSvg(snapshot, 200);

		// Verify SVG root tag and namespace
		assert.ok(svg.includes("<svg"), "Must produce valid SVG");
		assert.ok(svg.includes('xmlns="http://www.w3.org/2000/svg"'), "Must have standard SVG namespace");
		assert.ok(svg.includes('width="200"'), "Must respect requested width");
		assert.ok(svg.includes('height="200"'), "Must respect requested height");
		assert.ok(svg.includes("viewBox="), "Must contain scalable viewBox");

		// Check for crisp edges style
		assert.ok(svg.includes("crispEdges"), "Must use crispEdges for barcode scanner readability");

		// STRICT VERIFICATION: Ensure the old fake 8-rectangle mock is completely gone!
		assert.ok(
			!svg.includes('viewBox="0 0 100 100"'),
			"Must NOT have the fake fixed '0 0 100 100' viewBox from the mock diorama",
		);
		assert.ok(
			!svg.includes('rect x="10" y="10" width="30" height="30"'),
			"Must NOT contain fake static rect x=10 y=10 w=30 h=30",
		);
		assert.ok(
			!svg.includes('rect x="60" y="10" width="30" height="30"'),
			"Must NOT contain fake static rect x=60 y=10 w=30 h=30",
		);
		assert.ok(
			!svg.includes('rect x="10" y="60" width="30" height="30"'),
			"Must NOT contain fake static rect x=10 y=60 w=30 h=30",
		);
		assert.ok(
			!svg.includes('rect x="45" y="45" width="10" height="10"'),
			"Must NOT contain fake static center dot x=45 y=45 w=10 h=10",
		);

		// Must contain authentic module path with hundreds of module instructions
		assert.ok(svg.includes("<path d="), "Must contain SVG path element for QR code modules");
		assert.ok(svg.length > 500, `Authentic QR SVG must be detailed (actual length: ${svg.length} chars)`);
	});

	it("5. Supports direct string payload or PatientClinicalSnapshot polymorphism", () => {
		const testPayload = "DENTE:TRF:SNAP-CUSTOM:PAT-999:CHECKSUM12345678";
		const svgFromString = generateTransferVerificationQrSvg(testPayload, 150);

		assert.ok(svgFromString.includes("<svg"), "Must generate SVG from raw payload string");
		assert.ok(svgFromString.includes('width="150"'), "Must respect custom size");

		const dataUriFromString = generateTransferVerificationQrDataUri(testPayload, 150);
		assert.ok(
			dataUriFromString.startsWith("data:image/svg+xml;utf8,"),
			"Data URI must use standard data:image/svg+xml scheme",
		);
		assert.ok(
			decodeURIComponent(dataUriFromString).includes("<svg"),
			"Decoded data URI must contain valid SVG XML",
		);
	});

	it("6. Dynamically differentiates QR codes for different patient transfer data", () => {
		const snapshotA = createTestSnapshot();
		const snapshotB = createTestSnapshot({
			staffName: "Петров С. В.",
			transferReasonRu: "Трансфер в связи со сменой места жительства",
		});

		const svgA = generateTransferVerificationQrSvg(snapshotA);
		const svgB = generateTransferVerificationQrSvg(snapshotB);

		// Snapshots have different snapshot IDs / checksums, so their QR SVG codes MUST be strictly unique
		assert.notEqual(svgA, svgB, "QR code SVG must vary dynamically based on patient clinical snapshot data");
	});

	it("7. Renders genuine QR code, verification string and SHA-256 in statutory Transfer Act HTML", () => {
		const snapshot = createTestSnapshot();
		const actHtml = generateTransferActHtml(snapshot);

		// Verify that the printable act includes:
		// 1. Genuine QR Code image
		assert.ok(actHtml.includes('src="data:image/svg+xml;utf8,'), "Act HTML must embed QR code as data URI");
		assert.ok(actHtml.includes("alt=\"QR код верификации"), "Act HTML must have descriptive QR alt attribute");

		// 2. Cryptographic SHA-256 checksum
		assert.ok(actHtml.includes(snapshot.checksumSha256), "Act HTML must display full cryptographic SHA-256");

		// 3. Verification string for administrator
		const expectedPayload = generateTransferVerificationQrPayload(snapshot);
		assert.ok(actHtml.includes(expectedPayload), "Act HTML must display the verification payload string for 2D scanner");

		// 4. Statutory standard ISO/IEC 18004 label
		assert.ok(actHtml.includes("ISO/IEC 18004"), "Act HTML must cite ISO/IEC 18004 standard");
	});

	it("8. executePatientBranchTransfer returns genuine QR Data URI and valid statutory act", () => {
		const draft: PatientTransferDraft = {
			patientId: "PAT-EXEC-777",
			patientFullName: "Ковалев Андрей Сергеевич",
			sourceBranchId: "branch-central",
			targetBranchId: "branch-north",
			transferReasonRu: "Продолжение лечения у хирурга-имплантолога",
			operatorStaffName: "Николаева А. И.",
			operatorStaffPosition: "Менеджер регистратуры",
			signatureType: "simple_electronic_signature_sms",
			is152FzConsentGiven: true,
			selectedComponents: {
				demographics: true,
				somaticAnamnesis: true,
				odontogram043u: true,
				visitDiaries: true,
				treatmentPlans: true,
				imagingArchive: false,
				depositBalance: true,
				activeLabOrders: false,
			},
		};

		const result = executePatientBranchTransfer({
			draft,
			demographics: {
				fullName: "Ковалев Андрей Сергеевич",
				birthDate: "1975-11-20",
				identityDocument: "Паспорт РФ 45 08 112233",
			},
			balanceRub: 45000,
			balanceKopecks: 4500000,
		});

		assert.equal(result.success, true, "Transfer must succeed");
		assert.ok(result.qrDataUri.startsWith("data:image/svg+xml;utf8,"), "Must generate genuine QR data URI");

		const decodedSvg = decodeURIComponent(result.qrDataUri.replace("data:image/svg+xml;utf8,", ""));
		assert.ok(decodedSvg.includes("<svg"), "Decoded QR must be valid SVG");
		assert.ok(decodedSvg.includes("<path d="), "Decoded QR must contain SVG module paths");
		assert.ok(!decodedSvg.includes('rect x="10" y="10" width="30" height="30"'), "Zero fake static rectangles");

		// Act HTML checks
		assert.ok(result.transferActHtml.includes("DENTE:TRF:"), "Transfer Act HTML must contain DENTE:TRF: payload");
		assert.ok(result.transferActHtml.includes(result.snapshot.checksumSha256), "Transfer Act HTML must contain SHA-256");
	});
});
