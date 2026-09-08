import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dynamic import supporting both tsx/esm resolution from src and built js from dist
let isDoctorOrClinicalSigner: (role: string) => boolean;

try {
	const srcModule = await import("../src/routes/diary.js");
	if (typeof srcModule.isDoctorOrClinicalSigner === "function") {
		isDoctorOrClinicalSigner = srcModule.isDoctorOrClinicalSigner;
	}
} catch {
	// Fallback to dist if executed under raw node without tsx loader
}

if (!isDoctorOrClinicalSigner!) {
	const distModule = await import("../dist/routes/diary.js");
	if (typeof distModule.isDoctorOrClinicalSigner === "function") {
		isDoctorOrClinicalSigner = distModule.isDoctorOrClinicalSigner;
	} else {
		throw new Error(
			"Unable to load isDoctorOrClinicalSigner from either src or dist",
		);
	}
}

describe("Wave 48 (Feature 230): Doctor Autonomy & Lock Revision Parity (Mandates 8e, 8i)", () => {
	const routesDir = path.resolve(__dirname, "../src/routes");
	const diaryPath = path.join(routesDir, "diary.ts");
	const filesPath = path.join(routesDir, "files.ts");
	const sterilizationPath = path.join(routesDir, "sterilization.ts");

	it("1. diary.ts has canonical Mandate 8e revision message and no misleading admin-only assertion", () => {
		const content = fs.readFileSync(diaryPath, "utf8");

		const canonicalDiaryMessage =
			"Дневник этого приёма уже подписан и заблокирован, второй раз подписывать его не нужно. Если нужна правка, внесите её через ревизию («Исправленному верить») — прежний текст надёжно сохранится в истории версий.";
		const obsoleteAdminAssertion = "её проводит администратор клиники";

		assert.ok(
			content.includes(canonicalDiaryMessage),
			`diary.ts must contain canonical Mandate 8e message: "${canonicalDiaryMessage}"`,
		);
		assert.ok(
			!content.includes(obsoleteAdminAssertion),
			`diary.ts must NOT contain obsolete text: "${obsoleteAdminAssertion}"`,
		);
	});

	it("2. files.ts has canonical Mandate 8e revision message for clinical photo/X-ray attachments", () => {
		const content = fs.readFileSync(filesPath, "utf8");

		const canonicalFilesMessage =
			"Дневник приёма уже подписан. Если необходимо добавить новые клинические фото или рентген-снимки к визиту, внесите правку через ревизию («Исправленному верить»).";
		const obsoleteFilesAssertion =
			"Правку вносит администратор через ревизию";

		assert.ok(
			content.includes(canonicalFilesMessage),
			`files.ts must contain canonical Mandate 8e message: "${canonicalFilesMessage}"`,
		);
		assert.ok(
			!content.includes(obsoleteFilesAssertion),
			`files.ts must NOT contain obsolete text: "${obsoleteFilesAssertion}"`,
		);
	});

	it("3. sterilization.ts has canonical Mandate 8e revision message for tray packaging adjustments", () => {
		const content = fs.readFileSync(sterilizationPath, "utf8");

		const canonicalSterilizationMessage =
			"Дневник приема уже подписан — изменить инструментальный лоток в 043/у нельзя. Если упаковка указана неверно, внесите правку через ревизию («Исправленному верить»).";
		const obsoleteSterilizationAssertion =
			"правку вносит администратор через ревизию дневника";

		assert.ok(
			content.includes(canonicalSterilizationMessage),
			`sterilization.ts must contain canonical Mandate 8e message: "${canonicalSterilizationMessage}"`,
		);
		assert.ok(
			!content.includes(obsoleteSterilizationAssertion),
			`sterilization.ts must NOT contain obsolete text: "${obsoleteSterilizationAssertion}"`,
		);
	});

	it("4. isDoctorOrClinicalSigner authorizes doctor and clinical specialists for diary revision (Mandates 8e, 8n)", () => {
		// Doctor primary check as mandated
		assert.equal(
			isDoctorOrClinicalSigner("doctor"),
			true,
			'isDoctorOrClinicalSigner("doctor") must be true',
		);

		// Case-insensitivity checks
		assert.equal(isDoctorOrClinicalSigner("Doctor"), true);
		assert.equal(isDoctorOrClinicalSigner("DOCTOR"), true);

		// Clinical specialties autonomy
		const clinicalSpecialties = [
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
				`Role ${role} must be authorized to sign and revise diaries`,
			);
		}

		// Administrative leadership roles
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
				`Role ${role} must be authorized to revise diaries`,
			);
		}

		// Non-signer roles must be forbidden
		const nonSigners = [
			"receptionist",
			"patient",
			"accountant",
			"cashier",
			"marketer",
			"call_center",
			"guest",
		];
		for (const role of nonSigners) {
			assert.equal(
				isDoctorOrClinicalSigner(role),
				false,
				`Non-signer role ${role} must not be authorized to revise diaries`,
			);
		}
	});
});
