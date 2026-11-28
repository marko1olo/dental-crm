#!/usr/bin/env node
/**
 * scripts/tests/ui-xray-rules.test.mjs
 *
 * Тесты движка оценки живых браузерных замеров DOM X-Ray (`evaluateDomXrayReport`).
 * Проверяет все критические классы визуального брака со скриншотов 2026-11-28.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { evaluateDomXrayReport, formatDomXrayBlockers } from "../lib/ui-xray-rules.mjs";

function makeCleanMetrics() {
	return {
		viewport: { width: 1440, height: 900, isMobile: false },
		theme: "dark",
		splashScreenDetected: false,
		horizontalOverflowPx: 0,
		viewportClippedControlsCount: 0,
		viewportClippedControls: [],
		overlappingControlsCount: 0,
		overlappingControls: [],
		fabOverlapsCount: 0,
		fabOverlaps: [],
		tableRowPrimaryButtonsCount: 0,
		tableRowPrimaryButtons: [],
		modalPrimaryCtaCount: 1,
		workspacePrimaryCtaCount: 1,
		primaryCtas: [{ text: "Сохранить" }],
		lowContrastControlsCount: 0,
		lowContrastControls: [],
		darkModeWhiteBlobsCount: 0,
		blueDarkCardsCount: 0,
		blueDarkCards: [],
		duplicateCloseButtonsCount: 0,
		duplicatePrimaryLabelsCount: 0,
		duplicatePrimaryLabels: [],
		rawMachineLeaks: [],
		clippedTextsCount: 0,
		undersizedTargetsCount: 0,
	};
}

test("evaluateDomXrayReport passes clean canonical UI telemetry with 0 blockers", () => {
	const report = evaluateDomXrayReport(makeCleanMetrics(), { state: "pc_dark" });
	assert.equal(report.passed, true);
	assert.deepEqual(report.blockers, []);
});

test("evaluateDomXrayReport blocks splash loader, neon buttons, table Primary fence, FAB overlap, right clipping and #1e293b dark cards", () => {
	const dirty = {
		...makeCleanMetrics(),
		splashScreenDetected: true,
		viewportClippedControlsCount: 1,
		viewportClippedControls: [{ text: "Этапы", rectRight: 1455, viewportWidth: 1440, selector: "button.icon-button" }],
		fabOverlapsCount: 1,
		fabOverlaps: [{ first: ".copilot-trigger-btn", second: "Позвонить", overlapPx: "36x36" }],
		tableRowPrimaryButtonsCount: 2,
		tableRowPrimaryButtons: [{ text: "Принять", selector: "button.primary-button" }],
		lowContrastControlsCount: 1,
		lowContrastControls: [{ text: "Новый наряд", reason: "NEON_CYAN_BUTTON", bg: "rgb(45,212,191)", fg: "rgb(15,23,42)", contrastRatio: 2.1 }],
		blueDarkCardsCount: 1,
		blueDarkCards: [{ backgroundColor: "rgb(30, 41, 59)", selector: "div.card" }],
		duplicateCloseButtonsCount: 1,
		rawMachineLeaks: [{ kind: "DEV_SLANG", samples: ["indexeddb"], count: 1 }],
	};

	const report = evaluateDomXrayReport(dirty, { state: "mobile_dark" });
	assert.equal(report.passed, false);

	const codes = new Set(report.blockers.map((b) => b.code));
	assert.ok(codes.has("SPLASH_SCREEN_CAPTURED"));
	assert.ok(codes.has("VIEWPORT_CLIPPED_CONTROLS"));
	assert.ok(codes.has("OVERLAPPING_CONTROLS"));
	assert.ok(codes.has("TABLE_ROW_PRIMARY_FENCE"));
	assert.ok(codes.has("LOW_CONTRAST_OR_NEON_BUTTON"));
	assert.ok(codes.has("BLUE_DARK_CARDS"));
	assert.ok(codes.has("DUPLICATE_CLOSE_BUTTON"));
	assert.ok(codes.has("UI_TEXT_LEAK_DEV_SLANG"));

	const formatted = formatDomXrayBlockers(report);
	assert.match(formatted, /ПОЧЕМУ ЭТО БРАК И КАК ЧИНИТЬ/);
});

test("evaluateDomXrayReport rejects competing Primary CTAs inside modal (>1) and workspace (>2)", () => {
	const modalFence = { ...makeCleanMetrics(), modalPrimaryCtaCount: 2 };
	const workspaceFence = {
		...makeCleanMetrics(),
		workspacePrimaryCtaCount: 3,
		primaryCtas: [{ text: "Запись" }, { text: "Показать администратору" }, { text: "Подписать по SMS" }],
		duplicatePrimaryLabelsCount: 1,
		duplicatePrimaryLabels: ['"показать администратору" x2'],
	};

	const rModal = evaluateDomXrayReport(modalFence, { state: "pc_light" });
	assert.equal(rModal.passed, false);
	assert.ok(rModal.blockers.some((b) => b.code === "MULTIPLE_MODAL_PRIMARY_CTA"));

	const rWork = evaluateDomXrayReport(workspaceFence, { state: "pc_dark" });
	assert.equal(rWork.passed, false);
	assert.ok(rWork.blockers.some((b) => b.code === "PRIMARY_CTA_FENCE"));
	assert.ok(rWork.blockers.some((b) => b.code === "DUPLICATE_PRIMARY_LABEL"));
});

test("evaluateDomXrayReport catches disabled critical CTA, broken img, SVG #id collision, matryoshka modals, mobile <44px, washed-out tabs, and blank void", () => {
	const deepFailures = {
		...makeCleanMetrics(),
		viewport: { width: 390, height: 844, isMobile: true },
		disabledCriticalCtasCount: 1,
		disabledCriticalCtas: [{ text: "Сохранить", selector: "button.save" }],
		brokenImagesCount: 1,
		brokenImages: [{ src: "/img/broken.png", selector: "img.avatar" }],
		duplicateSvgIdsCount: 2,
		duplicateSvgIds: ["tooth-enamel-grad (x16)", "pulp-clip (x16)"],
		stackedModalsCount: 2,
		toolbarHeightMismatchesCount: 1,
		toolbarHeightMismatches: [{ selector: ".toolbar", minH: 28, maxH: 48 }],
		washedOutDarkTabsCount: 1,
		washedOutDarkTabs: [{ text: "Очередь отправки", lum: 165, selector: "button[role='tab']" }],
		blankTopVoidPx: 295,
		undersizedTargetsCount: 2,
		undersizedTargets: [{ text: "Фильтр", width: 32, height: 32 }],
	};

	const r = evaluateDomXrayReport(deepFailures, {
		state: "mobile_dark",
		runtimeErrors: ["HTTP 500 /api/clinic/analytics"],
	});
	assert.equal(r.passed, false);
	const codes = new Set(r.blockers.map((b) => b.code));
	for (const expected of [
		"DISABLED_CRITICAL_CTA",
		"BROKEN_IMAGES",
		"DUPLICATE_SVG_IDS",
		"STACKED_MODAL_MATRYOSHKA",
		"TOOLBAR_HEIGHT_MISMATCH",
		"WASHED_OUT_DARK_TAB",
		"BLANK_TOP_VOID",
		"MOBILE_UNDERSIZED_TOUCH",
		"RUNTIME_CONSOLE_OR_HTTP_ERROR",
	]) {
		assert.ok(codes.has(expected), `Missing deep X-Ray blocker ${expected}`);
	}
});

test("evaluateDomXrayReport catches occluded bottom-sheet over nav, toast over CTA, ALL CAPS headings and duplicate card codes", () => {
	const screenRot = {
		...makeCleanMetrics(),
		viewport: { width: 390, height: 844, isMobile: true },
		modalOccludedByNavCount: 1,
		modalOccludedByNav: [{ buttonText: "Зафиксировать операцию", navSelector: ".mobile-bottom-nav", dialogSelector: "[role='dialog']" }],
		toastCoveringControlsCount: 1,
		toastCoveringControls: [{ toastText: "Демо-данные загружены", buttonText: "Сброс", overlapPx: "120x32" }],
		allCapsViolationsCount: 1,
		allCapsViolations: [{ text: "ВЫРУЧКА ЗА ДЕНЬ", selector: "span.stat-label" }],
		duplicateCardCodesCount: 1,
		duplicateCardCodes: ["ЗТЛ-01А214 (x3)"],
	};

	const r = evaluateDomXrayReport(screenRot, { state: "mobile_light" });
	assert.equal(r.passed, false);
	const codes = new Set(r.blockers.map((b) => b.code));
	for (const expected of ["MODAL_OCCLUDED_BY_NAV", "TOAST_COVERING_CTA", "ALL_CAPS_UI_TEXT", "DUPLICATE_CARD_CODE"]) {
		assert.ok(codes.has(expected), `Missing live screenshot rot blocker ${expected}`);
	}
});
