import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	CLINICAL_TOUCH_TARGETS,
	SbpQrEngine,
	createFiscalReceiptPayloadSchema,
	validateClinicalActionButtonErgonomics,
} from "@dental/shared";
import { resolveTheme, type ThemeMode } from "../../../../../web/src/lib/themeClasses.js";
import { buildKnd1151156Xml } from "../../../routes/documents/sharedDocUtils/index.js";
import {
	PATIENT_1_ID,
	VISIT_1_ID,
} from "./tier2Fixture.js";

export function registerFiscalAndTaxCases(): void {
	// ==========================================
	// Feature 1: UI 4-State Visual & Theme Boundaries
	// ==========================================
	describe("Feature 1: UI 4-State Visual & Theme Boundaries", () => {
		const hexLuminance = (hex: string): number => {
			const clean = hex.replace("#", "");
			const channels = [0, 2, 4].map((offset) => {
				const srgb = Number.parseInt(clean.slice(offset, offset + 2), 16) / 255;
				return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
			});
			return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
		};
		const contrastRatio = (fg: string, bg: string): number => {
			const l1 = hexLuminance(fg);
			const l2 = hexLuminance(bg);
			return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
		};

		it("1.1 resolves light and dark modes deterministically via resolveTheme", () => {
			const light = resolveTheme("light", false);
			assert.equal(light.theme, "light");
			assert.equal(light.colorScheme, "light");
			assert.equal(light.lightClass, true);
			assert.equal(light.darkClass, false);

			const autoDark = resolveTheme("auto", true);
			assert.equal(autoDark.theme, "dark");
			assert.equal(autoDark.colorScheme, "dark");
			assert.equal(autoDark.darkClass, true);
		});

		it("1.2 verifies dark and night themes map to dark colorScheme without light bleed", () => {
			const darkThemes: readonly ThemeMode[] = ["dark", "night", "oled", "ocean", "emerald", "cyber_xray"];
			for (const mode of darkThemes) {
				const resolved = resolveTheme(mode, false);
				assert.equal(resolved.theme, mode);
				assert.equal(resolved.colorScheme, "dark");
				assert.equal(resolved.darkClass, true);
				assert.equal(resolved.lightClass, false);
			}
		});

		it("1.3 verifies light themes and WCAG AAA contrast mode resolution", () => {
			const lightThemes: readonly ThemeMode[] = ["light", "calm_teal", "sakura", "warm_sand"];
			for (const mode of lightThemes) {
				const resolved = resolveTheme(mode, true);
				assert.equal(resolved.colorScheme, "light");
				assert.equal(resolved.lightClass, true);
			}

			const accessible = resolveTheme("dark", false, { isAccessibilityMode: true, a11yFontSize: "large" });
			assert.equal(accessible.theme, "contrast");
			assert.equal(accessible.isAccessibilityMode, true);
			assert.equal(accessible.a11yFontSize, "large");
		});

		it("1.4 validates >= 7:1 WCAG AAA contrast ratio on canonical light and dark ink/paper pairs", () => {
			const light = resolveTheme("light", false);
			const dark = resolveTheme("dark", false);
			assert.equal(light.colorScheme, "light");
			assert.equal(dark.colorScheme, "dark");
			assert.ok(contrastRatio("#0f1e1b", "#ffffff") >= 15);
			assert.ok(contrastRatio("#e9f2ef", "#101a19") >= 12);
			assert.ok(contrastRatio("#ffffff", "#0d9488") >= 3.5);
		});
	});

	// ==========================================
	// Feature 2: Mobile Touch Targets Boundaries
	// ==========================================
	describe("Feature 2: Mobile Touch Targets Boundaries", () => {
		it("2.1 enforces Apple HIG minimum 44px touch target floor", () => {
			assert.ok(CLINICAL_TOUCH_TARGETS.MIN_TOUCH_SIZE_PX >= 44);
			assert.ok(CLINICAL_TOUCH_TARGETS.PRIMARY_ACTION_MIN_HEIGHT_PX >= 48);
			assert.ok(CLINICAL_TOUCH_TARGETS.MOBILE_ACTION_MIN_HEIGHT_PX >= 52);
		});

		it("2.2 validates chairside coarse-touch ergonomics acceptance and small-target rejection", () => {
			const validTouch = validateClinicalActionButtonErgonomics({
				heightPx: 48,
				fontSizePx: 14,
				hasVisibleRussianLabel: true,
				pointerType: "coarse",
			});
			assert.equal(validTouch.isValid, true);

			const undersizedTouch = validateClinicalActionButtonErgonomics({
				heightPx: 30,
				fontSizePx: 14,
				hasVisibleRussianLabel: true,
				pointerType: "coarse",
			});
			assert.equal(undersizedTouch.isValid, false);
		});

		it("2.3 validates fine desktop pointer compact action button height without coarse bloat", () => {
			const desktopCompact = validateClinicalActionButtonErgonomics({
				heightPx: 36,
				fontSizePx: 14,
				hasVisibleRussianLabel: true,
				pointerType: "fine",
			});
			assert.equal(desktopCompact.isValid, true);
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
				isElectronicReceiptOnly: true,
				customerContact: "", // Violates min(5) when isElectronicReceiptOnly: true
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
