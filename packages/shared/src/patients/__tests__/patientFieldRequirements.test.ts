import assert from "node:assert/strict";
import test from "node:test";
import {
	DEFAULT_PATIENT_FIELD_REQUIREMENTS,
	PATIENT_FIELD_REQUIREMENTS_STORAGE_KEY,
	patientFieldRequirementsSchema,
	paymentRefundCorrectionActionSchema,
	paymentRefundCorrectionMethodSchema,
	PAYMENT_REFUND_CORRECTION_ACTIONS,
	PAYMENT_REFUND_CORRECTION_METHODS,
	clinicalTaskStatusSchema,
	communicationDirectionSchema,
	communicationConsentScopeSchema,
	communicationConsentStateSchema,
	communicationOutboxStatusSchema,
	denteTelegramWebhookStatusSchema,
	documentStatusSchema,
	imagingStudyStatusSchema,
	treatmentPlanStatusSchema,
	ledgerPaymentMethodSchema,
	egiszOutboxStatusSchema,
} from "../../index.js";

test("patientFieldRequirementsSchema enforces defaults and accepts partial overrides", () => {
	const defaultResult = patientFieldRequirementsSchema.parse({});
	assert.deepEqual(defaultResult, DEFAULT_PATIENT_FIELD_REQUIREMENTS);
	assert.strictEqual(defaultResult.requirePhone, true);
	assert.strictEqual(defaultResult.requireAdvertisingSource, false);
	assert.strictEqual(defaultResult.requireSnils, false);
	assert.strictEqual(defaultResult.requireBirthDate, false);
	assert.strictEqual(defaultResult.requireIdentityDocument, false);

	const customized = patientFieldRequirementsSchema.parse({
		requireAdvertisingSource: true,
		requireSnils: true,
	});
	assert.strictEqual(customized.requirePhone, true);
	assert.strictEqual(customized.requireAdvertisingSource, true);
	assert.strictEqual(customized.requireSnils, true);
	assert.strictEqual(customized.requireBirthDate, false);
	assert.strictEqual(customized.requireIdentityDocument, false);

	assert.strictEqual(
		PATIENT_FIELD_REQUIREMENTS_STORAGE_KEY,
		"dental_crm_patient_field_requirements_v1",
	);
});

test("paymentRefundCorrection schemas match canonical options", () => {
	assert.deepEqual(
		paymentRefundCorrectionActionSchema.options,
		PAYMENT_REFUND_CORRECTION_ACTIONS,
	);
	assert.deepEqual(
		paymentRefundCorrectionMethodSchema.options,
		PAYMENT_REFUND_CORRECTION_METHODS,
	);
	assert.ok(paymentRefundCorrectionActionSchema.options.includes("full_refund"));
	assert.ok(paymentRefundCorrectionMethodSchema.options.includes("card"));
});

test("newly centralized database enum schemas validate authentic domain values", () => {
	assert.strictEqual(communicationDirectionSchema.parse("inbound"), "inbound");
	assert.strictEqual(communicationConsentScopeSchema.parse("service"), "service");
	assert.strictEqual(communicationConsentStateSchema.parse("granted"), "granted");
	assert.strictEqual(communicationOutboxStatusSchema.parse("queued"), "queued");
	assert.strictEqual(denteTelegramWebhookStatusSchema.parse("processing"), "processing");
	assert.strictEqual(documentStatusSchema.parse("draft"), "draft");
	assert.strictEqual(imagingStudyStatusSchema.parse("available"), "available");
	assert.strictEqual(treatmentPlanStatusSchema.parse("Active"), "Active");
	assert.strictEqual(ledgerPaymentMethodSchema.parse("installment_balance"), "installment_balance");
	assert.strictEqual(clinicalTaskStatusSchema.parse("in_progress"), "in_progress");
	assert.strictEqual(egiszOutboxStatusSchema.parse("registered_in_remd"), "registered_in_remd");
});
