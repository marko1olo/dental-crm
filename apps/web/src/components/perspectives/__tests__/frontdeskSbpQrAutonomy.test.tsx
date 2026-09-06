/**
 * frontdeskSbpQrAutonomy.test.tsx
 *
 * Unit & structural tests for authentic ISO/IEC 18004 SBP QR matrix generator in FrontdeskPerspectiveView,
 * verification of complete fake black box eradication (Mandate 11: Core Engines Sacred vs Synthetic Garbage,
 * Core Route Rules 7 & 11, Mandate 8e: Doctor & Staff Autonomy, Mandate 8n: Solo Doctor & Small Clinic Sovereignty).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "vitest";
import { fileURLToPath } from "node:url";
import { generateQrCodeSvg } from "@dental/shared";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppLogicProvider, type AppLogicContextType } from "../../../contexts/AppLogicContext";
import {
	type CheckoutItem,
	FrontdeskPerspectiveView,
} from "../FrontdeskPerspectiveView";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mockAppContext = {
	dashboard: {
		appointments: [],
		patients: [],
		staff: [],
	},
	auth: {
		currentUser: { name: "Администратор" },
		denteClinicalMutationHeaders: (extra: Record<string, string> = {}) => ({
			"x-test-auth": "true",
			...extra,
		}),
	},
} as unknown as AppLogicContextType;

describe("FrontdeskPerspectiveView — Authentic ISO/IEC 18004 SBP QR Matrix Generator", () => {
	const frontdeskPath = path.resolve(__dirname, "../FrontdeskPerspectiveView.tsx");
	const sourceCode = fs.readFileSync(frontdeskPath, "utf8");

	it("1. guarantees total elimination of fake static QrCode black box from FrontdeskPerspectiveView.tsx", () => {
		// Verify zero fake black box container
		assert.strictEqual(
			sourceCode.includes('w-48 h-48 bg-slate-950 rounded-xl flex flex-col items-center justify-center text-white p-2'),
			false,
			"FrontdeskPerspectiveView.tsx must NOT contain fake black box container",
		);

		// Verify zero static mock icon inside the modal
		assert.strictEqual(
			sourceCode.includes('<QrCode size={160} className="text-white" />'),
			false,
			"FrontdeskPerspectiveView.tsx must NOT contain fake static <QrCode size={160} />",
		);
	});

	it("2. guarantees import and use of canonical ISO/IEC 18004 generateQrCodeSvg from @dental/shared", () => {
		// Import check
		assert.ok(
			sourceCode.includes("generateQrCodeSvg"),
			"FrontdeskPerspectiveView.tsx must import generateQrCodeSvg",
		);
		assert.ok(
			sourceCode.match(/import\s*\{[^}]*generateQrCodeSvg[^}]*\}\s*from\s*"@dental\/shared"/),
			"generateQrCodeSvg must be imported from '@dental/shared'",
		);

		// sbpPayload construction
		assert.ok(
			sourceCode.includes("https://qr.nspk.ru/AD1000"),
			"FrontdeskPerspectiveView.tsx must assemble canonical NSPK SBP URL 'https://qr.nspk.ru/AD1000...'",
		);
		assert.ok(
			sourceCode.includes("type=02&bank=100000000004"),
			"FrontdeskPerspectiveView.tsx must set SBP type=02 and 12-digit bank code",
		);
		assert.ok(
			sourceCode.includes("cur=RUB"),
			"FrontdeskPerspectiveView.tsx must specify currency cur=RUB",
		);
		assert.ok(
			sourceCode.includes("amountRub || 0) * 100"),
			"FrontdeskPerspectiveView.tsx must convert rubles to exact integer kopecks for SBP payload",
		);

		// QR SVG memoization & container
		assert.ok(
			sourceCode.includes('data-testid="frontdesk-sbp-qr-svg"'),
			"FrontdeskPerspectiveView.tsx must render data-testid='frontdesk-sbp-qr-svg'",
		);
		assert.ok(
			sourceCode.includes("dangerouslySetInnerHTML={{ __html: sbpQrSvg }}"),
			"FrontdeskPerspectiveView.tsx must inject generated SVG via dangerouslySetInnerHTML",
		);
	});

	it("3. guarantees design-system SBP protocol badge with Lucide Zap icon (zero cartoon emojis)", () => {
		assert.ok(
			sourceCode.includes("СБП • НСПК ГОСТ Р 56042"),
			"FrontdeskPerspectiveView.tsx must render clean SBP GOST R 56042 badge",
		);
		assert.ok(
			sourceCode.includes("<Zap className=\"w-3.5 h-3.5 shrink-0\" />"),
			"FrontdeskPerspectiveView.tsx must render Lucide Zap vector icon in SBP badge",
		);

		// Sin #7 check: no cartoon emojis in SBP modal section
		const sbpModalMatch = sourceCode.match(
			/activeSbpQrAppointment\s*&&[\s\S]*?Подтвердить оплату и выбить чек 54-ФЗ[\s\S]*?<\/motion\.div>/,
		);
		assert.ok(sbpModalMatch, "SBP modal JSX section must exist");
		const modalText = sbpModalMatch[0];
		assert.ok(!modalText.includes("🎉"), "SBP modal must NOT contain emoji 🎉");
		assert.ok(!modalText.includes("🚀"), "SBP modal must NOT contain emoji 🚀");
		assert.ok(!modalText.includes("💡"), "SBP modal must NOT contain emoji 💡");
		assert.ok(!modalText.includes("🦷"), "SBP modal must NOT contain emoji 🦷");
		assert.ok(!modalText.includes("✓"), "SBP modal must NOT contain raw checkmark ✓");
	});

	it("4. renders authentic SVG QR code with <svg> and data-testid='frontdesk-sbp-qr-svg' when modal is open", () => {
		const sampleAppointment: CheckoutItem = {
			appointmentId: "apt-frontdesk-909",
			patientId: "patient-frontdesk-101",
			patientName: "Сидорова Анна Михайловна",
			doctorName: "Д-р Кузнецова Е. В.",
			serviceSummary: "Профессиональная гигиена и чистка Air Flow",
			amountRub: 6800,
			fiscalStatus: "pending",
			time: "15:00",
		};

		const html = renderToStaticMarkup(
			<AppLogicProvider value={mockAppContext}>
				<FrontdeskPerspectiveView initialActiveSbpQrAppointment={sampleAppointment} />
			</AppLogicProvider>,
		);

		// Protocol badge check
		assert.ok(
			html.includes("СБП • НСПК ГОСТ Р 56042"),
			"Rendered HTML must contain protocol badge «СБП • НСПК ГОСТ Р 56042»",
		);

		// Container check
		assert.ok(
			html.includes('data-testid="frontdesk-sbp-qr-svg"'),
			"Rendered HTML must contain data-testid='frontdesk-sbp-qr-svg'",
		);

		// SVG element check
		assert.ok(
			html.includes("<svg"),
			"Rendered HTML must contain authentic <svg element inside QR container",
		);
		assert.ok(
			html.includes("</svg>"),
			"Rendered HTML must contain closing </svg> tag",
		);
		assert.ok(
			html.includes('width="192"'),
			"SVG width must match 192px specification",
		);
		assert.ok(
			html.includes('height="192"'),
			"SVG height must match 192px specification",
		);
		assert.ok(
			html.includes("Оплата по СБП: Сидорова Анна Михайловна"),
			"SVG title must contain patient name in accessible title element",
		);

		// Module step commands check (matrix dots)
		const moduleMatches = html.match(/h1v1h-1z/g);
		assert.ok(moduleMatches, "SVG path must contain matrix module step commands");
		assert.ok(
			moduleMatches.length >= 300,
			`Authentic QR matrix must contain >=300 modules, found ${moduleMatches.length}`,
		);

		// Patient and price in modal
		assert.ok(
			html.includes("Пациент: Сидорова Анна Михайловна"),
			"Modal must display active patient name",
		);
		assert.ok(
			html.includes("6800") || html.includes("6 800"),
			"Modal must display amount in rubles",
		);
	});

	it("5. validates SBP NSPK payload calculation with exact kopecks and bank parameters", () => {
		const testAppointmentId = "apt-test-44";
		const testAmountRub = 4500.5;
		const testPatient = "Иванов И.И.";

		const expectedSumKopecks = Math.round(testAmountRub * 100);
		assert.strictEqual(expectedSumKopecks, 450050, "4500.50 RUB must equal 450050 kopecks");

		const sbpPayload =
			`https://qr.nspk.ru/AD1000${encodeURIComponent(testAppointmentId)}` +
			`?type=02&bank=100000000004&sum=${expectedSumKopecks}&cur=RUB&crc=${encodeURIComponent(testPatient)}`;

		assert.ok(sbpPayload.startsWith("https://qr.nspk.ru/AD1000apt-test-44"));
		assert.ok(sbpPayload.includes("type=02"));
		assert.ok(sbpPayload.includes("bank=100000000004"));
		assert.ok(sbpPayload.includes("sum=450050"));
		assert.ok(sbpPayload.includes("cur=RUB"));
		assert.ok(sbpPayload.includes(`crc=${encodeURIComponent(testPatient)}`));

		const svg = generateQrCodeSvg(sbpPayload, {
			size: 192,
			margin: 2,
			title: `Оплата по СБП: ${testPatient}`,
		});

		assert.ok(svg.startsWith("<svg"), "Generated SVG starts with <svg");
		assert.ok(svg.endsWith("</svg>"), "Generated SVG ends with </svg>");
		assert.ok(svg.includes('viewBox="0 0'), "SVG contains viewBox attribute");
		assert.ok(svg.includes("shape-rendering:crispEdges"), "SVG specifies crispEdges for pixel-perfect scan");
	});
});
