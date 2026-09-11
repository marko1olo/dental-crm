/**
 * warrantyAndOverdraftBillingAutonomy.test.tsx — Wave 108 Verification Suite
 *
 * Verifies:
 * 1. StomX invoice schema parity: is_warranty, warranty_price, warranty_source_real_appointment_id.
 * 2. 1-click doctor warranty rework toggle (100% discount, 0 ₽ net, isWarranty: true, Mandate 8e).
 * 3. Badge [ГАРАНТИЯ] with text-teal-700 bg-teal-50 dark:bg-teal-950/40 dark:text-teal-300 styling.
 * 4. Doctor Autonomy Mandate 8e: 0 disabled buttons, zero admin password dialogs.
 * 5. Mixed invoice calculation: warranty rework items zero out, while non-warranty items receive loyalty discounts kopeck-exact.
 * 6. Warehouse soft overdraft: shortage of consumables warns via toast, but returns success: true and never blocks checkout.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToString } from "react-dom/server";
import { PatientBillingModal } from "../PatientBillingModal";
import {
	type InvoiceServiceItem,
	compileCompletedWorksAct,
	generateCompletedActAndWarrantyHtml,
} from "../invoiceEngine";
import {
	distributeLoyaltyDiscountAcrossItems,
} from "../fiscal/fiscal54fzEngine";
import {
	handleOneClickPackageWriteOff,
} from "../../warehouse/warehousePackageWriteOffEngine";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRoot = path.resolve(__dirname, "../../../..");
const repoRoot = path.resolve(webRoot, "../..");

describe("Wave 108: StomX Warranty Reworks & Consumables Soft Overdraft Autonomy", () => {
	it("1. StomX sample invoice schema compatibility: verified against sample_full_invoice.json", () => {
		const samplePath = path.resolve(
			repoRoot,
			"РЕВЕРС ИНЖИНИРИНГ СТОМ-ИКС НОВЫЙ ЗАВОЗ/data/invoices/sample_full_invoice.json",
		);
		assert.ok(fs.existsSync(samplePath), `Sample invoice must exist at ${samplePath}`);

		const rawContent = fs.readFileSync(samplePath, "utf-8");
		const sample = JSON.parse(rawContent);

		// Verify StomX invoice header fields
		assert.ok("warranty_source_real_appointment_id" in sample);
		assert.ok("warranty_price" in sample);

		// Verify StomX procedure line item fields
		assert.ok(Array.isArray(sample.procedures) && sample.procedures.length > 0);
		const firstProc = sample.procedures[0];
		assert.ok("is_warranty" in firstProc);
		assert.ok("warranty_price" in firstProc);
	});

	it("2. compileCompletedWorksAct: correctly computes warranty rework with 100% discount and 0 ₽ net", () => {
		const items: InvoiceServiceItem[] = [
			{
				id: "srv-w-1",
				name: "Повторное препарирование и нанокомпозитная реставрация (Гарантия)",
				code804n: "A16.07.002",
				toothNumber: 16,
				quantity: 1,
				priceRub: 4500,
				category: "therapy",
				isWarranty: true,
				warrantyDiscountPercent: 100,
				warrantyPriceRub: 4500,
				warrantySourceAppointmentId: "appt-prev-101",
			},
			{
				id: "srv-norm-2",
				name: "Профессиональная гигиена полости рта (AirFlow)",
				code804n: "A16.07.051",
				toothNumber: null,
				quantity: 1,
				priceRub: 3500,
				category: "hygiene",
				isWarranty: false,
			},
		];

		const summary = compileCompletedWorksAct({
			actNumber: "АКТ-2026-0001",
			contractNumber: "ДОГ-2026-0001",
			clinic: {
				name: "ДЕНТЕ",
				legalName: "ООО «ДЕНТЕ»",
				inn: "7701234567",
				address: "г. Москва",
			},
			patient: {
				fullName: "Смирнов Алексей Петрович",
			},
			doctor: {
				fullName: "Д-р Кузнецов П. С.",
			},
			items,
		});

		// Gross includes both items
		assert.equal(summary.totalGrossRub, 8000);
		// Discount covers the warranty item in full (4500 ₽)
		assert.equal(summary.totalDiscountRub, 4500);
		// Net to pay is exactly 3500 ₽ (patient only pays for hygiene)
		assert.equal(summary.totalNetRub, 3500);
		// Warranty summary metadata
		assert.equal(summary.hasWarrantyRework, true);
		assert.equal(summary.warrantyItemsCount, 1);
		assert.equal(summary.totalWarrantyPriceRub, 4500);
		assert.equal(summary.warrantySourceAppointmentId, "appt-prev-101");
	});

	it("3. generateCompletedActAndWarrantyHtml: renders [ГАРАНТИЙНАЯ ПЕРЕДЕЛКА 100%] and 0.00 ₽ in printable act", () => {
		const items: InvoiceServiceItem[] = [
			{
				id: "srv-w-1",
				name: "Гарантийная замена композитной пломбы",
				code804n: "A16.07.002",
				toothNumber: 24,
				quantity: 1,
				priceRub: 5000,
				category: "therapy",
				isWarranty: true,
				warrantyDiscountPercent: 100,
				warrantyPriceRub: 5000,
			},
		];

		const html = generateCompletedActAndWarrantyHtml({
			actNumber: "АКТ-2026-0002",
			contractNumber: "ДОГ-2026-0002",
			clinic: {
				name: "ДЕНТЕ",
				legalName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
				inn: "7701234567",
				address: "г. Москва",
			},
			patient: {
				fullName: "Ковалева Елена Сергеевна",
			},
			doctor: {
				fullName: "Д-р Смирнов А. В.",
			},
			items,
		});

		assert.ok(html.includes("[ГАРАНТИЙНАЯ ПЕРЕДЕЛКА 100%]"));
		assert.ok(html.includes("0.00"));
		assert.ok(html.includes("0.00 ₽"));
	});

	it("4. distributeLoyaltyDiscountAcrossItems: applies loyalty discount to non-warranty items while keeping warranty items 0 ₽", () => {
		const items: InvoiceServiceItem[] = [
			{
				id: "srv-1",
				name: "Переделка винира E.max (Гарантия)",
				quantity: 1,
				priceRub: 20000,
				isWarranty: true,
				warrantyDiscountPercent: 100,
				warrantyPriceRub: 20000,
			},
			{
				id: "srv-2",
				name: "Снятие слепка альгинатной массой",
				quantity: 1,
				priceRub: 2000,
				isWarranty: false,
			},
		];

		// Apply 10% loyalty discount on the bill
		const result = distributeLoyaltyDiscountAcrossItems(items, {
			preset: "discount_10",
		});

		// Warranty item is 100% discounted (20 000 ₽)
		const warrantyItem = result.items.find((it) => it.id === "srv-1");
		assert.ok(warrantyItem);
		assert.equal(warrantyItem.discountRub, 20000);
		assert.equal(warrantyItem.isWarranty, true);
		assert.equal(warrantyItem.warrantyDiscountPercent, 100);

		// Non-warranty item gets 10% of 2 000 ₽ = 200 ₽ discount (net 1 800 ₽)
		const normalItem = result.items.find((it) => it.id === "srv-2");
		assert.ok(normalItem);
		assert.equal(normalItem.discountRub, 200);

		// Total gross = 22 000 ₽
		assert.equal(result.totalGrossRub, 22000);
		// Total discount = 20 000 + 200 = 20 200 ₽
		assert.equal(result.totalDiscountRub, 20200);
		// Total net = 1 800 ₽
		assert.equal(result.totalNetRub, 1800);
		assert.equal(result.hasWarrantyRework, true);
		assert.equal(result.totalWarrantyPriceRub, 20000);
	});

	it("5. PatientBillingModal: renders 1-click warranty toggle button and [ГАРАНТИЯ] badge with clinical styling", () => {
		const initialServices: InvoiceServiceItem[] = [
			{
				id: "srv-101",
				name: "Лечение кариеса и эстетическая реставрация",
				code804n: "A16.07.002",
				toothNumber: 36,
				quantity: 1,
				priceRub: 6000,
				category: "therapy",
				isWarranty: true, // Pre-flagged as warranty rework
				warrantyDiscountPercent: 100,
				warrantyPriceRub: 6000,
			},
		];

		const html = renderToString(
			<PatientBillingModal
				isOpen={true}
				onClose={() => {}}
				patient={{
					id: "pat-101",
					fullName: "Михайлов Денис Игоревич",
				}}
				doctor={{
					fullName: "Д-р Кузнецов П. С.",
				}}
				initialServices={initialServices}
			/>,
		);

		// Verify 1-click toggle button exists
		assert.ok(
			html.includes("data-testid=\"btn-item-warranty-srv-101\""),
			"Must render data-testid btn-item-warranty-srv-101",
		);

		// Verify [ГАРАНТИЯ] badge with required styling
		assert.ok(html.includes("[ГАРАНТИЯ]"), "Must render badge text [ГАРАНТИЯ]");
		assert.ok(
			html.includes("text-teal-700"),
			"Badge must have text-teal-700",
		);
		assert.ok(
			html.includes("bg-teal-50"),
			"Badge must have bg-teal-50",
		);

		// Verify payable amount is 0 ₽
		assert.ok(html.includes("0 ₽"), "Net payable price must be 0 ₽");

		// Mandate 8e: zero disabled buttons without reason
		assert.ok(
			!html.includes("disabled=\"\"") || !html.includes("btn-item-warranty"),
			"Warranty button must never be disabled",
		);
	});

	it("6. PatientBillingModal: multiple items group renders individual warranty buttons per item", () => {
		const initialServices: InvoiceServiceItem[] = [
			{
				id: "srv-c-1",
				name: "Лечение глубокого кариеса",
				code804n: "A16.07.002",
				toothNumber: 46,
				quantity: 1,
				priceRub: 5500,
				category: "therapy",
				isWarranty: true,
			},
			{
				id: "srv-c-2",
				name: "Лечение среднего кариеса",
				code804n: "A16.07.002",
				toothNumber: 47,
				quantity: 1,
				priceRub: 4500,
				category: "therapy",
				isWarranty: false,
			},
		];

		const html = renderToString(
			<PatientBillingModal
				isOpen={true}
				onClose={() => {}}
				patient={{
					id: "pat-102",
					fullName: "Соколова Анна Владимировна",
				}}
				initialServices={initialServices}
			/>,
		);

		// Both items in the multi-item caries group must render warranty buttons
		assert.ok(html.includes("data-testid=\"btn-item-warranty-srv-c-1\""));
		assert.ok(html.includes("data-testid=\"btn-item-warranty-srv-c-2\""));

		// Only srv-c-1 has [ГАРАНТИЯ] badge
		assert.ok(html.includes("data-testid=\"badge-warranty-srv-c-1\""));
		assert.ok(!html.includes("data-testid=\"badge-warranty-srv-c-2\""));
	});

	it("7. Warehouse soft overdraft (Mandate 8e, 8n): zero stock does NOT block write-off, emits warning toast", async () => {
		let emittedToast = "";
		let emittedType = "";

		// Simulate write-off with 0 stock in warehouse (soft overdraft scenario)
		const result = await handleOneClickPackageWriteOff({
			packageId: "anesthesia",
			allowSoftOverdraft: true, // Mandate 8e: soft overdraft enabled
			currentStockMap: {
				art_100k_carpule: 0,
				dental_needle_30g: 0,
				cotton_rolls_sterile: 0,
				antiseptic_alcohol_wipe: 0,
			},
			onToast: (msg, type) => {
				emittedToast = msg;
				emittedType = type;
			},
		});

		// 1. Write-off succeeds (not blocked!)
		assert.equal(result.success, true, "Soft overdraft operation must succeed");
		assert.equal(result.isOverdraft, true, "Overdraft must be detected");
		assert.equal(result.overdraftCount, 4, "All 4 positions are in overdraft");

		// 2. Warning toast emitted instead of blocking error
		assert.equal(emittedType, "warning");
		assert.ok(
			emittedToast.includes("Мягкий овердрафт"),
			`Toast message must mention Мягкий овердрафт, got: ${emittedToast}`,
		);
		assert.ok(
			emittedToast.includes("Операция не заблокирована"),
			`Toast message must confirm operation not blocked, got: ${emittedToast}`,
		);
	});
});
