import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToString } from "react-dom/server";
import { OutpatientCardPrintModal } from "../OutpatientCardPrintModal.js";
import { InformedConsentViewer } from "../InformedConsentViewer.js";
import { FnsTaxCertificateModal } from "../FnsTaxCertificateModal.js";
import type { Patient, GeneratedDocument } from "@dental/shared";
import { PrescriptionForm107Modal } from "../PrescriptionForm107Modal.js";
import { PatientContractsSection } from "../PatientContractsSection.js";

const mockPatient: Patient = {
	id: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
	organizationId: "b1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
	status: "active",
	fullName: "Иванов Иван Иванович",
	phone: "+7 (999) 111-22-33",
	email: "ivanov@example.com",
	birthDate: "1985-05-15",
	gender: "male",
	notes: null,
	balanceRub: 0,
	administrativeProfile: null,
	createdAt: "2026-01-10T10:00:00.000Z",
	updatedAt: "2026-01-10T10:00:00.000Z",
};

const mockClinicProfile = {
	clinicName: "ООО Стоматология ДЕНТЕ Премиум",
	legalName: "ООО Стоматология ДЕНТЕ Премиум",
	inn: "7710984521",
	kpp: "771001001",
	ogrn: "1217700456123",
	medicalLicenseNumber: "ЛО41-01137-77/00645892",
	address: "г. Москва, ул. Тверская, д. 12",
	phone: "+7 (495) 123-45-67",
	directorFullName: "Воронов Алексей Владимирович",
};

describe("Canonical Documents Modals and Sections (Red Team Inquisition)", () => {
	it("renders OutpatientCardPrintModal with 043/u layout and print buttons", () => {
		const html = renderToString(
			<OutpatientCardPrintModal
				isOpen={true}
				onClose={() => {}}
				patient={mockPatient}
				doctorFullName="Воронов А.В."
				clinicProfileDraft={mockClinicProfile}
				isClosedOrSigned={false}
			/>,
		);

		assert.ok(html.includes("outpatient-card-print-modal"), "Must render modal container");
		assert.ok(html.includes("Форма 043/у"), "Must reference Form 043/u in title");
		assert.ok(html.includes("ЧЕРНОВИК"), "Must show draft badge when not signed");
		assert.ok(html.includes("Печать карты"), "Must render print button");
		assert.ok(html.includes("Экспорт PDF"), "Must render PDF button");
		assert.ok(html.includes("Иванов Иван Иванович"), "Must render patient name");
	});

	it("renders InformedConsentViewer with Order 1051n statutory references", () => {
		const html = renderToString(
			<InformedConsentViewer
				isOpen={true}
				onClose={() => {}}
				patient={mockPatient}
				doctorFullName="Воронов А.В."
				clinicProfileDraft={mockClinicProfile}
				isSigned={true}
			/>,
		);

		assert.ok(html.includes("informed-consent-viewer-modal"), "Must render modal container");
		assert.ok(html.includes("1051н"), "Must reference statutory Order 1051n");
		assert.ok(html.includes("323-ФЗ"), "Must reference Federal Law 323-FZ");
		assert.ok(html.includes("ПОДПИСАНО"), "Must show signed badge");
		assert.ok(html.includes("Печать ИДС"), "Must render print button");
		assert.ok(html.includes("Заполнить нормой"), "Must render norm fill button");
	});

	it("renders FnsTaxCertificateModal with KND 1151156 and statutory code separation", () => {
		const html = renderToString(
			<FnsTaxCertificateModal
				isOpen={true}
				onClose={() => {}}
				patient={mockPatient}
				clinicProfileDraft={mockClinicProfile}
				initialYear={2025}
				payments={[
					{
						id: "pay-1",
						dateIso: "2025-04-10T12:00:00.000Z",
						serviceName: "Лечение кариеса",
						code804n: "A16.07.002",
						amountRub: 15000,
					},
					{
						id: "pay-2",
						dateIso: "2025-06-15T12:00:00.000Z",
						serviceName: "Имплантация зуба",
						code804n: "A16.07.054",
						amountRub: 80000,
					},
				]}
			/>,
		);

		assert.ok(html.includes("fns-tax-certificate-modal"), "Must render modal container");
		assert.ok(html.includes("КНД 1151156"), "Must reference KND 1151156");
		assert.ok(html.includes("Код 1"), "Must display Code 1 standard procedures");
		assert.ok(html.includes("Код 2"), "Must display Code 2 expensive procedures");
		assert.ok(html.includes("Печать справки"), "Must render print button");
	});

	it("renders PrescriptionForm107Modal with Order 1094n and Latin Recipe", () => {
		const html = renderToString(
			<PrescriptionForm107Modal
				isOpen={true}
				onClose={() => {}}
				patient={mockPatient}
				doctorFullName="Воронов А.В."
				clinicProfileDraft={mockClinicProfile}
			/>,
		);

		assert.ok(html.includes("prescription-form-107-modal"), "Must render modal container");
		assert.ok(html.includes("107-1/у"), "Must reference Form 107-1/u");
		assert.ok(html.includes("1094н"), "Must reference Order 1094n");
		assert.ok(html.includes("Rp.:"), "Must render Latin Recipe prefix");
		assert.ok(html.includes("Печать рецепта"), "Must render print button");
	});

	it("renders PatientContractsSection with Decree 736 and blank contract print", () => {
		const html = renderToString(
			<PatientContractsSection
				patient={mockPatient}
				clinicProfileDraft={mockClinicProfile}
				contracts={[
					{
						id: "c1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
						organizationId: "b1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
						patientId: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
						visitId: null,
						kind: "paid_medical_services_contract",
						title: "Договор на оказание медицинских услуг",
						status: "issued",
						issuedAt: "2026-02-15T10:00:00.000Z",
						totalAmountRub: 15000,
						payload: {
							contractNumber: "Д-2026/0418",
						},
					} as GeneratedDocument,
				]}
			/>,
		);

		assert.ok(html.includes("patient-contracts-section"), "Must render section container");
		assert.ok(html.includes("ПП РФ № 736"), "Must reference Government Decree No. 736");
		assert.ok(html.includes("Бланк со строками «________»"), "Must render Mandate 8e registration blank print button");
		assert.ok(html.includes("Д-2026/0418"), "Must list existing contract");
	});

	it("guarantees zero raw emojis in all 5 canonical components", () => {
		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		const files = [
			"OutpatientCardPrintModal.tsx",
			"InformedConsentViewer.tsx",
			"FnsTaxCertificateModal.tsx",
			"PrescriptionForm107Modal.tsx",
			"PatientContractsSection.tsx",
		];

		for (const file of files) {
			const content = fs.readFileSync(path.resolve("apps/web/src/components/documents", file), "utf8");
			assert.strictEqual(
				emojiRegex.test(content),
				false,
				`File ${file} must have 0 emojis (Mandate 8d pt 7)`,
			);
		}
	});

	it("guarantees zero dev jargon ('в 1 клик', 'авто-генерация') in all 5 canonical components", () => {
		const jargonRegex = /(в 1 клик|1-клик|авто-генерация|автогенерация)/i;
		const files = [
			"OutpatientCardPrintModal.tsx",
			"InformedConsentViewer.tsx",
			"FnsTaxCertificateModal.tsx",
			"PrescriptionForm107Modal.tsx",
			"PatientContractsSection.tsx",
		];

		for (const file of files) {
			const content = fs.readFileSync(path.resolve("apps/web/src/components/documents", file), "utf8");
			assert.strictEqual(
				jargonRegex.test(content),
				false,
				`File ${file} must have 0 dev jargon (Directive 4)`,
			);
		}
	});
});
