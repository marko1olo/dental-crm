/**
 * dualModeZeroMockBatch4.test.ts
 *
 * Mandate 8y (Dual-Mode Zero-Mock Constitution) & Mandate 8za (Anti-Duplication)
 * Verification suite for Batch 4:
 * 1. RefundServiceModal: Zero fake services in production, strict quarantine of DEFAULT_FALLBACK_SERVICES behind isDemoShowcaseMode()
 * 2. FastCheckoutModal: Zero fake 94,000 ₽ treatment stages in production, honest single-visit stage fallback
 * 3. fastCheckoutEngine: Robust integer kopeck math and defensive Number.isFinite guards
 * 4. Sber POS & SberPay: Honest unconfigured state in production when no terminal hardware config is present
 */

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	isDemoShowcaseMode,
	enableDemoShowcaseMode,
	disableDemoShowcaseMode,
	setRuntimeDemoMode,
} from "../lib/demoMode.js";
import {
	calculateStageAdvanceAmount,
	type StageAdvanceCalculation,
} from "../components/payments/checkout/fastCheckoutEngine.js";
import {
	POS_TERMINAL_STORAGE_KEY,
	loadSavedSberTerminalConfig,
	saveSberTerminalConfig,
	DEFAULT_SBER_TERMINAL_CONFIG,
} from "../components/payments/sberPos/sberPosPresets.js";
import { RefundServiceModal } from "../components/finance/refunds/RefundServiceModal.js";
import { FastCheckoutModal } from "../components/finance/FastCheckoutModal.js";
import { SberPosTerminalModal } from "../components/payments/sberPos/SberPosTerminalModal.js";
import { SberPayIntegration } from "../components/finance/SberPayIntegration.js";

// Mock localStorage for node environment
const memoryStore = new Map<string, string>();
const mockLocalStorage = {
	getItem(key: string): string | null {
		return memoryStore.get(key) ?? null;
	},
	setItem(key: string, value: string): void {
		memoryStore.set(key, String(value));
	},
	removeItem(key: string): void {
		memoryStore.delete(key);
	},
	clear(): void {
		memoryStore.clear();
	},
};

