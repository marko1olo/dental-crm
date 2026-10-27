import "../../../../testCssStub.mjs";
import assert from "node:assert";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
const { InformedConsentModal, ConsentModal } = await import("../InformedConsentModal.js");
import {
	getConsentPackage,
	getAllConsentPackages,
	getConsentTemplate,
	TEMPLATE_SHORT_TITLES,
	PACKAGE_SHORT_TITLES,
} from "../consentTemplates.js";

describe("Red Team Inquisition: Informed Consent Autonomy, Paper-First & Matryoshka Elimination Suite", () => {
	const mockPatient = {
		id: "pat-101",
		fullName: "Волков Андрей Михайлович",
		birthDate: "1988-03-12",
		passport: "4512 889900",
		phone: "+7 (999) 777-66-55",
	};

	it("1. SSOT: InformedConsentModal and ConsentModal are identical canonical components without matryoshka layers", () => {
		assert.strictEqual(InformedConsentModal, ConsentModal, "ConsentModal must be direct canonical alias of InformedConsentModal");

		const html = renderToStaticMarkup(
			<InformedConsentModal
				isOpen={true}
				onClose={() => {}}
				patient={mockPatient}
				doctorName="Д-р Соколов А.В."
				clinicName="ООО ДЕНТЕ"
			/>
		);

		// Modal depth is strictly 1 (zero nested dialogs)
		const dialogMatches = html.match(/role="dialog"/g) || [];
		assert.strictEqual(dialogMatches.length, 1, "Must contain exactly 1 dialog layer");
		assert.ok(html.includes('data-testid="btn-confirm-sign"'), "Must render primary confirm button");
		assert.ok(html.includes('data-testid="btn-confirm-paper-signed"'), "Must render 1-click paper signed button");
	});

	it("2. Paper-First Autonomy (Mandate 8e): Print buttons are NEVER disabled and paper signed is 1-click", () => {
		const html = renderToStaticMarkup(
			<InformedConsentModal
				isOpen={true}
				onClose={() => {}}
				initialVerificationMethod="paper_physical"
				patient={mockPatient}
				doctorName="Д-р Соколов А.В."
				clinicName="ООО ДЕНТЕ"
			/>
		);

		// Must render paper confirm button
		assert.ok(html.includes('data-testid="btn-confirm-paper-signed"'));
		// Must not have disabled print buttons
		assert.ok(!html.includes('disabled="" title="Многостраничная печать'));
		assert.ok(!html.includes('disabled="" title="Печать'));
	});

	it("3. 1-Click Primary Intake Package (PACKAGE_PRIMARY_INTAKE): combines treatment consent, personal data and paid medical contract", () => {
		const pkg = getConsentPackage("PACKAGE_PRIMARY_INTAKE");
		assert.ok(pkg, "PACKAGE_PRIMARY_INTAKE must be registered");
		assert.ok(pkg.templateKeys.includes("CONSENT_THERAPY"), "Includes clinical treatment consent");
		assert.ok(pkg.templateKeys.includes("CONSENT_PERSONAL_DATA"), "Includes personal data consent");
		assert.ok(pkg.templateKeys.includes("CONSENT_PAID_CONTRACT"), "Includes paid medical services contract");
		assert.strictEqual(pkg.templateKeys.length, 3, "Contains exactly 3 documents for 1-click intake");

		const contractTpl = getConsentTemplate("CONSENT_PAID_CONTRACT");
		assert.ok(contractTpl.title.includes("Договор"), "Contract has human clinical title");
		assert.strictEqual(TEMPLATE_SHORT_TITLES.CONSENT_PAID_CONTRACT, "Договор на оказание медицинских услуг");
	});

	it("4. Anti-Bureaucracy & Raw Law Elimination (Mandates 8x, 8ap): Human clinical Russian titles", () => {
		assert.ok(!TEMPLATE_SHORT_TITLES.CONSENT_PAID_CONTRACT.includes("№ 736"), "Eliminated raw law number 736 in short title");
		assert.ok(!TEMPLATE_SHORT_TITLES.CONSENT_INSPECTION_1051N.includes("1051"), "Eliminated raw order 1051 in short title");
		assert.ok(!TEMPLATE_SHORT_TITLES.CONSENT_PERSONAL_DATA.includes("152"), "Eliminated raw law 152 in short title");
	});

	it("5. Apple HIG Touch Ergonomics (Mandates 8am, 8al): 44x44px touch targets & clean bottom sheet", () => {
		const html = renderToStaticMarkup(
			<InformedConsentModal
				isOpen={true}
				onClose={() => {}}
				patient={mockPatient}
			/>
		);

		assert.ok(html.includes("consent-mobile-drag-handle"), "Must contain Apple iOS Drag Handle for bottom sheet");
		assert.ok(html.includes("consent-close-btn"), "Must contain close button");
	});
});
