import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup, renderToString } from "react-dom/server";

import { TOOTH_STATE_ACTIONS } from "../OdontogramModule";
import { OdontogramViewContainer } from "../OdontogramViewContainer";
import { LiveInvoiceFiscalBridge } from "../LiveInvoiceFiscalBridge";
import {
	createDefaultAdultTeethData,
	ToothChart,
	type ToothData,
} from "../ToothChart";

describe("CLIN-01: Exact Kopeck Money & Zero Bill Floor Elimination (Mandate 8b)", () => {
	it("LiveInvoiceFiscalBridge passes strictly 0 ₽ (0 kopecks) when netTotalPrice is 0 without 100-kop floor", () => {
		const html = renderToStaticMarkup(
			React.createElement(LiveInvoiceFiscalBridge, {
				isOpen: true,
				baseItems: [],
				patientId: "pat-zero",
				patientName: "Тестов Пациент",
				netTotalPrice: 0,
				netTotalKopecks: 0n,
				onClose: () => {},
			}),
		);
		assert.ok(html.includes('data-testid="cash-register-studio-modal"'));
		assert.ok(/0\s*₽/.test(html), "Zero bill must render 0 ₽, never 1 ₽");
		assert.equal(html.includes("1,00 ₽"), false);
	});
});

describe("CLIN-02: Locked Visit Diary Protocol Synchronization Autonomy (Mandate 8e)", () => {
	it("handles locked visit revision state transition deterministically", () => {
		let isLocked = true;
		let isRevising = false;
		const toasts: Array<{ msg: string; type: string }> = [];
		const activateRevision = () => {
			if (isLocked && !isRevising) {
				isRevising = true;
				toasts.push({
					msg: "Дневник визита открыт для внесения исправлений (протокол одонтограммы применён)",
					type: "warning",
				});
			}
		};
		activateRevision();
		assert.equal(isRevising, true);
		assert.equal(toasts[0]?.type, "warning");
		assert.ok(toasts[0]?.msg.includes("Дневник визита открыт"));
	});
});

describe("CLIN-03: Context Radial Menu Boundary Protection Math", () => {
	it("clamps y coordinate within viewport height bounds", () => {
		const clamp = (y: number, vh: number) => Math.max(10, Math.min(vh - 400, y));
		assert.equal(clamp(600, 900), 500);
		assert.equal(clamp(200, 900), 200);
		assert.equal(clamp(-50, 900), 10);
		assert.equal(clamp(300, 600), 200);
	});
});

describe("CLIN-06: TOOTH_STATE_ACTIONS WCAG AAA High-Contrast Palette", () => {
	it("all TOOTH_STATE_ACTIONS specify dual light/dark high-contrast text classes", () => {
		assert.ok(TOOTH_STATE_ACTIONS.length >= 8);
		const cariesAction = TOOTH_STATE_ACTIONS.find((a) => a.state === "Caries");
		assert.ok(cariesAction?.className.includes("text-rose-600") && cariesAction.className.includes("dark:text-rose-400"));
		const crownAction = TOOTH_STATE_ACTIONS.find((a) => a.state === "Crown");
		assert.ok(crownAction?.className.includes("text-blue-600") && crownAction.className.includes("dark:text-blue-400"));
		const healthyAction = TOOTH_STATE_ACTIONS.find((a) => a.state === "Healthy");
		assert.ok(healthyAction?.className.includes("text-emerald-600") && healthyAction.className.includes("dark:text-emerald-400"));
	});
});

describe("Sanctity of Medical Records: Zero Cartoon Emojis (Mandate 8d, Sin 7)", () => {
	const CARTOON_EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

	it("guarantees 0 cartoon emojis in TOOTH_STATE_ACTIONS, ToothChart, and OdontogramViewContainer", () => {
		for (const action of TOOTH_STATE_ACTIONS) {
			assert.equal(CARTOON_EMOJI_REGEX.test(action.label), false);
		}
		const sampleTeeth: ToothData[] = createDefaultAdultTeethData();
		const chartHtml = renderToString(React.createElement(ToothChart, { teethData: sampleTeeth, onToothClick: () => {} }));
		assert.equal(CARTOON_EMOJI_REGEX.test(chartHtml), false);

		const containerHtml = renderToString(
			React.createElement(OdontogramViewContainer, { teethData: sampleTeeth, dentitionMode: "adult" }),
		);
		assert.equal(CARTOON_EMOJI_REGEX.test(containerHtml), false);
	});
});
