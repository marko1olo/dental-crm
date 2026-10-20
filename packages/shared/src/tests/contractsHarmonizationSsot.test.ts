import assert from "node:assert";
import { describe, it } from "node:test";
import {
	CANONICAL_TOOTH_STATES,
	CANONICAL_TOOTH_STATUS_ALIASES,
	isCanonicalToothState,
	toCanonicalToothState,
	LEGACY_CLINICAL_TOOTH_STATUSES,
} from "../clinical/dentalFormulaStates.js";
import {
	INVOICE_STATUS_VALUES,
	invoiceStatusSchema,
	invoiceItemSchema,
	invoiceSchema,
	normalizeInvoiceStatus,
	resolveInvoiceTotalAmountRub,
	normalizeInvoiceItem,
} from "../billing/invoiceContract.js";

describe("Red Team Contract Harmonization & SSOT Suite", () => {
	describe("1. ToothStatus SSOT (CANONICAL_TOOTH_STATES)", () => {
		it("declares exactly 12 canonical tooth states", () => {
			assert.strictEqual(CANONICAL_TOOTH_STATES.length, 12);
			assert.deepStrictEqual(
				[...CANONICAL_TOOTH_STATES],
				[
					"Healthy",
					"Caries",
					"Pulpitis",
					"Periodontitis",
					"Filled",
					"Crown",
					"Planned_Crown",
					"Implant",
					"Planned_Implant",
					"Missing",
					"Retained",
					"Root",
				],
			);
		});

		it("isCanonicalToothState validates canonical states", () => {
			for (const state of CANONICAL_TOOTH_STATES) {
				assert.strictEqual(isCanonicalToothState(state), true);
			}
			assert.strictEqual(isCanonicalToothState("unknown"), false);
			assert.strictEqual(isCanonicalToothState(null), false);
			assert.strictEqual(isCanonicalToothState(42), false);
		});

		it("toCanonicalToothState normalizes legacy lowercase tokens to canonical state", () => {
			assert.strictEqual(toCanonicalToothState("sound"), "Healthy");
			assert.strictEqual(toCanonicalToothState("watch"), "Caries");
			assert.strictEqual(toCanonicalToothState("caries"), "Caries");
			assert.strictEqual(toCanonicalToothState("pulpitis_periodontitis"), "Pulpitis");
			assert.strictEqual(toCanonicalToothState("periodontal"), "Periodontitis");
			assert.strictEqual(toCanonicalToothState("filled"), "Filled");
			assert.strictEqual(toCanonicalToothState("completed"), "Filled");
			assert.strictEqual(toCanonicalToothState("prosthetic"), "Crown");
			assert.strictEqual(toCanonicalToothState("crown"), "Crown");
			assert.strictEqual(toCanonicalToothState("implant"), "Implant");
			assert.strictEqual(toCanonicalToothState("planned_implant"), "Planned_Implant");
			assert.strictEqual(toCanonicalToothState("missing"), "Missing");
			assert.strictEqual(toCanonicalToothState("extraction"), "Missing");
			assert.strictEqual(toCanonicalToothState("retained"), "Retained");
			assert.strictEqual(toCanonicalToothState("root"), "Root");
		});

		it("toCanonicalToothState normalizes portal and Russian clinical terms", () => {
			assert.strictEqual(toCanonicalToothState("здоров"), "Healthy");
			assert.strictEqual(toCanonicalToothState("интактный"), "Healthy");
			assert.strictEqual(toCanonicalToothState("кариес"), "Caries");
			assert.strictEqual(toCanonicalToothState("пульпит"), "Pulpitis");
			assert.strictEqual(toCanonicalToothState("периодонтит"), "Periodontitis");
			assert.strictEqual(toCanonicalToothState("пломба"), "Filled");
			assert.strictEqual(toCanonicalToothState("коронка"), "Crown");
			assert.strictEqual(toCanonicalToothState("имплантат"), "Implant");
			assert.strictEqual(toCanonicalToothState("удален"), "Missing");
			assert.strictEqual(toCanonicalToothState("ретинированный"), "Retained");
			assert.strictEqual(toCanonicalToothState("разрушенный корень"), "Root");
			assert.strictEqual(toCanonicalToothState("in_treatment"), "Pulpitis");
			assert.strictEqual(toCanonicalToothState("needs_treatment"), "Caries");
			assert.strictEqual(toCanonicalToothState("missing_or_implant"), "Missing");
		});

		it("all legacy clinical tooth statuses are supported", () => {
			for (const legacy of LEGACY_CLINICAL_TOOTH_STATUSES) {
				const canonical = toCanonicalToothState(legacy);
				assert.strictEqual(isCanonicalToothState(canonical), true);
			}
		});
	});

	describe("2. Central Invoice Contract (Invoice SSOT)", () => {
		it("declares canonical invoice statuses", () => {
			assert.deepStrictEqual([...INVOICE_STATUS_VALUES], [
				"draft",
				"issued",
				"partially_paid",
				"paid",
				"cancelled",
			]);
		});

		it("resolves canonical totalAmountRub without precision drift or zero loss", () => {
			// When totalAmountRub is provided
			assert.strictEqual(
				resolveInvoiceTotalAmountRub({ totalAmountRub: 15400.5 }),
				15400.5,
			);
			// String numeric from PostgreSQL
			assert.strictEqual(
				resolveInvoiceTotalAmountRub({ totalAmountRub: "15400.50" }),
				15400.5,
			);
			// Fallback to legacy totalRub
			assert.strictEqual(
				resolveInvoiceTotalAmountRub({ totalRub: "8500.00" }),
				8500,
			);
			// Fallback to subtotal minus discount
			assert.strictEqual(
				resolveInvoiceTotalAmountRub({ subtotalRub: 10000, discountRub: 1500 }),
				8500,
			);
		});

		it("normalizes invoice statuses across Russian and English tokens", () => {
			assert.strictEqual(normalizeInvoiceStatus("paid"), "paid");
			assert.strictEqual(normalizeInvoiceStatus("оплачен"), "paid");
			assert.strictEqual(normalizeInvoiceStatus("partial"), "partially_paid");
			assert.strictEqual(normalizeInvoiceStatus("partially_paid"), "partially_paid");
			assert.strictEqual(normalizeInvoiceStatus("cancelled"), "cancelled");
			assert.strictEqual(normalizeInvoiceStatus("отменен"), "cancelled");
			assert.strictEqual(normalizeInvoiceStatus("draft"), "draft");
			assert.strictEqual(normalizeInvoiceStatus("issued"), "issued");
			// Auto status from paid/total amounts
			assert.strictEqual(normalizeInvoiceStatus("issued", 5000, 5000), "paid");
			assert.strictEqual(normalizeInvoiceStatus("issued", 5000, 2000), "partially_paid");
		});

		it("validates invoice item and invoice schema", () => {
			const rawItem = {
				id: "item-1",
				serviceCode: "A16.07.002",
				name: "Лечение кариеса",
				quantity: 1,
				unitPriceRub: 4500,
				totalRub: 4500,
			};
			const parsedItem = invoiceItemSchema.safeParse(rawItem);
			assert.strictEqual(parsedItem.success, true);

			const validInvoice = {
				id: "inv-001",
				organizationId: "org-001",
				patientId: "pat-001",
				visitId: "vis-001",
				status: "issued",
				totalAmountRub: 4500,
				paidAmountRub: 0,
				items: [rawItem],
				createdAt: new Date().toISOString(),
			};
			const parsedInvoice = invoiceSchema.safeParse(validInvoice);
			assert.strictEqual(parsedInvoice.success, true);
		});

		it("normalizeInvoiceItem correctly builds canonical InvoiceItem", () => {
			const normalized = normalizeInvoiceItem({
				serviceId: "srv-99",
				serviceCode: "A16.07.004",
				serviceName: "Металлокерамическая коронка",
				toothNumber: 16,
				quantity: 2,
				priceRub: 12000,
			});
			assert.strictEqual(normalized.serviceId, "srv-99");
			assert.strictEqual(normalized.serviceCode, "A16.07.004");
			assert.strictEqual(normalized.name, "Металлокерамическая коронка");
			assert.strictEqual(normalized.toothNumber, "16");
			assert.strictEqual(normalized.quantity, 2);
			assert.strictEqual(normalized.unitPriceRub, 12000);
			assert.strictEqual(normalized.totalRub, 24000);
			assert.strictEqual(normalized.totalAmountRub, 24000);
		});
	});
});
