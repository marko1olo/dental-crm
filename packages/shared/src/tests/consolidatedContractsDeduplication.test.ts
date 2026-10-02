/**
 * packages/shared/src/tests/consolidatedContractsDeduplication.test.ts
 *
 * Exhaustive Inquisitor Unit Tests for Consolidated Contracts, Schemas & Deduplicated SSOT Modules:
 * 1. Patient Models & DTOs (patientSchemas.ts)
 * 2. Schedule & Appointments Lifecycle (appointmentSchemas.ts)
 * 3. Fiscal 54-FZ & FFD 1.2 Harmonized Receipts (fiscalReceiptSchemas.ts)
 * 4. Datetime & Clock Time Helpers (datetime/index.ts)
 * 5. Demo Mode Contracts & Guards (demo/demoConstants.ts)
 * 6. Statutory Document Kinds (documents/documentKind.ts)
 */

import assert from "node:assert";
import { describe, it } from "node:test";
import {
	// Patient
	patientSchema,
	patientStatusSchema,
	patientAdministrativeProfileSchema,
	createPatientSchema,
	updatePatientSchema,
	birthDateInputSchema,
	patientPhoneInputSchema,
	// Schedule
	appointmentSchema,
	appointmentStatusSchema,
	createAppointmentSchema,
	updateAppointmentSchema,
	toBookingSlot,
	// Fiscal
	fiscalReceiptDetailsSchema,
	fiscalCalculationMethodSchema,
	fiscalCalculationSubjectSchema,
	paymentSchema,
	paymentMethodSchema,
	paymentStatusSchema,
	STATUTORY_PAYMENT_METHOD_LABELS_RU,
	normalizePaymentMethod,
	resolveFfd12PaymentTag,
	extendedPaymentMethodSchema,
	// Datetime
	clockTimeSchema,
	clockTimeToMinutes,
	weekdayIndexSchema,
	isValidDateParts,
	isDateLikeString,
	normalizeDateOnlyString,
	isPastOrTodayDateOnlyString,
	// Demo
	DEMO_SHOWCASE_ORG_ID,
	isDemoOrganizationId,
	isDemoEntityId,
	demoModeStateSchema,
	// Documents
	documentKindSchema,
	taxDeductionCertificateMinYear,
} from "../index.js";

