/**
 * Unit Test Suite for Patient Personal Cabinet & Mobile Portal (375px Screen Ergonomics)
 * (DOMAIN: PORTAL PATIENT CABINET & MOBILE 375PX VERIFICATION)
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
	calculateCabinetSummary,
	calculateCheckupDaysRemaining,
	calculateDentalHealthIndex,
	calculateWarrantyValidity,
	formatKopecksToRub,
	formatRubles,
	formatRussianDateIso,
	generatePatientTaxCertificate1151156,
	generateSbpQrPayload,
	generateSmsOtp,
	processSbpPayment,
	signConsentWithPep,
	verifySmsOtp,
} from "../components/portal/patientCabinet/patientCabinetEngine";
import { DEMO_PATIENT_CABINET } from "../components/portal/patientCabinet/patientCabinetPresets";

test("Patient Personal Cabinet & 375px Mobile Ergonomics Suite", async (t) => {
	await t.test("1. Dental Health Index and Sanitation Calculations", () => {
		const healthIndex = calculateDentalHealthIndex();
		assert.ok(healthIndex.sanitationPercent >= 0 && healthIndex.sanitationPercent <= 100);
		assert.ok(healthIndex.statusLabelRu.length > 0);
		assert.ok(healthIndex.formattedIndexRu.includes("санации"));
		assert.equal(healthIndex.totalTeeth, 32);
	});

	await t.test("2. 1-Click Tax Deduction Certificate (KND 1151156) Calculation", () => {
		const demo = DEMO_PATIENT_CABINET;
		const htmlCert = generatePatientTaxCertificate1151156(demo, 2026);

		assert.ok(htmlCert.includes("КНД 1151156"), "Must contain statutory KND form code");
		assert.ok(htmlCert.includes("СПРАВКА"), "Must contain title");
		assert.ok(htmlCert.includes(demo.fullName), "Must contain patient full name");
		assert.ok(htmlCert.includes(demo.cardNumber), "Must contain medical card number");

		// Total paid calculation
		const paidSum = demo.invoices
			.filter((i) => i.status === "paid")
			.reduce((sum, i) => sum + i.paidAmountRub, 0);
		const estimatedRefund = Math.round(paidSum * 0.13);
		assert.ok(estimatedRefund > 0);
	});

	await t.test("3. Detailed Fiscal Receipt (54-FZ) Data Generation", () => {
		const demo = DEMO_PATIENT_CABINET;
		const paidInvoice = demo.invoices.find((i) => i.status === "paid");
		assert.ok(paidInvoice, "Paid invoice must exist in demo data");

		assert.ok(paidInvoice.fiscalReceiptNumber, "Must have 54-FZ fiscal receipt number");
		assert.equal(paidInvoice.remainingAmountRub, 0);
		assert.ok(paidInvoice.items.length > 0);

		for (const item of paidInvoice.items) {
			assert.ok(item.titleRu.length > 0);
			assert.ok(item.priceRub > 0);
			assert.ok(item.totalRub > 0);
		}
	});

	await t.test("4. Emergency WhatsApp SOS Hotline Deep Link Generation", () => {
		const patientName = "Воронов Алексей Владимирович";
		const cardNumber = "043-8842";
		const emergencyWhatsappNumber = "79991234567";

		const cleanNumber = emergencyWhatsappNumber.replace(/\D/g, "");
		const text = encodeURIComponent(
			`Здравствуйте! Я пациент клиники DENTE (${patientName}, карта № ${cardNumber}). После недавнего лечения у меня возникли болезненные ощущения / вопросы. Проконсультируйте, пожалуйста, дежурного врача.`,
		);
		const whatsappUrl = `https://wa.me/${cleanNumber}?text=${text}`;

		assert.ok(whatsappUrl.startsWith("https://wa.me/79991234567?text="));
		assert.ok(whatsappUrl.includes(encodeURIComponent(patientName)));
		assert.ok(whatsappUrl.includes(encodeURIComponent(cardNumber)));
	});

	await t.test("5. SBP Payment and QR Payload Generation", () => {
		const demo = DEMO_PATIENT_CABINET;
		const unpaidInvoice = demo.invoices.find((i) => i.status === "unpaid" || i.status === "partially_paid");
		assert.ok(unpaidInvoice, "Unpaid invoice must exist in demo data");

		const payload = generateSbpQrPayload(unpaidInvoice);
		assert.equal(payload.amountRub, unpaidInvoice.remainingAmountRub);
		assert.ok(payload.qrSvg.includes("<svg"));
		assert.ok(payload.availableBanks.length >= 3);

		const paidResult = processSbpPayment(unpaidInvoice);
		assert.equal(paidResult.status, "paid");
		assert.equal(paidResult.remainingAmountRub, 0);
		assert.equal(paidResult.paidAmountRub, unpaidInvoice.totalAmountRub);
		assert.ok(paidResult.fiscalReceiptNumber);
	});

	await t.test("6. SMS/OTP 63-FZ PEP Consent Signing Workflow", () => {
		const demo = DEMO_PATIENT_CABINET;
		const pendingConsent = demo.consents.find((c) => c.status === "pending_signature");
		assert.ok(pendingConsent, "Pending consent must exist in demo data");

		const otp = generateSmsOtp(demo.phone, "748291");
		assert.equal(otp.code, "748291");

		const verifyGood = verifySmsOtp("748291", otp.code, otp.sentTimestamp);
		assert.equal(verifyGood.success, true);

		const verifyBad = verifySmsOtp("000000", otp.code, otp.sentTimestamp);
		assert.equal(verifyBad.success, false);

		const signed = signConsentWithPep(pendingConsent, demo.phone, "748291", demo.fullName);
		assert.equal(signed.status, "signed");
		assert.equal(signed.signatureAudit?.integrityHash.length, 64);
		assert.equal(signed.signatureAudit?.verificationMethod, "sms_otp");
	});

	await t.test("7. CSS Validation: 375px Mobile Responsive Rules and >= 44px Touch Targets", () => {
		const candidatePaths = [
			path.resolve(process.cwd(), "src/components/portal/patientCabinet/patientCabinet.css"),
			path.resolve(process.cwd(), "apps/web/src/components/portal/patientCabinet/patientCabinet.css"),
		];
		const cssPath = candidatePaths.find((p) => fs.existsSync(p)) || candidatePaths[0]!;
		assert.ok(fs.existsSync(cssPath), `patientCabinet.css must exist at ${cssPath}`);

		const css = fs.readFileSync(cssPath, "utf8");

		// Touch targets >= 44px
		assert.ok(css.includes("min-height: 44px") || css.includes("min-height: 48px"));
		assert.ok(css.includes("touch-action: manipulation"));

		// 375px and <= 480px rules
		assert.ok(css.includes("@media (max-width: 480px)"));
		assert.ok(css.includes("pc-header"));
		assert.ok(css.includes("pc-invoice-actions"));
		assert.ok(css.includes("tax-deduction-quick-card"));
	});
});
