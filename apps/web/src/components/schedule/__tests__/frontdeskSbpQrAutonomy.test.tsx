/**
 * frontdeskSbpQrAutonomy.test.tsx
 *
 * Unit & structural tests for ScheduleView direct rendering and authentic ISO/IEC 18004 SBP QR matrix generation.
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	SbpQrEngine,
	calculateSbpMultiTenderSplit,
	computeCrc16Ccitt,
	generateQrCodeSvg,
	generateSbpPaymentPackage,
	parseEmvCoTlv,
} from "@dental/shared";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppLogicProvider, type AppLogicContextType } from "../../../contexts/AppLogicContext";
import { ScheduleView } from "../../../ScheduleView";

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

describe("ScheduleView — Direct Reception & Authentic SBP QR Matrix Generator", () => {
	test("1. рендерит рабочий ScheduleView без фейковых черных заглушек и статичного QR", () => {
		const html = renderToStaticMarkup(
			<AppLogicProvider value={mockAppContext}>
				<ScheduleView />
			</AppLogicProvider>,
		);
		assert.ok(html.includes('data-testid="schedule-view"'), "Must render canonical schedule-view");
		assert.equal(html.includes("w-48 h-48 bg-slate-950"), false, "Must NOT render fake black box");
		assert.equal(html.includes('width="160" height="160"'), false, "Must NOT render static placeholder SVG");
	});

	test("2. рендерит empty state при отсутствии dashboard и не падает", () => {
		const emptyContext = {
			dashboard: null,
			auth: mockAppContext.auth,
		} as unknown as AppLogicContextType;
		const html = renderToStaticMarkup(
			<AppLogicProvider value={emptyContext}>
				<ScheduleView />
			</AppLogicProvider>,
		);
		assert.ok(html.length > 0, "Empty state HTML must be rendered");
		assert.equal(html.includes('data-testid="schedule-view"'), false);
	});

	test("3. формирует пакет СБП с CRC16-CCITT, EMVCo TLV и ISO/IEC 18004 SVG и отклоняет подделанный CRC", () => {
		const pkg = generateSbpPaymentPackage({
			operationId: "ad1000-appt-44",
			bankMemberId: "100000000004",
			amountKopecks: 450050,
			currency: "RUB",
			invoiceId: "INV-44",
			merchantName: "Клиника ДЕНТЕ",
			merchantCity: "Москва",
			mcc: "8021",
			ttlSeconds: 1800,
			description: "Терапевтический прием",
		});

		assert.ok(pkg.nspkUrl.startsWith("https://qr.nspk.ru/AD1000APPT44"));
		assert.ok(pkg.nspkUrl.includes("sum=450050"));
		assert.ok(pkg.sbpDeepLink.startsWith("sbp://qr.nspk.ru/"));
		assert.equal(pkg.crc16.length, 4);

		const verified = SbpQrEngine.verifyNspkPayload(pkg.nspkUrl);
		assert.equal(verified.isValid, true);
		assert.equal(verified.amountKopecks, 450050);
		assert.equal(verified.bankMemberId, "100000000004");

		const tampered = SbpQrEngine.verifyNspkPayload(
			pkg.nspkUrl.replace("sum=450050", "sum=100"),
		);
		assert.equal(tampered.isValid, false, "Tampered amount must fail CRC16 check");

		const parsedTlv = parseEmvCoTlv(pkg.emvCoTlvPayload);
		assert.equal(parsedTlv.isValid, true, "EMVCo TLV CRC16 must verify");
		assert.equal(computeCrc16Ccitt(pkg.nspkUrl.split("&crc=")[0]!), pkg.crc16);

		const svg = generateQrCodeSvg(pkg.nspkUrl, {
			size: 192,
			margin: 2,
			title: "Оплата по СБП: Иванов И.И.",
		});
		assert.ok(svg.startsWith("<svg"));
		assert.ok(svg.endsWith("</svg>"));
		assert.ok(svg.includes("shape-rendering:crispEdges"));
	});

	test("4. рассчитывает сплит-оплату СБП в копейках без потери точности", () => {
		const split = calculateSbpMultiTenderSplit({
			totalAmountRub: 1500,
			depositAvailableRub: 500,
			orderId: "ORD-SBP-1",
			clinicName: "Клиника ДЕНТЕ",
		});
		assert.equal(split.totalAmountKopecks, 150000);
		assert.equal(split.depositOffsetKopecks, 50000);
		assert.equal(split.sbpChargeKopecks, 100000);
		assert.equal(split.isFullyCoveredByDeposit, false);
		assert.ok(split.sbpQr?.nspkUrl.includes("sum=100000"));
	});
});
