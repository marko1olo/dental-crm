import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	mapPatientToGeneralInfo,
	resolveInitialSafetyProfile,
} from "../patientAutonomyActions.js";
import { syncCreationDraftsToStore } from "../patientCreation/constants.js";

describe("Patient General Info & Safety Draft Sync", () => {
	it("12. mapPatientToGeneralInfo & resolveInitialSafetyProfile map administrativeProfile accurately", () => {
		const rawPatient = {
			id: "01900000-0000-7000-8000-000000000099",
			fullName: "Морозова Ирина Викторовна",
			phone: "+7 (903) 555-66-77",
			birthDate: "1985-04-12",
			balanceRub: -4500,
			notes: "Аллергия на артикаин и пенициллин. Принимает варфарин.",
			administrativeProfile: {
				snils: "112-233-445 95",
				taxpayerInn: "770123456789",
				insurancePolicyNumber: "1234567890123456",
				registrationAddress: "г. Самара, ул. Куйбышева, д. 10",
				legalRepresentativeFullName: "Морозов Виктор Петрович",
				legalRepresentativeRelationship: "Отец",
				legalRepresentativePhone: "+7 (903) 555-00-00",
				preferredAppointmentNote: "src:yandex_maps",
			},
		};

		const mapped = mapPatientToGeneralInfo(rawPatient);
		assert.strictEqual(mapped.snils, "112-233-445 95");
		assert.strictEqual(mapped.inn, "770123456789");
		assert.strictEqual(mapped.omsPolicyNumber, "1234567890123456");
		assert.strictEqual(mapped.registrationAddress, "г. Самара, ул. Куйбышева, д. 10");
		assert.strictEqual(mapped.representativeFullName, "Морозов Виктор Петрович");
		assert.strictEqual(mapped.representativeType, "Отец");
		assert.strictEqual(mapped.patientBalanceRub, -4500);
		assert.strictEqual(mapped.acquisitionSource, "yandex_maps");

		const safety = resolveInitialSafetyProfile(rawPatient);
		assert.strictEqual(safety.hasAnestheticAllergy, true);
		assert.strictEqual(safety.hasPenicillinAllergy, true);
		assert.strictEqual(safety.hasAnticoagulantTherapy, true);
	});

	it("13. syncCreationDraftsToStore persists somatic norm without creating incomplete representative", () => {
		let adminDraft: any = {};
		let coreDraft: any = { notes: "" };
		syncCreationDraftsToStore(
			{
				setPatientAdministrativeProfileDraft: (fn) => {
					adminDraft = fn(adminDraft);
				},
				setPatientCoreDraft: (fn) => {
					coreDraft = fn(coreDraft);
				},
			},
			{
				advertisingSource: "prodoctorov",
				isChild: true,
				parentRole: "Мама",
				parentName: "   ",
				parentPhone: "",
				isSomaticNorm: true,
			},
		);
		assert.strictEqual(adminDraft.preferredAppointmentNote, "src:prodoctorov");
		assert.strictEqual(adminDraft.legalRepresentativeRelationship, undefined);
		assert.ok(coreDraft.notes.includes("Соматически здоров"));
	});
});
