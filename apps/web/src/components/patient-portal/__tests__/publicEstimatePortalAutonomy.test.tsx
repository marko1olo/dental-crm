import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { PublicEstimateDetail, PublicEstimateMeta } from "@dental/shared";
import { PublicEstimatePortal } from "../PublicEstimatePortal";
import { PatientBranchTransferModal } from "../../patients/transfer/PatientBranchTransferModal";
import { PatientCabinetModal } from "../../portal/patientCabinet/PatientCabinetModal";
import { DEMO_PATIENT_CABINET } from "../../portal/patientCabinet/patientCabinetPresets";

describe("Public Portal & Statutory Signature Autonomy (Mandates 8e, 8i, 8k & 63-FZ / 323-FZ)", () => {
	const mockMeta: PublicEstimateMeta = {
		requires_verification: false,
		method: "none",
		locked: false,
		expired: false,
		already_decided: false,
		decided_status: null,
		clinic_name: "Стоматология ДЕНТЕ",
		clinic_phone: "+7 (495) 123-45-67",
		clinic_email: "clinic@example.com",
		clinic_address_line: "г. Москва, ул. Клиническая, д. 10",
		clinic_currency: "RUB",
		patient_first_name: "Иван",
		estimate_number: "СМ-2026-001",
		estimate_total: "45000",
		valid_until: "2026-10-01",
	};

	const mockEstimate: PublicEstimateDetail = {
		id: "est-123",
		estimate_number: "СМ-2026-001",
		status: "sent",
		valid_from: "2026-09-01",
		valid_until: "2026-10-01",
		subtotal_rub: 45000,
		total_discount_rub: 0,
		total_tax_rub: 0,
		total_rub: 45000,
		patient_notes: null,
		items: [
			{
				id: "item-1",
				title: "Комплексная профессиональная гигиена полости рта",
				tooth_number: null,
				quantity: 1,
				unit_price_rub: 15000,
				line_total_rub: 15000,
				discount_rub: 0,
				net_line_total_rub: 15000,
			},
			{
				id: "item-2",
				title: "Лечение кариеса с постановкой композитной пломбы",
				tooth_number: "16",
				quantity: 1,
				unit_price_rub: 30000,
				line_total_rub: 30000,
				discount_rub: 0,
				net_line_total_rub: 30000,
			},
		],
	};

	it("PublicEstimatePortal: renders clean statutory approval block without any <canvas> drawing pad", () => {
		const html = renderToString(
			<PublicEstimatePortal
				token="test-token-uuid-123"
				initialMeta={mockMeta}
				initialEstimate={mockEstimate}
				initialShowAcceptModal={true}
			/>,
		);

		// 1. Zero canvas element or procedural drawing simulator
		expect(html).not.toContain("<canvas");
		expect(html).not.toContain("Нарисуйте подпись на экране");
		expect(html).not.toContain("Очистить");

		// 2. Statutory 323-FZ & 63-FZ statutory consent text
		expect(html).toContain("Электронное согласование (ст. 20 323-ФЗ / 63-ФЗ)");
		expect(html).toContain(
			"Ознакомлен(а) со стоимостью, перечнем процедур и даю информированное согласие на лечение (ст. 20 323-ФЗ)",
		);

		// 3. 1-click Approval button is present
		expect(html).toContain("Утвердить план");
		expect(html).toContain("ФИО подписанта:");
	});

	it("PatientBranchTransferModal: uses statutory paper consent instead of biometric stylus fiction", () => {
		const html = renderToString(
			<PatientBranchTransferModal
				isOpen={true}
				onClose={() => {}}
				patientId="pat-42"
				patientFullName="Смирнов Петр Алексеевич"
				initialSourceBranchId="branch_center"
				initialTargetBranchId="branch_north"
			/>,
		);

		// 1. Must contain statutory paper consent
		expect(html).toContain('value="paper_signed_consent"');
		expect(html).toContain("Бумажное заявление пациента (подшито в карту 043/у)");

		// 2. Biometric fiction must be completely eradicated
		expect(html).not.toContain("tablet_stylus_biometric");
		expect(html).not.toContain("биометрический росчерк");
	});

	it("PatientCabinetModal: eliminates fake finger signature canvas and provides statutory PEP confirmation", () => {
		const html = renderToString(
			<PatientCabinetModal
				isOpen={true}
				onClose={() => {}}
				initialData={DEMO_PATIENT_CABINET}
				initialSigningConsent={DEMO_PATIENT_CABINET.consents[0]}
				initialConsentSignMode="cabinet_pep"
			/>,
		);

		// 1. Zero canvas or fake touch signature pads
		expect(html).not.toContain("<canvas");
		expect(html).not.toContain("Распишитесь пальцем или стилусом на экране");
		expect(html).not.toContain("Подтвердить росчерк (63-ФЗ)");

		// 2. Contains statutory cabinet confirmation
		expect(html).toContain("Подтверждение в ЛК (63-ФЗ)");
		expect(html).toContain("Подтвердить согласие в личном кабинете (63-ФЗ ПЭП)");
	});
});