describe("Dual-Mode Zero-Mock Batch 4: Finance, Fast Checkout, Refunds & Sber POS", () => {
	beforeEach(() => {
		memoryStore.clear();
		// Assign mock localStorage to global if needed
		if (typeof globalThis.localStorage === "undefined") {
			Object.defineProperty(globalThis, "localStorage", {
				value: mockLocalStorage,
				writable: true,
				configurable: true,
			});
		}
		disableDemoShowcaseMode();
	});

	afterEach(() => {
		memoryStore.clear();
		setRuntimeDemoMode(null);
	});

	describe("1. RefundServiceModal: Zero Fake Services in Production (Mandate 8y)", () => {
		it("in production mode with no services provided, renders empty state and zero fake services", () => {
			disableDemoShowcaseMode();
			assert.equal(isDemoShowcaseMode(), false);

			const html = renderToStaticMarkup(
				React.createElement(RefundServiceModal, {
					isOpen: true,
					onClose: () => {},
					invoiceId: "inv-42",
					invoiceNumber: "INV-42",
					patientId: "pat-1",
					patientName: "Пациент Тестовый",
					// services omitted -> must be empty in production
				}),
			);

			// Must render empty services container
			assert.match(html, /data-testid="refund-empty-services"/);
			assert.match(html, /Позиции для возврата не найдены/);
			// Must NOT contain synthetic fallback services
			assert.doesNotMatch(html, /Восстановление зуба пломбой/);
			assert.doesNotMatch(html, /Анестезия инфильтрационная/);
			assert.doesNotMatch(html, /Изоляция операционного поля/);
		});

		it("in demo showcase mode with no services provided, renders showroom fallback services", () => {
			enableDemoShowcaseMode();
			assert.equal(isDemoShowcaseMode(), true);

			const html = renderToStaticMarkup(
				React.createElement(RefundServiceModal, {
					isOpen: true,
					onClose: () => {},
					invoiceId: "inv-99",
					invoiceNumber: "INV-99",
					patientId: "pat-demo",
					patientName: "Демо Пациент",
				}),
			);

			// Must contain demo fallback services
			assert.match(html, /Восстановление зуба пломбой/);
			assert.match(html, /Анестезия инфильтрационная/);
			assert.doesNotMatch(html, /data-testid="refund-empty-services"/);
		});

		it("in production mode with explicitly provided services, renders them accurately", () => {
			disableDemoShowcaseMode();
			const customServices = [
				{
					id: "srv-real-1",
					name: "Удаление ретенированного зуба 3.8",
					priceRub: 8500,
					quantity: 1,
				},
			];

			const html = renderToStaticMarkup(
				React.createElement(RefundServiceModal, {
					isOpen: true,
					onClose: () => {},
					invoiceId: "inv-55",
					invoiceNumber: "INV-55",
					patientId: "pat-55",
					patientName: "Реальный Пациент",
					services: customServices,
				}),
			);

			assert.match(html, /Удаление ретенированного зуба 3\.8/);
			assert.match(html, /8\s*500/);
			assert.doesNotMatch(html, /data-testid="refund-empty-services"/);
		});
	});

	describe("2. FastCheckoutModal: Zero Synthetic 94,000 ₽ Stages in Production (Mandate 8y)", () => {
		it("in production mode when stages prop is omitted, generates honest single-visit stage", () => {
			disableDemoShowcaseMode();
			assert.equal(isDemoShowcaseMode(), false);

			const html = renderToStaticMarkup(
				React.createElement(FastCheckoutModal, {
					isOpen: true,
					onClose: () => {},
					patientId: "pat-100",
					patientName: "Иванов И.И.",
					totalBillKop: 450000, // 4 500 ₽
				}),
			);

			// Must contain single visit stage title
			assert.match(html, /Оплата текущего приёма/);
			assert.match(html, /1 этап/);
			// Must NOT contain synthetic multi-stage demo plan (94 000 ₽)
			assert.doesNotMatch(html, /Этап 1: Терапия/);
			assert.doesNotMatch(html, /Этап 2: Хирургия/);
			assert.doesNotMatch(html, /Этап 3: Ортопедия/);
			assert.doesNotMatch(html, /94\s*000/);
		});

		it("in demo showcase mode when stages prop is omitted, renders standard demo multi-stage plan", () => {
			enableDemoShowcaseMode();
			assert.equal(isDemoShowcaseMode(), true);

			const html = renderToStaticMarkup(
				React.createElement(FastCheckoutModal, {
					isOpen: true,
					onClose: () => {},
					patientId: "pat-demo",
					patientName: "Тестовый Пациент",
					totalBillKop: 9400000,
				}),
			);

			assert.match(html, /Этап 1: Терапия/);
			assert.match(html, /Этап 2: Хирургия/);
			assert.match(html, /Этап 3: Ортопедия/);
			assert.match(html, /4 этапа/);
		});
	});

	describe("3. fastCheckoutEngine: Defensive Integer Math & Guard Verification", () => {
		it("handles regular positive amounts accurately in full mode", () => {
			const res = calculateStageAdvanceAmount(500000, "full", 0);
			assert.equal(res.mode, "full");
			assert.equal(res.totalStageAmountKop, 500000);
			assert.equal(res.requiredAmountKop, 500000);
			assert.equal(res.advanceOffsetTag1215Kop, 0);
			assert.equal(res.remainingDueKop, 0);
			assert.equal(res.ffdTag1214, 4);
		});

		it("handles advance_30 and advance_50 with exact kopeck rounding", () => {
			// 33333 kop * 30% = 9999.9 -> 10000 kop
			const res30 = calculateStageAdvanceAmount(33333, "advance_30", 0);
			assert.equal(res30.requiredAmountKop, 10000);
			assert.equal(res30.remainingDueKop, 23333);
			assert.equal(res30.ffdTag1214, 2);

			const res50 = calculateStageAdvanceAmount(150000, "advance_50", 0);
			assert.equal(res50.requiredAmountKop, 75000);
			assert.equal(res50.remainingDueKop, 75000);
		});

		it("handles advance_offset_tag1215 correctly", () => {
			const res = calculateStageAdvanceAmount(100000, "advance_offset_tag1215", 40000);
			assert.equal(res.advanceOffsetTag1215Kop, 40000);
			assert.equal(res.requiredAmountKop, 60000);
			assert.equal(res.isAdvanceOffsetReceipt, true);
		});

		it("defensively guards against NaN, Infinity, negative numbers and undefined", () => {
			const resNaN = calculateStageAdvanceAmount(Number.NaN, "full", Number.NaN);
			assert.equal(resNaN.totalStageAmountKop, 0);
			assert.equal(resNaN.requiredAmountKop, 0);
			assert.equal(Number.isFinite(resNaN.requiredAmountKop), true);

			const resNeg = calculateStageAdvanceAmount(-5000, "advance_30", -1000);
			assert.equal(resNeg.totalStageAmountKop, 0);
			assert.equal(resNeg.requiredAmountKop, 0);

			const resInf = calculateStageAdvanceAmount(Number.POSITIVE_INFINITY, "full", 0);
			assert.equal(resInf.totalStageAmountKop, 0);
		});
	});

	describe("4. Sberbank POS Terminal Configuration & Presets Storage", () => {
		it("saveSberTerminalConfig persists config to storage and loadSavedSberTerminalConfig restores it", () => {
			assert.equal(loadSavedSberTerminalConfig(), null);

			const customConfig = {
				...DEFAULT_SBER_TERMINAL_CONFIG,
				terminalId: "77665544",
				hostIp: "192.168.1.150",
				hostPort: 4000,
			};

			saveSberTerminalConfig(customConfig);
			const loaded = loadSavedSberTerminalConfig();
			assert.notEqual(loaded, null);
			assert.equal(loaded?.terminalId, "77665544");
			assert.equal(loaded?.hostIp, "192.168.1.150");
		});

		it("returns null if storage contains corrupted JSON or missing terminalId", () => {
			mockLocalStorage.setItem(POS_TERMINAL_STORAGE_KEY, "invalid-json{");
			assert.equal(loadSavedSberTerminalConfig(), null);

			mockLocalStorage.setItem(POS_TERMINAL_STORAGE_KEY, JSON.stringify({ hostPort: 4000 }));
			assert.equal(loadSavedSberTerminalConfig(), null);
		});
	});

	describe("5. Sber POS & SberPay Dual-Mode Unconfigured Display (Mandate 8y)", () => {
		it("SberPosTerminalModal renders unconfigured notice and TID НЕ НАСТРОЕН when unconfigured", () => {
			const html = renderToStaticMarkup(
				React.createElement(SberPosTerminalModal, {
					isOpen: true,
					onClose: () => {},
					totalBillKop: 100000,
					forceUnconfigured: true,
				}),
			);

			assert.match(html, /data-testid="sber-pos-unconfigured-notice"/);
			assert.match(html, /Терминал Сбербанк POS не настроен/);
			assert.match(html, /TID НЕ НАСТРОЕН/);
		});

		it("SberPayIntegration renders unconfigured notice and TID НЕ НАСТРОЕН when unconfigured", () => {
			const html = renderToStaticMarkup(
				React.createElement(SberPayIntegration, {
					patientId: "pat-123",
					patientName: "Сидоров С.С.",
					amountKopecks: 250000,
					forceUnconfigured: true,
				}),
			);

			assert.match(html, /data-testid="sberpay-unconfigured-notice"/);
			assert.match(html, /Терминал Сбербанк POS не настроен/);
			assert.match(html, /TID: НЕ НАСТРОЕН/);
		});
	});
});
