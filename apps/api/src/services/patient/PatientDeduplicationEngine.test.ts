import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
import {
	PatientDeduplicationEngine,
	type PatientIdentityData,
} from "./PatientDeduplicationEngine.js";

describe("PatientDeduplicationEngine — Feature #322 Patient Deduplication Engine", () => {
	const patient1: PatientIdentityData = {
		id: "pat-1",
		fullName: "Иванов Иван Иванович",
		birthDate: "1985-05-15",
		phone: "+7 (999) 111-22-33",
		snils: "123-456-789 01",
		identityDocument: "4509 123456",
	};

	const patientExactDuplicate: PatientIdentityData = {
		id: "pat-2",
		fullName: "Иванов И.И.",
		birthDate: "1985-05-15",
		phone: "+79991112233", // Same normalized phone
		snils: null,
		identityDocument: null,
	};

	const patientFuzzyDuplicate: PatientIdentityData = {
		id: "pat-3",
		fullName: "Иванов Иван", // Same prefix + same birth date
		birthDate: "1985-05-15",
		phone: "+79998887766",
		snils: null,
		identityDocument: null,
	};

	const patientDifferent: PatientIdentityData = {
		id: "pat-4",
		fullName: "Петров Петр Петрович",
		birthDate: "1990-10-20",
		phone: "+79997776655",
		snils: "987-654-321 00",
		identityDocument: "4510 654321",
	};

	test("1. Detects exact duplicates by phone/SNILS/passport", () => {
		assert.equal(PatientDeduplicationEngine.isExactMatch(patient1, patientExactDuplicate), true);
		assert.equal(PatientDeduplicationEngine.isExactMatch(patient1, patientDifferent), false);
	});

	test("2. Detects fuzzy duplicates by FullName + BirthDate", () => {
		assert.equal(PatientDeduplicationEngine.isFuzzyMatch(patient1, patientFuzzyDuplicate), true);
		assert.equal(PatientDeduplicationEngine.isFuzzyMatch(patient1, patientDifferent), false);
	});
});
