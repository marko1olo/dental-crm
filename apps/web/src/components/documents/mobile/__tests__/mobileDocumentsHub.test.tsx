import assert from "node:assert/strict";
import { describe, it } from "node:test";
import "../../../../../testCssStub.mjs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { GeneratedDocument } from "@dental/shared";
import { MobileDocumentsHub } from "../MobileDocumentsHub";
import { MobileDocumentPreviewSheet } from "../MobileDocumentPreviewSheet";

const mockDocuments: GeneratedDocument[] = [
	{
		id: "doc-1111-2222-3333-444455556666",
		organizationId: "org-1111-2222-3333-444455556666",
		patientId: "pat-1111-2222-3333-444455556666",
		visitId: null,
		kind: "paid_medical_services_contract",
		title: "Договор на оказание медицинских услуг",
		status: "issued",
		issuedAt: "2026-03-24T10:00:00.000Z",
		totalAmountRub: 12500,
		doctorSignedAt: "2026-03-24T10:05:00.000Z",
		doctorCertSubject: "Иванов И.И. (Врач-стоматолог)",
	},
	{
		id: "doc-2222-3333-4444-555566667777",
		organizationId: "org-1111-2222-3333-444455556666",
		patientId: "pat-1111-2222-3333-444455556666",
		visitId: null,
		kind: "informed_consent",
		title: "Информированное добровольное согласие (1051н)",
		status: "draft",
		issuedAt: null,
		totalAmountRub: null,
	},
	{
		id: "doc-3333-4444-5555-666677778888",
		organizationId: "org-1111-2222-3333-444455556666",
		patientId: "pat-1111-2222-3333-444455556666",
		visitId: null,
		kind: "completed_works_act",
		title: "Акт выполненных работ (804н)",
		status: "issued",
		issuedAt: "2026-03-24T11:30:00.000Z",
		totalAmountRub: 4800,
	},
	{
		id: "doc-4444-5555-6666-777788889999",
		organizationId: "org-1111-2222-3333-444455556666",
		patientId: "pat-1111-2222-3333-444455556666",
		visitId: null,
		kind: "tax_deduction_certificate",
		title: "Справка об оплате медицинских услуг (ФНС)",
		status: "issued",
		issuedAt: "2026-03-24T12:00:00.000Z",
		totalAmountRub: 17300,
		taxYear: 2025,
	},
];

describe("MobileDocumentsHub & Share Sheet (Apple HIG 390x844)", () => {
	it("renders mobile hub with grouped cards, status badges and category chips", () => {
		const html = renderToStaticMarkup(
			<MobileDocumentsHub
				documents={mockDocuments}
				activePatient={{
					id: "pat-1111-2222-3333-444455556666",
					organizationId: "org-1111-2222-3333-444455556666",
					fullName: "Смирнов Алексей Петрович",
					phone: "+7 999 123-45-67",
					createdAt: "2026-01-01T00:00:00Z",
					updatedAt: "2026-01-01T00:00:00Z",
				} as any}
				onDownloadPdf={() => {}}
				onOpenHtml={() => {}}
			/>,
		);

		// Container
		assert.ok(html.includes('data-testid="mobile-documents-hub"'));

		// 1-Row search input
		assert.ok(html.includes('data-testid="mobile-documents-search-input"'));

		// Category chips
		assert.ok(html.includes('data-testid="mobile-chip-all"'));
		assert.ok(html.includes('data-testid="mobile-chip-contracts"'));
		assert.ok(html.includes('data-testid="mobile-chip-consents"'));
		assert.ok(html.includes('data-testid="mobile-chip-acts"'));
		assert.ok(html.includes('data-testid="mobile-chip-fns"'));

		// Grouped items
		assert.ok(html.includes("mobile-doc-item-doc-1111-2222-3333-444455556666"));
		assert.ok(html.includes("mobile-doc-item-doc-2222-3333-4444-555566667777"));
		assert.ok(html.includes("mobile-doc-item-doc-3333-4444-5555-666677778888"));
		assert.ok(html.includes("mobile-doc-item-doc-4444-5555-6666-777788889999"));

		// PEP status badge
		assert.ok(html.includes("Подписан ПЭП"));
		// Draft status badge
		assert.ok(html.includes("Требует подписи"));

		// Money formatting in ₽
		assert.ok(html.includes("12"));
	});

	it("renders MobileDocumentPreviewSheet with Drag Handle and large thumb-zone action buttons", () => {
		const html = renderToStaticMarkup(
			<MobileDocumentPreviewSheet
				document={(mockDocuments[0] ?? null) as GeneratedDocument | null}
				isOpen={true}
				onClose={() => {}}
				onPrint={() => {}}
				onSharePdf={() => {}}
				activePatientName="Смирнов Алексей Петрович"
				activeDoctorName="Иванов И.И."
			/>,
		);

		// Bottom Sheet container
		assert.ok(html.includes('data-testid="mobile-document-preview-sheet"'));

		// Close button
		assert.ok(html.includes('data-testid="mobile-doc-preview-close"'));

		// Two large action buttons in lower third (Natural Thumb Zone)
		assert.ok(html.includes('data-testid="mobile-btn-print-doc"'));
		assert.ok(html.includes('data-testid="mobile-btn-share-doc"'));
		assert.ok(html.includes("Печать"));
		assert.ok(html.includes("Поделиться PDF"));

		// Miniature blank simulator details
		assert.ok(html.includes("Смирнов Алексей Петрович"));
		assert.ok(html.includes("Иванов И.И."));
		assert.ok(html.includes("ГОСТ А4 / PDF"));
		assert.ok(html.includes("12"));
	});
});
