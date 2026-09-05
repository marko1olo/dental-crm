import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isDoctorOrClinicalSigner } from "../diary.js";

describe("Diary Clinical Roles & Doctor Autonomy (Mandates 8e, 8n)", () => {
	it("allows all core clinical dental specialties to sign and lock diaries", () => {
		const clinicalSpecialties = [
			"doctor",
			"therapist",
			"surgeon",
			"orthopedist",
			"orthodontist",
			"periodontist",
			"implantologist",
			"hygienist",
			"radiologist",
		];

		for (const role of clinicalSpecialties) {
			assert.equal(
				isDoctorOrClinicalSigner(role),
				true,
				`Specialty role «${role}» must be permitted to sign and lock diaries without 403`,
			);
		}
	});

	it("allows clinic leadership and administrative authorities to sign diaries", () => {
		const leadershipRoles = [
			"admin",
			"owner",
			"head_doctor",
			"chief_doctor",
			"chiefdoctor",
			"cmo",
		];

		for (const role of leadershipRoles) {
			assert.equal(
				isDoctorOrClinicalSigner(role),
				true,
				`Leadership role «${role}» must be permitted to sign diaries`,
			);
		}
	});

	it("handles case-insensitive role names gracefully", () => {
		assert.equal(isDoctorOrClinicalSigner("Doctor"), true);
		assert.equal(isDoctorOrClinicalSigner("SURGEON"), true);
		assert.equal(isDoctorOrClinicalSigner("Chief_Doctor"), true);
		assert.equal(isDoctorOrClinicalSigner("ADMIN"), true);
	});

	it("forbids non-doctor/non-clinical-signer roles from signing medical diaries", () => {
		const nonSignerRoles = [
			"marketer",
			"receptionist",
			"patient",
			"accountant",
			"cashier",
			"assistant",
			"nurse",
			"call_center",
			"guest",
			"",
		];

		for (const role of nonSignerRoles) {
			assert.equal(
				isDoctorOrClinicalSigner(role),
				false,
				`Non-signer role «${role}» must not be authorized to sign diaries`,
			);
		}
	});
});
