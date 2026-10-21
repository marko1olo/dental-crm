import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { FnsTaxCertificateModal } from "../FnsTaxCertificateModal.js";
import { OutpatientCardPrintModal } from "../OutpatientCardPrintModal.js";
import { DocumentNavTabs } from "../DocumentNavTabs.js";
import {
	informedConsentGuidanceReview,
	resolveInformedConsentSafeDefaults,
} from "../informedConsentGuiding.js";
import {
	taxApplicationGuidanceReview,
	resolveTaxApplicationSafeDefaults,
} from "../taxApplicationGuiding.js";
import {
	photoVideoConsentGuidanceReview,
	resolvePhotoVideoConsentSafeDefaults,
} from "../photoVideoConsentGuiding.js";

const mockPatient = {
	id: "pat-12345",
	organizationId: "org-test-uuid",
	fullName: "Смирнова Анна Павловна",
	birthDate: "1988-03-14",
	gender: "female" as const,
	phone: "+7 (999) 111-22-33",
	balanceRub: 0,
	isArchived: false,
	status: "active" as const,
};

const mockClinic = {
	legalName: 'ООО "Стоматологическая клиника ДЕНТЕ"',
	inn: "7710984521",
	kpp: "771001001",
	ogrn: "1217700456123",
	address: "127006, г. Москва, ул. Тверская, д. 12",
	licenseNumber: "ЛО41-01137-77/00645892",
	directorFullName: "Воронов Алексей Владимирович",
};

describe("Documents & FNS Tax Inquisitor Verification Suite", () => {
	it("1. Informed Consent Guiding: safe defaults provide clinical norm and never block printing", () => {
		const defaults = resolveInformedConsentSafeDefaults({});
		assert.ok(defaults.intervention.includes("Стоматологический осмотр"), "Default intervention provided");
		assert.ok(defaults.toothOrArea.includes("По плану лечения"), "Default area provided");

		const review = informedConsentGuidanceReview(defaults);
		assert.strictEqual(review.canPrint, true, "canPrint must be true");
		assert.strictEqual(review.isSoftGuiding, true, "isSoftGuiding must be true");
	});

	it("2. Tax Application Guiding: safe defaults provide patient defaults and never block printing", () => {
		const defaults = resolveTaxApplicationSafeDefaults({});
		assert.ok(defaults.taxpayerFullName.includes("Пациент клиники"), "Default taxpayer provided");

		const review = taxApplicationGuidanceReview(defaults);
		assert.strictEqual(review.canPrint, true, "canPrint must be true");
		assert.strictEqual(review.isSoftGuiding, true, "isSoftGuiding must be true");
	});

	it("3. Photo/Video Consent Guiding: safe defaults provide standard materials and never block", () => {
		const defaults = resolvePhotoVideoConsentSafeDefaults({});
		assert.ok(defaults.materials.length > 0, "Default materials provided");

		const review = photoVideoConsentGuidanceReview(defaults);
		assert.strictEqual(review.canPrint, true, "canPrint must be true");
		assert.strictEqual(review.isSoftGuiding, true, "isSoftGuiding must be true");
	});

	it("4. FnsTaxCertificateModal renders clean human title and enabled print button in blank mode", () => {
		const html = renderToString(
			<FnsTaxCertificateModal
				isOpen={true}
				onClose={() => {}}
				patient={mockPatient}
				clinicProfileDraft={mockClinic}
				initialYear={2026}
				payments={[]}
			/>,
		);

		assert.ok(html.includes("Справка для налогового вычета (ФНС)"), "Must render human title without Soviet jargon");
		assert.ok(html.includes("data-testid=\"tax-cert-print-btn\""), "Print button must be rendered");
		assert.ok(!html.includes('disabled="" data-testid="tax-cert-print-btn"'), "Print button must not be disabled in blank mode (Mandate 8e)");
		assert.ok(html.includes("Нет подтвержденных фискальных оплат"), "Displays empty blank mode message");
	});

	it("5. OutpatientCardPrintModal displays 'Медицинская карта приёма' and enabled print button", () => {
		const html = renderToString(
			<OutpatientCardPrintModal
				isOpen={true}
				onClose={() => {}}
				patient={mockPatient}
				doctorFullName="Воронов А.В."
				clinicProfileDraft={mockClinic}
			/>,
		);

		assert.ok(html.includes("Медицинская карта приёма"), "Must present medical card as 'карта приёма'");
		assert.ok(html.includes("data-testid=\"outpatient-card-print-btn\""), "Must have print button");
	});

	it("6. DocumentNavTabs contains clear human tabs per Mandate 8x", () => {
		const html = renderToString(
			<DocumentNavTabs
				activeTab="all"
				onSelectTab={() => {}}
			/>,
		);

		assert.ok(html.includes("Договоры и согласия"), "Must have 'Договоры и согласия' tab");
		assert.ok(html.includes("Справки в налоговую"), "Must have 'Справки в налоговую' tab");
		assert.ok(html.includes("Акты и счета"), "Must have 'Акты и счета' tab");
		assert.ok(html.includes("Архив карт"), "Must have 'Архив карт' tab");
	});
});
