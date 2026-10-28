import assert from "node:assert";
import { describe, it } from "node:test";
import {
	informedConsentBlockersReview,
	INFORMED_CONSENT_SAFE_DEFAULTS,
	resolveInformedConsentSafeDefaults,
} from "../informedConsentBlockers";
import {
	taxApplicationBlockersReview,
	TAX_APPLICATION_SAFE_DEFAULTS,
	resolveTaxApplicationSafeDefaults,
} from "../taxApplicationBlockers";
import {
	photoVideoConsentBlockersReview,
	PHOTO_VIDEO_CONSENT_SAFE_DEFAULTS,
	resolvePhotoVideoConsentSafeDefaults,
} from "../photoVideoConsentBlockers";
import { PrescriptionBlankModal } from "../PrescriptionBlankModal";
import { getIntakeAndClinicalItems } from "../catalog/intakeAndClinicalItems";
import type { ProfessionalA4DocumentTab } from "../professionalA4/types";

describe("Legal Documents, Consents & Anti-Blockers Red Team Inquisition", () => {
	it("1. Verifies that PrescriptionBlankModal is the canonical prescription blank component without bureaucratic titles", () => {
		assert.ok(PrescriptionBlankModal);
		assert.strictEqual(PrescriptionBlankModal.displayName, "PrescriptionBlankModal");
	});

	it("2. Verifies that informedConsentBlockers never blocks printing (canPrint: true, soft guiding only)", () => {
		const emptyReview = informedConsentBlockersReview({
			intervention: "",
			toothOrArea: "",
			inferredTreatmentArea: "",
			diagnosisOrIndication: "",
			activeVisitComplaint: "",
			expectedBenefit: "",
			risks: "",
			alternatives: "",
			aftercare: "",
			doctorFullName: "",
			activeDoctorFullName: "",
		});

		assert.strictEqual(emptyReview.canPrint, true, "Printing must NEVER be disabled");
		assert.strictEqual(emptyReview.canSign, true, "Signing must NEVER be disabled (Mandate 8e)");
		assert.strictEqual(emptyReview.disabled, false, "Disabled must be false (Mandate 8e)");
		assert.strictEqual(emptyReview.isSoftGuiding, true, "Blockers must act strictly as soft guidance");
		assert.ok(emptyReview.blockers.every((b) => b.isSoftGuide === true), "Every item must have isSoftGuide flag");

		// Resolves safe defaults when doctor prints incomplete form
		const resolved = resolveInformedConsentSafeDefaults({});
		assert.strictEqual(resolved.intervention, INFORMED_CONSENT_SAFE_DEFAULTS.intervention);
		assert.strictEqual(resolved.diagnosisOrIndication, "Санация полости рта");
		assert.strictEqual(resolved.toothOrArea, "По плану лечения");
	});

	it("3. Verifies that taxApplicationBlockers never blocks printing (canPrint: true, soft guiding only)", () => {
		const emptyReview = taxApplicationBlockersReview({
			taxpayerFullName: "",
			taxpayerInn: "",
			taxpayerBirthDate: "",
			taxpayerIdentityDocument: "",
			relationship: "self",
			form: "knd_1151156",
			authorityDocument: "",
			contact: "",
			duplicateWarningAccepted: false,
		});

		assert.strictEqual(emptyReview.canPrint, true, "Printing tax application must never be blocked");
		assert.strictEqual(emptyReview.canSign, true, "Signing tax application must never be blocked (Mandate 8e)");
		assert.strictEqual(emptyReview.disabled, false, "Disabled must be false (Mandate 8e)");
		assert.strictEqual(emptyReview.isSoftGuiding, true);

		const resolved = resolveTaxApplicationSafeDefaults({});
		assert.strictEqual(resolved.taxpayerFullName, TAX_APPLICATION_SAFE_DEFAULTS.taxpayerFullName);
		assert.strictEqual(resolved.form, "knd_1151156");
	});

	it("4. Verifies that photoVideoConsentBlockers never blocks printing (canPrint: true, soft guiding only)", () => {
		const emptyReview = photoVideoConsentBlockersReview({
			materials: [],
			clinicalRecordUseConfirmed: false,
			anonymizationConfirmed: false,
			revocationChannel: "",
			recognizablePublicationAllowed: false,
			marketingUseAllowed: false,
			educationUseAllowed: false,
		});

		assert.strictEqual(emptyReview.canPrint, true, "Printing photo/video consent must never be blocked");
		assert.strictEqual(emptyReview.canSign, true, "Signing photo/video consent must never be blocked (Mandate 8e)");
		assert.strictEqual(emptyReview.disabled, false, "Disabled must be false (Mandate 8e)");
		assert.strictEqual(emptyReview.isSoftGuiding, true);

		const resolved = resolvePhotoVideoConsentSafeDefaults({});
		assert.ok(resolved.materials.length > 0, "Safe defaults must supply default photo materials");
		assert.strictEqual(resolved.clinicalRecordUseConfirmed, true);
	});

	it("5. Verifies that intakeAndClinicalItems catalog registers dental_medical_card and informed_consent without bureaucratic numbers", () => {
		let chosenTab: ProfessionalA4DocumentTab | null = null;
		const items = getIntakeAndClinicalItems({
			setSelectedA4Tab: (tab) => {
				chosenTab = tab;
			},
			handleOpenKind: () => {},
		});

		const medicalCardItem = items.find((i) => i.id === "dental_medical_card");
		assert.ok(medicalCardItem, "Catalog must register dental_medical_card domain id");
		assert.strictEqual(medicalCardItem?.titleRu, "Медицинская карта приёма");

		const consentItem = items.find((i) => i.id === "consent_medical_intervention");
		assert.ok(consentItem, "Consent item must be present");
		consentItem?.onQuickAction?.();
		assert.strictEqual(chosenTab, "informed_consent", "Quick action must select canonical informed_consent tab");
	});
});
