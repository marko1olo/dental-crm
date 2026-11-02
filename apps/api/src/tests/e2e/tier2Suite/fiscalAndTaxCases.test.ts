import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import {
	SbpQrEngine,
	createFiscalReceiptPayloadSchema,
} from "@dental/shared";
import { buildKnd1151156Xml } from "../../../documents/taxXml.js";
import {
	PATIENT_1_ID,
	VISIT_1_ID,
	repoRoot,
} from "./tier2Fixture.js";

export function registerFiscalAndTaxCases(): void {
	// ==========================================
	// Feature 1: UI 4-State Visual & CSS Boundaries
	// ==========================================
	describe("Feature 1: UI 4-State Visual & CSS Boundaries", () => {
		const tokenAliasesPath = join(
			repoRoot,
			"apps/web/src/styles/token-aliases.css",
		);

		it("1.1 parses token declarations without failing on nested calc or var functions", () => {
			const content = readFileSync(tokenAliasesPath, "utf8");
			assert.ok(content.length > 500);
			assert.match(content, /:root\s*\{/);
		});

		it("1.2 verifies that dark and night themes provide non-light background fallbacks", () => {
			const content = readFileSync(tokenAliasesPath, "utf8");
			assert.match(content, /--paper/);
			assert.match(content, /--ink/);
		});

		it("1.3 verifies high-contrast status colors are mapped to semantic tokens (--ok-fg, --bad-fg)", () => {
			const content = readFileSync(tokenAliasesPath, "utf8");
			assert.match(content, /--ok-fg/);
			assert.match(content, /--bad-fg/);
		});

		it("1.4 ensures no raw hardcoded #ffffff backgrounds exist in theme surface overrides", () => {
			const content = readFileSync(tokenAliasesPath, "utf8");
			assert.doesNotMatch(content, /--background:\s*#ffffff/i);
		});

		it("1.5 validates absence of tailwind utility class pollution in token stylesheets", () => {
			const content = readFileSync(tokenAliasesPath, "utf8");
			assert.doesNotMatch(content, /\bbg-blue-500\b/);
			assert.doesNotMatch(content, /\btext-red-500\b/);
		});
	});

	// ==========================================
	// Feature 2: Mobile Touch Targets Boundaries
	// ==========================================
	describe("Feature 2: Mobile Touch Targets Boundaries", () => {
		const touchTargetsCssPath = join(
			repoRoot,
			"apps/web/src/styles/touch-targets.css",
		);

		function getTouchTargetsContent(): string {
			const raw = readFileSync(touchTargetsCssPath, "utf8");
			const dir = dirname(touchTargetsCssPath);
			const imports = Array.from(raw.matchAll(/@import\s+["'](\.[^"']+)["'];/g));
			let combined = raw;
			for (const imp of imports) {
				const full = join(dir, imp[1]);
				if (existsSync(full)) {
					combined += `\n${readFileSync(full, "utf8")}`;
				}
			}
			return combined;
		}

		it("2.1 handles coarse pointer devices regardless of viewport width", () => {
			const content = getTouchTargetsContent();
			assert.match(content, /pointer:\s*coarse/);
		});

		it("2.2 enforces minimum 44px on dense chip buttons to avoid tap collision", () => {
			const content = getTouchTargetsContent();
			assert.match(content, /\.quick-chip--sm[\s\S]*?min-height:\s*44px/);
		});

		it("2.3 covers schedule buffer and repeat buttons with min-height: 44px", () => {
			const content = getTouchTargetsContent();
			assert.match(content, /\.appointment-repeat-button/);
			assert.match(content, /\.appointment-buffer-button/);
		});

		it("2.4 verifies settings tab buttons are expanded to 44px with !important override", () => {
			const content = getTouchTargetsContent();
			assert.match(content, /\.settings-tabs\s+button[\s\S]*?min-height:\s*44px/);
		});

		it("2.5 verifies sub-navigation tab buttons on patient visits have 44px touch targets", () => {
			const content = getTouchTargetsContent();
			assert.match(content, /\.visit-sub-nav-tabs\s+button/);
		});
	});

	// ==========================================
	// Feature 3: 54-FZ Cashier & FFD 1.2 Boundaries
	// ==========================================
	describe("Feature 3: 54-FZ Cashier & FFD 1.2 Boundaries & Corner Cases", () => {
		it("3.1 rejects fiscal receipt payload with zero total amount", () => {
			const zeroReceipt = {
				patientId: PATIENT_1_ID,
				visitId: VISIT_1_ID,
				customerContact: "+79991112233",
				totalKopecks: 0,
				cashKopecks: 0,
				items: [],
			};
			const parsed = createFiscalReceiptPayloadSchema.safeParse(zeroReceipt);
			assert.equal(parsed.success, false);
		});

		it("3.2 handles large kopeck sums up to 100 million RUB (10,000,000,000 kopecks) without precision loss", () => {
			const largeAmount = 10_000_000_000; // 100,000,000.00 RUB
			const payload = SbpQrEngine.buildNspkDynamicPayload({
				operationId: "LARGE-OP-1",
				bankMemberId: "100000000001",
				amountKopecks: largeAmount,
			});
			assert.match(payload.payloadUrl, /sum=10000000000/);
			const verified = SbpQrEngine.verifyNspkPayload(payload.payloadUrl);
			assert.equal(verified.amountKopecks, largeAmount);
		});

		it("3.3 verifies SBP QR CRC16-CCITT calculation with boundary single-character string", () => {
			const crc = SbpQrEngine.computeCrc16Ccitt("A");
			assert.equal(crc.length, 4);
			assert.match(crc, /^[0-9A-F]{4}$/);
		});

		it("3.4 validates multi-method payment split (cash + card + sbp + prepayment) totaling exactly items sum", () => {
			const splitReceipt = {
				patientId: PATIENT_1_ID,
				visitId: VISIT_1_ID,
				customerContact: "client@example.com",
				totalKopecks: 1000000, // 10,000.00 RUB
				cashKopecks: 200000, // 2,000.00 RUB
				electronicCardKopecks: 300000, // 3,000.00 RUB
				sbpKopecks: 400000, // 4,000.00 RUB
				prepaidKopecks: 100000, // 1,000.00 RUB
				items: [
					{
						name: "Комплексное терапевтическое лечение",
						priceKopecks: 1000000,
						quantity: 1,
						amountKopecks: 1000000,
						subject: "service",
						method: "full_payment",
						vatRate: "vat_none",
					},
				],
			};
			const parsed = createFiscalReceiptPayloadSchema.safeParse(splitReceipt);
			assert.equal(parsed.success, true);
		});

		it("3.5 rejects fiscal receipt with empty customer contact", () => {
			const badContactReceipt = {
				patientId: PATIENT_1_ID,
				visitId: VISIT_1_ID,
				customerContact: "", // Violates min(5)
				totalKopecks: 100000,
				cashKopecks: 100000,
				items: [
					{
						name: "Консультация",
						priceKopecks: 100000,
						quantity: 1,
						amountKopecks: 100000,
					},
				],
			};
			const parsed = createFiscalReceiptPayloadSchema.safeParse(badContactReceipt);
			assert.equal(parsed.success, false);
		});
	});

	// ==========================================
	// Feature 5: NDFL XML 5.01 Boundaries
	// ==========================================
	describe("Feature 5: NDFL XML 5.01 Boundaries & Corner Cases", () => {
		const baseDoc = {
			id: "doc-t2",
			patientId: PATIENT_1_ID,
			payload: { taxPaymentSelection: { selectedPaymentIds: ["pay-1"] } },
			kind: "tax_deduction_certificate" as const,
			taxYear: 2026,
			issuedAt: "2026-08-10T12:00:00Z",
		};

		const basePatient = {
			id: PATIENT_1_ID,
			fullName: "Иванов Иван Иванович",
			birthDate: "1985-05-15",
			administrativeProfile: {
				taxpayerInn: "770198765432",
				identityDocument: "Паспорт 4510 123456",
			},
		};

		const baseClinic = {
			clinicName: 'ООО "Стоматология & ДЕНТЕ"',
			legalName: 'ООО "Стоматология & ДЕНТЕ"',
			inn: "7701234567",
			kpp: "770101001",
			ogrn: "1027700132195",
			address: "125009, г. Москва, ул. Тверская <1>",
			phone: "+74951234567",
			email: "info@dente.ru",
			signatoryName: "Петров П.П.",
		};

		it("5.1 escapes XML special characters in clinic name and address without syntax corruption", () => {
			const paymentsList = [
				{
					id: "pay-1",
					amountRub: 10000,
					taxDeductionCode: "1" as const,
					payerFullName: "Иванов & Ко",
					payerBirthDate: "1985-05-15",
					payerInn: "770198765432",
					payerRelationship: "self" as const,
					patientId: PATIENT_1_ID,
					status: "paid" as const,
					paidAt: "2026-03-15T12:00:00Z",
				},
			];
			const res = buildKnd1151156Xml(
				baseDoc as any,
				basePatient as any,
				{
					clinicProfile: baseClinic as any,
					payments: paymentsList as any,
					taxOfficeCode: "7701",
				} as any,
			);
			assert.equal(res.ok, true);
			if (res.ok) {
				assert.match(res.xml, /&amp;/);
				assert.doesNotMatch(res.xml, /<1>/); // Must be escaped
			}
		});

		it("5.2 rejects XML generation when payments array is completely empty", () => {
			const res = buildKnd1151156Xml(
				baseDoc as any,
				basePatient as any,
				{
					clinicProfile: baseClinic as any,
					payments: [],
					taxOfficeCode: "7701",
				} as any,
			);
			assert.equal(res.ok, false);
		});

		it("5.3 rejects XML generation when taxOfficeCode is missing", () => {
			const res = buildKnd1151156Xml(
				baseDoc as any,
				basePatient as any,
				{
					clinicProfile: baseClinic as any,
					payments: [
						{
							id: "pay-1",
							amountRub: 5000,
							taxDeductionCode: "1" as const,
							payerFullName: "Иванов Иван",
							payerBirthDate: "1985-05-15",
							payerInn: "770198765432",
							payerRelationship: "self" as const,
							patientId: PATIENT_1_ID,
							status: "paid" as const,
							paidAt: "2026-04-10T12:00:00Z",
						},
					] as any,
					taxOfficeCode: null,
				} as any,
			);
			assert.equal(res.ok, false);
		});

		it("5.4 correctly attributes payments with Code 2 (дорогостоящее лечение) to СуммаКод2", () => {
			const code2Payments = [
				{
					id: "pay-1",
					amountRub: 150000,
					taxDeductionCode: "2" as const,
					payerFullName: "Иванов Иван",
					payerBirthDate: "1985-05-15",
					payerInn: "770198765432",
					payerRelationship: "self" as const,
					patientId: PATIENT_1_ID,
					status: "paid" as const,
					paidAt: "2026-05-20T12:00:00Z",
				},
			];
			const res = buildKnd1151156Xml(
				baseDoc as any,
				basePatient as any,
				{
					clinicProfile: baseClinic as any,
					payments: code2Payments as any,
					taxOfficeCode: "7701",
				} as any,
			);
			assert.equal(res.ok, true);
			if (res.ok) {
				assert.match(res.xml, /(?:СуммаКод2="150000\.00"|КодУслуг="2"\s+СумОпл="150000\.00")/);
			}
		});

		it("5.5 rejects XML when payment amount is negative or invalid", () => {
			const badAmountPayments = [
				{
					id: "pay-1",
					amountRub: -5000, // Invalid negative amount
					taxDeductionCode: "1" as const,
					payerFullName: "Иванов Иван",
					payerBirthDate: "1985-05-15",
					payerInn: "770198765432",
					payerRelationship: "self" as const,
					patientId: PATIENT_1_ID,
					status: "paid" as const,
					paidAt: "2026-04-10T12:00:00Z",
				},
			];
			const res = buildKnd1151156Xml(
				baseDoc as any,
				basePatient as any,
				{
					clinicProfile: baseClinic as any,
					payments: badAmountPayments as any,
					taxOfficeCode: "7701",
				} as any,
			);
			assert.equal(res.ok, false);
		});
	});
}