describe("Consolidated Contracts & Schemas Deduplication Inquest", () => {
	describe("1. Patient Contracts & Schemas (SSOT)", () => {
		it("validates patientStatusSchema with active and archived", () => {
			assert.strictEqual(patientStatusSchema.parse("active"), "active");
			assert.strictEqual(patientStatusSchema.parse("archived"), "archived");
			assert.throws(() => patientStatusSchema.parse("deleted"));
		});

		it("validates birthDateInputSchema normalization and past-date guard", () => {
			// Normalizes DD.MM.YYYY to YYYY-MM-DD
			const parsed = birthDateInputSchema.parse("15.08.1990");
			assert.strictEqual(parsed, "1990-08-15");

			// Accepts ISO YYYY-MM-DD
			assert.strictEqual(birthDateInputSchema.parse("1985-04-12"), "1985-04-12");

			// Rejects future date
			assert.throws(() => birthDateInputSchema.parse("2099-01-01"));
		});

		it("validates patientPhoneInputSchema digit check", () => {
			assert.strictEqual(patientPhoneInputSchema.parse("+7 (999) 123-45-67"), "+7 (999) 123-45-67");
			// Rejects fewer than 5 digits
			assert.throws(() => patientPhoneInputSchema.parse("123"));
		});

		it("validates full patientSchema with kopecks balance and administrative profile", () => {
			const validPatient = {
				id: "00000000-0000-7000-8000-000000000001",
				organizationId: "00000000-0000-7000-8000-000000000002",
				status: "active" as const,
				fullName: "Иванов Иван Иванович",
				birthDate: "1990-05-20",
				gender: "male" as const,
				phone: "+79991234567",
				email: "ivanov@example.com",
				notes: "Клиническая норма",
				balanceRub: 1500.5, // kopeck exact
				familyGroupId: null,
				administrativeProfile: {
					preferredAppointmentStart: "09:00",
					preferredAppointmentEnd: "18:00",
					preferredAppointmentWeekdays: [1, 2, 3],
				},
				createdAt: "2026-01-01T00:00:00Z",
				updatedAt: "2026-01-01T00:00:00Z",
			};

			const parsed = patientSchema.parse(validPatient);
			assert.strictEqual(parsed.fullName, "Иванов Иван Иванович");
			assert.strictEqual(parsed.balanceRub, 1500.5);
		});

		it("validates createPatientSchema and updatePatientSchema DTOs", () => {
			const createPayload = {
				fullName: "Петров Петр Петрович",
				birthDate: "01.02.1980",
				phone: "+79001112233",
			};
			const parsedCreate = createPatientSchema.parse(createPayload);
			assert.strictEqual(parsedCreate.birthDate, "1980-02-01");

			const updatePayload = {
				notes: "Заметка обновлена",
			};
			const parsedUpdate = updatePatientSchema.parse(updatePayload);
			assert.strictEqual(parsedUpdate.notes, "Заметка обновлена");
		});
	});

	describe("2. Schedule & Appointment Contracts (SSOT)", () => {
		it("validates appointmentStatusSchema supporting arrived, in_treatment, in_progress, etc.", () => {
			const validStatuses = [
				"planned",
				"confirmed",
				"arrived",
				"in_treatment",
				"completed",
				"cancelled",
				"no_show",
			];
			for (const status of validStatuses) {
				assert.strictEqual(appointmentStatusSchema.parse(status), status);
			}
			assert.throws(() => appointmentStatusSchema.parse("invalid_status"));
		});

		it("validates createAppointmentSchema strict ISO datetime and ordering bounds", () => {
			const validAppt = {
				doctorUserId: "00000000-0000-7000-8000-000000000010",
				chairId: "00000000-0000-7000-8000-000000000020",
				startsAt: "2026-10-10T10:00:00+03:00",
				endsAt: "2026-10-10T11:00:00+03:00",
				reason: "Первичный осмотр",
			};
			const parsed = createAppointmentSchema.parse(validAppt);
			assert.strictEqual(parsed.status, "planned");

			// Rejects endsAt earlier than startsAt
			assert.throws(() =>
				createAppointmentSchema.parse({
					...validAppt,
					startsAt: "2026-10-10T11:00:00+03:00",
					endsAt: "2026-10-10T10:00:00+03:00",
				}),
			);
		});

		it("converts FreeBookingSlot to unified BookingSlot via toBookingSlot", () => {
			const slot = toBookingSlot({
				startTime: "2026-10-10T14:30:00+03:00",
				endTime: "2026-10-10T15:15:00+03:00",
				displayTimeRu: "14:30",
				doctorId: "00000000-0000-7000-8000-000000000010",
				slotId: "slot-123",
				branchId: "branch-main",
			});

			assert.strictEqual(slot.time, "14:30");
			assert.strictEqual(slot.period, "afternoon");
			assert.deepStrictEqual(slot.availableDoctorIds, ["00000000-0000-7000-8000-000000000010"]);
			assert.strictEqual(slot.slotId, "slot-123");
		});
	});

	describe("3. Fiscal 54-FZ & FFD 1.2 Harmonization (Zero Drift)", () => {
		it("fiscalCalculationMethodSchema accepts both statutory FFD 1.2 and legacy aliases", () => {
			// Statutory
			assert.strictEqual(fiscalCalculationMethodSchema.parse("full_payment"), "full_payment");
			assert.strictEqual(fiscalCalculationMethodSchema.parse("prepayment"), "prepayment");
			// Legacy aliases
			assert.strictEqual(fiscalCalculationMethodSchema.parse("full_settlement"), "full_settlement");
			assert.strictEqual(fiscalCalculationMethodSchema.parse("partial_prepayment"), "partial_prepayment");
			assert.strictEqual(fiscalCalculationMethodSchema.parse("credit_settlement"), "credit_settlement");
		});

		it("fiscalCalculationSubjectSchema accepts both statutory subjects and legacy aliases", () => {
			// Statutory
			assert.strictEqual(fiscalCalculationSubjectSchema.parse("service"), "service");
			assert.strictEqual(fiscalCalculationSubjectSchema.parse("commodity"), "commodity");
			// Legacy alias
			assert.strictEqual(fiscalCalculationSubjectSchema.parse("goods"), "goods");
		});

		it("validates fiscalReceiptDetailsSchema with harmonized calculation method and subject", () => {
			const receiptWithStatutory = {
				fn: "9999078900012345",
				fd: "12345",
				fpd: "987654321",
				calculationMethod: "full_payment" as const,
				calculationSubject: "service" as const,
			};
			assert.ok(fiscalReceiptDetailsSchema.parse(receiptWithStatutory));

			const receiptWithLegacy = {
				calculationMethod: "full_settlement" as const,
				calculationSubject: "goods" as const,
			};
			assert.ok(fiscalReceiptDetailsSchema.parse(receiptWithLegacy));
		});

		it("validates paymentSchema with kopecks amount and receipt", () => {
			const payment = {
				id: "00000000-0000-7000-8000-000000000001",
				organizationId: "00000000-0000-7000-8000-000000000002",
				patientId: "00000000-0000-7000-8000-000000000003",
				visitId: null,
				documentId: null,
				amountRub: 2750.25,
				method: "card" as const,
				status: "paid" as const,
				paidAt: "2026-10-01T12:00:00Z",
				createdAt: "2026-10-01T12:00:00Z",
				fiscalReceipt: {
					fn: "9999078900012345",
					fd: "54321",
					fpd: "11223344",
					calculationMethod: "full_payment" as const,
					calculationSubject: "service" as const,
				},
				note: "Оплата картой",
			};
			const parsed = paymentSchema.parse(payment);
			assert.strictEqual(parsed.amountRub, 2750.25);
			assert.strictEqual(parsed.status, "paid");
		});

		it("normalizes diverse UI/API payment aliases to canonical statutory PaymentMethod", () => {
			assert.strictEqual(normalizePaymentMethod("cash"), "cash");
			assert.strictEqual(normalizePaymentMethod("нал"), "cash");
			assert.strictEqual(normalizePaymentMethod("наличные"), "cash");

			assert.strictEqual(normalizePaymentMethod("card"), "card");
			assert.strictEqual(normalizePaymentMethod("bank_card"), "card");
			assert.strictEqual(normalizePaymentMethod("card_terminal"), "card");
			assert.strictEqual(normalizePaymentMethod("карта"), "card");
			assert.strictEqual(normalizePaymentMethod("терминал"), "card");

			assert.strictEqual(normalizePaymentMethod("online"), "online");
			assert.strictEqual(normalizePaymentMethod("sbp"), "online");
			assert.strictEqual(normalizePaymentMethod("sbp_qr"), "online");
			assert.strictEqual(normalizePaymentMethod("sberpay_qr"), "online");
			assert.strictEqual(normalizePaymentMethod("сбп"), "online");

			assert.strictEqual(normalizePaymentMethod("bank_transfer"), "bank_transfer");
			assert.strictEqual(normalizePaymentMethod("bank_invoice"), "bank_transfer");

			assert.strictEqual(normalizePaymentMethod("family_wallet"), "family_wallet");
			assert.strictEqual(normalizePaymentMethod("family_balance"), "family_wallet");
			assert.strictEqual(normalizePaymentMethod("family_deposit"), "family_wallet");
			assert.strictEqual(normalizePaymentMethod("patient_deposit"), "family_wallet");
			assert.strictEqual(normalizePaymentMethod("advance_deposit"), "family_wallet");
			assert.strictEqual(normalizePaymentMethod("депозит"), "family_wallet");

			assert.strictEqual(normalizePaymentMethod("insurance"), "insurance");
			assert.strictEqual(normalizePaymentMethod("dms_insurance"), "insurance");
			assert.strictEqual(normalizePaymentMethod("дмс"), "insurance");

			assert.strictEqual(normalizePaymentMethod(null), "cash");
			assert.strictEqual(normalizePaymentMethod(""), "cash");
			assert.strictEqual(normalizePaymentMethod("unknown_crypto"), "other");
		});

		it("resolves exact statutory FFD 1.2 tags for all payment aliases", () => {
			// Tag 1031 (Cash)
			assert.strictEqual(resolveFfd12PaymentTag("cash"), 1031);
			assert.strictEqual(resolveFfd12PaymentTag("наличные"), 1031);

			// Tag 1081 (Electronic / Acquiring / SBP)
			assert.strictEqual(resolveFfd12PaymentTag("card"), 1081);
			assert.strictEqual(resolveFfd12PaymentTag("bank_card"), 1081);
			assert.strictEqual(resolveFfd12PaymentTag("card_terminal"), 1081);
			assert.strictEqual(resolveFfd12PaymentTag("sbp_qr"), 1081);
			assert.strictEqual(resolveFfd12PaymentTag("online"), 1081);

			// Tag 1215 (Advance offset / Prepayment / Deposit)
			assert.strictEqual(resolveFfd12PaymentTag("family_wallet"), 1215);
			assert.strictEqual(resolveFfd12PaymentTag("patient_deposit"), 1215);
			assert.strictEqual(resolveFfd12PaymentTag("advance_deposit"), 1215);
			assert.strictEqual(resolveFfd12PaymentTag("депозит"), 1215);

			// Tag 1216 (Postpayment / Credit)
			assert.strictEqual(resolveFfd12PaymentTag("credit"), 1216);

			// Tag 1217 (Counter provision / Certificate / DMS)
			assert.strictEqual(resolveFfd12PaymentTag("dms_insurance"), 1217);
			assert.strictEqual(resolveFfd12PaymentTag("certificate_or_bonus"), 1217);
			assert.strictEqual(resolveFfd12PaymentTag("loyalty_points"), 1217);
		});

		it("verifies statutory Russian labels contain FFD 1.2 tag codes", () => {
			assert.ok(STATUTORY_PAYMENT_METHOD_LABELS_RU.cash.includes("1031"));
			assert.ok(STATUTORY_PAYMENT_METHOD_LABELS_RU.card.includes("1081"));
			assert.ok(STATUTORY_PAYMENT_METHOD_LABELS_RU.online.includes("1081"));
			assert.ok(STATUTORY_PAYMENT_METHOD_LABELS_RU.family_wallet.includes("1215"));
		});

		it("validates extendedPaymentMethodSchema with split and mixed modes", () => {
			assert.strictEqual(extendedPaymentMethodSchema.parse("cash"), "cash");
			assert.strictEqual(extendedPaymentMethodSchema.parse("card"), "card");
			assert.strictEqual(extendedPaymentMethodSchema.parse("split"), "split");
			assert.strictEqual(extendedPaymentMethodSchema.parse("mixed"), "mixed");
			assert.strictEqual(extendedPaymentMethodSchema.parse("deposit"), "deposit");
		});
	});

	describe("4. Datetime Helpers & Validation", () => {
		it("converts clock times to minutes correctly", () => {
			assert.strictEqual(clockTimeToMinutes("00:00"), 0);
			assert.strictEqual(clockTimeToMinutes("09:30"), 570);
			assert.strictEqual(clockTimeToMinutes("18:45"), 1125);
			assert.strictEqual(clockTimeToMinutes("23:59"), 1439);
		});

		it("validates clockTimeSchema regex format", () => {
			assert.strictEqual(clockTimeSchema.parse("09:00"), "09:00");
			assert.strictEqual(clockTimeSchema.parse("23:59"), "23:59");
			assert.throws(() => clockTimeSchema.parse("24:00"));
			assert.throws(() => clockTimeSchema.parse("9:00"));
		});

		it("validates isDateLikeString for ISO and Russian formats", () => {
			assert.strictEqual(isDateLikeString("2026-10-02"), true);
			assert.strictEqual(isDateLikeString("2026-10-02T15:30:00Z"), true);
			assert.strictEqual(isDateLikeString("02.10.2026"), true);
			assert.strictEqual(isDateLikeString("02.10.2026, 15:30"), true);
			assert.strictEqual(isDateLikeString("not-a-date"), false);
		});
	});

	describe("5. Demo Mode Identifiers & Contracts", () => {
		it("identifies demo organization ID and entity IDs", () => {
			assert.strictEqual(isDemoOrganizationId(DEMO_SHOWCASE_ORG_ID), true);
			assert.strictEqual(isDemoOrganizationId("00000000-0000-7000-8000-000000000001"), false);

			assert.strictEqual(isDemoEntityId("01a00000-0000-0000-0002-000000000001"), true);
			assert.strictEqual(isDemoEntityId("12345678-0000-0000-0000-000000000000"), false);
		});

		it("validates demoModeStateSchema", () => {
			const state = demoModeStateSchema.parse({
				isDemoMode: true,
				organizationId: DEMO_SHOWCASE_ORG_ID,
			});
			assert.strictEqual(state.isDemoMode, true);
		});
	});

	describe("6. Statutory Medical Document Kinds", () => {
		it("validates documentKindSchema and statutory year constants", () => {
			assert.strictEqual(documentKindSchema.parse("dental_medical_card_043u"), "dental_medical_card_043u");
			assert.strictEqual(documentKindSchema.parse("orthodontic_medical_card_043_1u"), "orthodontic_medical_card_043_1u");
			assert.strictEqual(taxDeductionCertificateMinYear, 2024);
		});
	});
});
