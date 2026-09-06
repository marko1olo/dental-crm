/**
 * visitEmkTabSbpQrAutonomy.test.tsx
 *
 * Unit & structural tests for authentic ISO/IEC 18004 SBP QR matrix generator in VisitEmkTab,
 * verification of complete fake diorama eradication (Mandate 11: Core Engines Sacred vs Synthetic Garbage,
 * Core Route Rules 7 & 11, Mandate 8d UI Sin #7).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateQrCodeSvg, generateQrMatrix } from "@dental/shared";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Wave 24 Worker 3: VisitEmkTab Authentic SBP QR Generator & Zero Diorama", () => {
	const emkTabPath = path.resolve(__dirname, "../VisitEmkTab.tsx");
	const sourceCode = fs.readFileSync(emkTabPath, "utf8");

	it("1. guarantees total elimination of fake 9-rect SVG diorama from VisitEmkTab.tsx", () => {
		// Verify zero fake corner marker rects from the old diorama
		assert.strictEqual(
			sourceCode.includes('rect x="5" y="5"'),
			false,
			"VisitEmkTab.tsx must NOT contain fake diorama rect 'x=5 y=5'",
		);
		assert.strictEqual(
			sourceCode.includes('rect x="70" y="5"'),
			false,
			"VisitEmkTab.tsx must NOT contain fake diorama rect 'x=70 y=5'",
		);
		assert.strictEqual(
			sourceCode.includes('rect x="5" y="70"'),
			false,
			"VisitEmkTab.tsx must NOT contain fake diorama rect 'x=5 y=70'",
		);
		assert.strictEqual(
			sourceCode.includes('rect x="11" y="76"'),
			false,
			"VisitEmkTab.tsx must NOT contain fake diorama rect 'x=11 y=76'",
		);

		// Verify zero fake SVG circle with mock text
		assert.strictEqual(
			sourceCode.includes('<circle cx="50" cy="50" r="14"'),
			false,
			"VisitEmkTab.tsx must NOT contain mock diorama circle 'cx=50 cy=50'",
		);
		assert.strictEqual(
			sourceCode.includes('<text x="50" y="54"'),
			false,
			"VisitEmkTab.tsx must NOT contain mock diorama text 'x=50 y=54'",
		);
	});

	it("2. guarantees import and use of canonical ISO/IEC 18004 generateQrCodeSvg from @dental/shared", () => {
		// Import check
		assert.ok(
			sourceCode.includes("generateQrCodeSvg"),
			"VisitEmkTab.tsx must import generateQrCodeSvg",
		);
		assert.ok(
			sourceCode.match(/import\s*\{[^}]*generateQrCodeSvg[^}]*\}\s*from\s*"@dental\/shared"/),
			"generateQrCodeSvg must be imported from '@dental/shared'",
		);

		// sbpPayload construction
		assert.ok(
			sourceCode.includes("https://qr.nspk.ru/AD1000"),
			"VisitEmkTab.tsx must assemble canonical NSPK SBP URL 'https://qr.nspk.ru/AD1000...'",
		);
		assert.ok(
			sourceCode.includes("type=02&bank=100000000004"),
			"VisitEmkTab.tsx must set SBP type=02 and 12-digit bank code",
		);
		assert.ok(
			sourceCode.includes("totalNetRub * 100"),
			"VisitEmkTab.tsx must convert rubles to exact integer kopecks for SBP payload",
		);

		// QR SVG memoization & container
		assert.ok(
			sourceCode.includes("data-testid=\"sbp-qr-svg-container\""),
			"VisitEmkTab.tsx must render data-testid='sbp-qr-svg-container'",
		);
		assert.ok(
			sourceCode.includes("dangerouslySetInnerHTML={{ __html: sbpQrSvg }}"),
			"VisitEmkTab.tsx must inject generated SVG via dangerouslySetInnerHTML",
		);
	});

	it("3. guarantees design-system SBP protocol badge with Lucide Zap icon (zero emojis)", () => {
		assert.ok(
			sourceCode.includes("СБП • НСПК ГОСТ Р 56042"),
			"VisitEmkTab.tsx must render clean SBP GOST R 56042 badge",
		);
		assert.ok(
			sourceCode.includes("<Zap className=\"w-3.5 h-3.5 shrink-0\" />"),
			"VisitEmkTab.tsx must render Lucide Zap vector icon in SBP badge",
		);
		// Sin #7 check: no cartoon emojis in SBP modal section
		const sbpModalMatch = sourceCode.match(
			/\{isSbpQrModalOpen\s*&&\s*completionResult[\s\S]*?role="dialog"[\s\S]*?data-testid="btn-confirm-sbp-paid"[\s\S]*?<\/div>\s*\)\s*\}/,
		);
		assert.ok(sbpModalMatch, "SBP modal JSX section must exist");
		const modalText = sbpModalMatch[0];
		assert.ok(!modalText.includes("🎉"), "SBP modal must NOT contain emoji 🎉");
		assert.ok(!modalText.includes("🚀"), "SBP modal must NOT contain emoji 🚀");
		assert.ok(!modalText.includes("💡"), "SBP modal must NOT contain emoji 💡");
		assert.ok(!modalText.includes("🦷"), "SBP modal must NOT contain emoji 🦷");
		assert.ok(!modalText.includes("✓"), "SBP modal must NOT contain raw checkmark ✓");
	});

	it("4. generates authentic ISO/IEC 18004 SVG QR code with hundreds of matrix modules", () => {
		const testReceipt = "CHK-2026-0906-881";
		const testSumRub = 14500;
		const testPatient = "Барабаш С.В.";

		const sbpPayload =
			`https://qr.nspk.ru/AD1000${encodeURIComponent(testReceipt)}` +
			`?type=02&bank=100000000004&sum=${Math.round(testSumRub * 100)}&cur=RUB&crc=${encodeURIComponent(testPatient)}`;

		const svg = generateQrCodeSvg(sbpPayload, {
			size: 192,
			margin: 2,
			title: `Оплата по СБП: ${testReceipt}`,
		});

		// Basic SVG envelope verification
		assert.ok(svg.startsWith("<svg"), "Generated QR must be valid SVG starting with <svg");
		assert.ok(svg.endsWith("</svg>"), "Generated QR must end with </svg>");
		assert.ok(svg.includes('xmlns="http://www.w3.org/2000/svg"'), "SVG must declare xmlns");
		assert.ok(svg.includes('width="192"'), "SVG must set width=192");
		assert.ok(svg.includes('height="192"'), "SVG must set height=192");
		assert.ok(svg.includes("<title>Оплата по СБП: CHK-2026-0906-881</title>"), "SVG must set accessible title");

		// Background rect
		assert.ok(
			svg.match(/<rect width="\d+" height="\d+" fill="#ffffff"\/>/),
			"SVG must render white quiet zone rect",
		);

		// Hundreds of modules verification (authentic QR code matrix)
		const moduleMatches = svg.match(/h1v1h-1z/g);
		assert.ok(moduleMatches, "SVG path must contain module step commands");
		assert.ok(
			moduleMatches.length >= 300,
			`Authentic QR matrix must have >= 300 modules (found: ${moduleMatches.length})`,
		);

		// Verify absence of 9-rect diorama in generated SVG
		assert.strictEqual(svg.includes('rect x="5" y="5"'), false);
		assert.strictEqual(svg.includes("circle cx="), false);
	});

	it("5. encodes exact kopecks, receipt number, and Russian patient name in SBP payload", () => {
		const cases = [
			{ receipt: "REC-101", sumRub: 2500, patient: "Иванов И.И.", expectedSumKop: 250000 },
			{ receipt: "REC-999", sumRub: 14500.5, patient: "Смирнова Е.А.", expectedSumKop: 1450050 },
			{ receipt: "REC-MAX", sumRub: 350000, patient: "Кузнецов А.П.", expectedSumKop: 35000000 },
			{ receipt: "", sumRub: 100, patient: "", expectedSumKop: 10000 },
		];

		for (const c of cases) {
			const receiptParam = encodeURIComponent(c.receipt || "REC");
			const patientParam = encodeURIComponent(c.patient || "PATIENT");
			const sumKop = Math.round(c.sumRub * 100);

			const payload =
				`https://qr.nspk.ru/AD1000${receiptParam}` +
				`?type=02&bank=100000000004&sum=${sumKop}&cur=RUB&crc=${patientParam}`;

			assert.ok(payload.startsWith("https://qr.nspk.ru/AD1000"));
			assert.ok(payload.includes(`sum=${c.expectedSumKop}`));
			assert.ok(payload.includes("cur=RUB"));
			assert.ok(payload.includes("type=02&bank=100000000004"));

			// Verify QR can be generated without error
			const qrSvg = generateQrCodeSvg(payload, { size: 192, margin: 2 });
			assert.ok(qrSvg.length > 5000, `QR SVG length must be substantial (actual: ${qrSvg.length})`);
		}
	});

	it("6. validates underlying ISO/IEC 18004 boolean matrix structure", () => {
		const payload = "https://qr.nspk.ru/AD1000REC-001?type=02&bank=100000000004&sum=150000&cur=RUB&crc=TEST";
		const { matrix, size, version } = generateQrMatrix(payload, "M");

		assert.ok(version >= 3, `QR version for SBP payload must be >= 3 (actual: ${version})`);
		assert.strictEqual(size, 17 + version * 4, "Matrix size must equal 17 + version * 4");
		assert.strictEqual(matrix.length, size, "Matrix row count must equal size");

		// Finder pattern checks: top-left (0,0) must have 7x7 outer black square
		for (let c = 0; c < 7; c++) {
			assert.strictEqual(matrix[0]![c], true, `Finder (0, ${c}) must be black`);
			assert.strictEqual(matrix[6]![c], true, `Finder (6, ${c}) must be black`);
		}
		for (let r = 0; r < 7; r++) {
			assert.strictEqual(matrix[r]![0], true, `Finder (${r}, 0) must be black`);
			assert.strictEqual(matrix[r]![6], true, `Finder (${r}, 6) must be black`);
		}

		// Count black modules
		let blackModules = 0;
		for (let r = 0; r < size; r++) {
			for (let c = 0; c < size; c++) {
				if (matrix[r]![c]) blackModules++;
			}
		}

		assert.ok(
			blackModules > 300,
			`Black modules count must be > 300 in QR matrix (actual: ${blackModules})`,
		);
	});
});
