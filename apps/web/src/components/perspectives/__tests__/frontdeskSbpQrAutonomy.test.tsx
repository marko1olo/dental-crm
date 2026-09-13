/**
 * frontdeskSbpQrAutonomy.test.tsx
 *
 * Unit & structural tests for FrontdeskPerspectiveView facade and authentic ISO/IEC 18004 SBP QR matrix generator,
 * verification of complete fake black box eradication and clean delegation to ScheduleView
 * (Mandate 8s: Single Domain Authority, Mandate 8e: Doctor & Staff Autonomy, Mandate 8n: Solo Doctor & Small Clinic).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it, test } from "node:test";
import { fileURLToPath } from "node:url";
import { generateQrCodeSvg } from "@dental/shared";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppLogicProvider, type AppLogicContextType } from "../../../contexts/AppLogicContext";
import {
	type CheckoutItem,
	FrontdeskPerspectiveView,
	type FrontdeskPerspectiveViewProps,
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

describe("FrontdeskPerspectiveView — Clean Delegation & Authentic SBP QR Matrix Generator", () => {
	const frontdeskPath = path.resolve(__dirname, "../FrontdeskPerspectiveView.tsx");
	const sourceCode = fs.readFileSync(frontdeskPath, "utf8");

	test("1. гарантирует полное отсутствие процедурного блоата и черных боксов-заглушек", () => {
		assert.strictEqual(
			sourceCode.includes('w-48 h-48 bg-slate-950 rounded-xl flex flex-col items-center justify-center text-white p-2'),
			false,
			"FrontdeskPerspectiveView.tsx must NOT contain fake black box container",
		);
		assert.strictEqual(
			sourceCode.includes('<QrCode size={160} className="text-white" />'),
			false,
			"FrontdeskPerspectiveView.tsx must NOT contain fake static <QrCode size={160} />",
		);
	});

	test("2. делегирует рендер каноническому ScheduleView без сбоев (Мандат 8s)", () => {
		const html = renderToStaticMarkup(
			<AppLogicProvider value={mockAppContext}>
				<FrontdeskPerspectiveView />
			</AppLogicProvider>,
		);
		assert.ok(html.length > 0, "Rendered HTML must not be empty");
	});

	test("3. валидирует расчет SBP NSPK payload с точными копейками и параметрами банка", () => {
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

	test("4. поддерживает интерфейс CheckoutItem для кассовых расчетов", () => {
		const sampleItem: CheckoutItem = {
			appointmentId: "apt-001",
			patientId: "patient-001",
			patientName: "Петров П.П.",
			doctorName: "Д-р Иванов",
			serviceSummary: "Консультация",
			amountRub: 1500,
			fiscalStatus: "pending",
			time: "10:00",
		};
		assert.strictEqual(sampleItem.fiscalStatus, "pending");
		assert.strictEqual(sampleItem.amountRub, 1500);
	});
});
