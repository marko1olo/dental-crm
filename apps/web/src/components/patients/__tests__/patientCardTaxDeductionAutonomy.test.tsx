import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PatientCardModal } from "../PatientCardModal";
import { PatientGeneralInfoTab } from "../tabs/PatientGeneralInfoTab";
import { TaxDeductionCertificateModal } from "../../finance/TaxDeductionCertificateModal";

describe("PatientCardModal & TaxDeduction Autonomy (FNS Form KND 1151156)", () => {
	it("renders 1-click 'Справка ФНС (1151156)' button in PatientCardModal header", () => {
		const html = renderToStaticMarkup(
			createElement(PatientCardModal, {
				isOpen: true,
				onClose: () => {},
				patient: {
					id: "p-12345",
					fullName: "Иванов Иван Иванович",
					phone: "+7 (999) 111-22-33",
					birthDate: "1985-04-12",
					inn: "770123456789",
					snils: "123-456-789 00",
				},
			}),
		);

		assert.ok(
			html.includes('data-testid="btn-patient-tax-deduction"'),
			"Must render data-testid='btn-patient-tax-deduction' in header",
		);
		assert.ok(
			html.includes("Справка ФНС (1151156)"),
			"Must render button label 'Справка ФНС (1151156)'",
		);
		assert.ok(
			!html.includes('data-testid="btn-patient-tax-deduction" disabled'),
			"Tax deduction button must never be disabled",
		);
	});

	it("renders order tax certificate link and visits tab button in PatientGeneralInfoTab", () => {
		let wasOpened = false;
		const html = renderToStaticMarkup(
			createElement(PatientGeneralInfoTab, {
				patient: {
					id: "p-12345",
					fullName: "Иванов Иван Иванович",
					phone: "+7 (999) 111-22-33",
					birthDate: "1985-04-12",
					inn: "770123456789",
					snils: "123-456-789 00",
				},
				activeSection: "all",
				onOpenTaxCertificate: () => {
					wasOpened = true;
				},
			}),
		);

		assert.ok(
			html.includes('data-testid="link-order-tax-certificate"'),
			"Must render link-order-tax-certificate next to SNILS in insurance accordion",
		);
		assert.ok(
			html.includes('data-testid="btn-patient-tax-deduction-tab"'),
			"Must render btn-patient-tax-deduction-tab in visits and finances header",
		);
		assert.ok(
			html.includes("Справка ФНС (13%)"),
			"Must render label 'Справка ФНС (13%)'",
		);
	});

	it("TaxDeductionCertificateModal mounts with patient demographics without blocking", () => {
		const html = renderToStaticMarkup(
			createElement(TaxDeductionCertificateModal, {
				isOpen: true,
				onClose: () => {},
				patientId: "p-12345",
				patientName: "Иванов Иван Иванович",
				patientBirthDate: "1985-04-12",
				patientInn: "770123456789",
				patientSnils: "123-456-789 00",
				clinicName: "ООО ДЕНТЕ",
				clinicInn: "7707083893",
				clinicKpp: "770101001",
				clinicOgrn: "1027700132195",
			}),
		);

		assert.ok(html.includes("Справка для налогового вычета (13% НДФЛ)"));
		assert.ok(html.includes("Вычет 13%"));
		assert.ok(html.includes("Иванов Иван Иванович"));
		assert.ok(html.includes("Печать справки КНД 1151156 (А4)"));
		assert.ok(html.includes("Бланк («________»)") || html.includes("data-testid=\"btn-tax-print-blank\""));
		assert.ok(!html.includes("<button disabled"));
	});

	it("enforces Decree 659: rejects tax certificate generation for anonymous patient", async () => {
		const { NdflTaxService } = await import(
			"../../../../../api/src/services/documents/ndflTaxService.js"
		);
		assert.throws(
			() => {
				NdflTaxService.generateXml({
					documentNumber: "1",
					documentDate: "2024-10-10",
					taxYear: 2024,
					taxInspectionCode: "7701",
					clinic: {
						inn: "7707083893",
						kpp: "770101001",
						ogrn: "1027700132195",
						name: "ООО ДЕНТЕ",
						directorName: "Смирнов А.В.",
					},
					payer: {
						fullName: { family: "UUID_ANON_PATIENT", given: "Аноним" },
						inn: "770123456789",
						birthDate: "1990-01-01",
					},
					patient: {
						patientKinshipCode: "1",
					},
					expenses: {
						code1AmountKopecks: 100000,
						code2AmountKopecks: 0,
					},
				});
			},
			(err: any) => {
				assert.equal(err.name, "Decree659TaxDeductionForbiddenError");
				assert.ok(err.message.includes("Постановлению Правительства РФ №659"));
				return true;
			},
		);
	});
});
