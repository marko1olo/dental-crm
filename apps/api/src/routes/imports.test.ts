import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import Fastify from "fastify";
import type { ImportPreviewRequest } from "@dental/shared";
import { organizations } from "../db/schema.js";
import { authTokenSecret } from "../security/authSecret.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../tests/support/fixtureOrganizations.js";
import { signToken } from "../utils/cryptoHelper.js";
import {
	buildPatientImportIntake,
	commitPatientImport,
	registerImportRoutes,
} from "./imports.js";

const ORG_A_ID = fixtureUuid("routesImportsTest", 1);
const ORG_B_ID = fixtureUuid("routesImportsTest", 2);
const OWNER_A_ID = fixtureUuid("routesImportsTest", 3);

describe("buildPatientImportIntake & /api/imports/patients/* (Real PG18 + FORCE RLS)", () => {
	let dbAvailable = true;

	before(async () => {
		try {
			await purgeFixtureOrganizations([ORG_A_ID, ORG_B_ID]);
			for (const [id, name] of [
				[ORG_A_ID, "Клиника Импорт А"],
				[ORG_B_ID, "Клиника Импорт Б"],
			] as const) {
				await withFixtureTenant(id, async (tx) => {
					await tx
						.insert(organizations)
						.values({ id, name, clinicMode: "solo_doctor" })
						.onConflictDoNothing();
				});
			}
		} catch (err) {
			if (isDatabaseUnavailable(err)) {
				dbAvailable = false;
				return;
			}
			throw err;
		}
	});

	after(async () => {
		if (dbAvailable) {
			await purgeFixtureOrganizations([ORG_A_ID, ORG_B_ID]);
		}
	});

	test("processes unstructured text and normalizes it with real tenant DB lookup", async (t) => {
		if (!dbAvailable) return t.skip("Database not available");

		const input: ImportPreviewRequest = {
			sourceName: "test-source",
			sourceKind: "free_text",
			rawText: "Иванов Иван Иванович 89001234567 01.01.1990 жалоба на боль",
		};

		const result = await buildPatientImportIntake(ORG_A_ID, input);

		assert.strictEqual(result.sourceName, "test-source");
		assert.strictEqual(result.sourceKind, "free_text");
		assert.ok(result.normalizedText.includes("ФИО;Телефон;Дата рождения;Комментарий"));
		assert.ok(
			result.normalizedText.includes(
				"Иванов Иван Иванович;+79001234567;1990-01-01;Иванов Иван Иванович 89001234567 01.01.1990 жалоба на боль",
			),
		);
		assert.strictEqual(result.recognitionNotes.length, 2);
		assert.strictEqual(result.preview.readyRows, 1);
	});

	test("processes image_ocr and voice_dictation notes and empty rawText", async (t) => {
		if (!dbAvailable) return t.skip("Database not available");

		const ocrRes = await buildPatientImportIntake(ORG_A_ID, {
			sourceName: "ocr-source",
			sourceKind: "image_ocr",
			rawText: "Петров Петр 89111234567",
		});
		assert.strictEqual(ocrRes.recognitionNotes.length, 3);
		assert.ok(ocrRes.recognitionNotes[2]?.includes("OCR/vision worker"));

		const voiceRes = await buildPatientImportIntake(ORG_A_ID, {
			sourceName: "voice-source",
			sourceKind: "voice_dictation",
			rawText: "Смирнова Анна 89221234567",
		});
		assert.strictEqual(voiceRes.recognitionNotes.length, 3);
		assert.ok(voiceRes.recognitionNotes[2]?.includes("Диктовка превращается"));

		const emptyRes = await buildPatientImportIntake(ORG_A_ID, {
			sourceName: "empty-source",
			sourceKind: "free_text",
			rawText: "   \n\r\n   ",
		});
		assert.strictEqual(emptyRes.preview.totalRows, 0);
	});

	test("flags intra-file duplicates AND cross-commit PG18 duplicates while keeping tenants isolated", async (t) => {
		if (!dbAvailable) return t.skip("Database not available");

		const dupInput: ImportPreviewRequest = {
			sourceName: "dup-file.csv",
			sourceKind: "csv_text",
			rawText:
				"ФИО;Телефон\nКовалёв Сергей;+79005556677\nКовалёв Сергей;+79005556677",
		};
		const dupIntake = await buildPatientImportIntake(ORG_A_ID, dupInput);
		assert.strictEqual(dupIntake.preview.totalRows, 2);
		assert.strictEqual(dupIntake.preview.readyRows, 1);
		assert.strictEqual(dupIntake.preview.warningRows, 1);
		assert.strictEqual(dupIntake.preview.rows[1]?.status, "warning");

		// Коммитим в ORG_A_ID
		const commitResult = await commitPatientImport(ORG_A_ID, dupInput);
		assert.strictEqual(commitResult.importedCount, 1);

		// В ORG_A_ID повторный импорт того же пациента ловится под FORCE RLS как дубликат
		const secondIntakeA = await buildPatientImportIntake(ORG_A_ID, {
			sourceName: "dup-file-2.csv",
			sourceKind: "csv_text",
			rawText: "ФИО;Телефон\nКовалёв Сергей;+79005556677",
		});
		assert.strictEqual(secondIntakeA.preview.warningRows, 1);

		// В ORG_B_ID тот же пациент НЕ конфликтует (изоляция арендаторов)
		const intakeB = await buildPatientImportIntake(ORG_B_ID, {
			sourceName: "org-b.csv",
			sourceKind: "csv_text",
			rawText: "ФИО;Телефон\nКовалёв Сергей;+79005556677",
		});
		assert.strictEqual(intakeB.preview.readyRows, 1);
	});

	test("Fastify routes /api/imports/patients/{intake,preview,commit} work end-to-end", async (t) => {
		if (!dbAvailable) return t.skip("Database not available");

		process.env.AUTH_TOKEN_SECRET =
			process.env.AUTH_TOKEN_SECRET || "test-only-synthetic-secret-32chars-min";
		const secret = authTokenSecret();
		const clinicToken = signToken({ organizationId: ORG_A_ID }, secret, 3600);
		const staffToken = signToken(
			{ organizationId: ORG_A_ID, userId: OWNER_A_ID, role: "owner" },
			secret,
			3600,
		);

		const app = Fastify();
		await registerImportRoutes(app);
		await app.ready();

		try {
			const res = await app.inject({
				method: "POST",
				url: "/api/imports/patients/commit",
				headers: {
					"x-dente-clinic-token": clinicToken,
					"x-dente-staff-token": staffToken,
				},
				payload: {
					sourceName: "http-route.csv",
					sourceKind: "csv_text",
					rawText: "ФИО;Телефон\nОрлова Елена;+79031112299",
				},
			});
			assert.strictEqual(res.statusCode, 200, res.body);
			const body = res.json() as { importedCount: number };
			assert.strictEqual(body.importedCount, 1);
		} finally {
			await app.close();
		}
	});
});
