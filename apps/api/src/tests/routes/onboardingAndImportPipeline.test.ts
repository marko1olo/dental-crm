import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import Fastify from "fastify";
import { eq } from "drizzle-orm";
import { organizations, patients, serviceCatalogItems } from "../../db/schema.js";
import {
	importPatientsStream,
	importPricelistStream,
	normalizePricelistCategory,
	parseDelimitedTextToMatrix,
	parseDurationNumber,
	parsePriceNumber,
} from "../../services/import/streamingDataImporter.js";
import { registerOnboardingRoutes } from "../../routes/onboarding/index.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";

const ONBOARD_ORG_ID = fixtureUuid("onboardingAndImportPipeline", 1);
const OWNER_ID = fixtureUuid("onboardingAndImportPipeline", 2);

describe("Onboarding & Streaming Data Importer Suite (Real PG18 + FORCE RLS)", () => {
	let dbAvailable = true;

	before(async () => {
		try {
			await purgeFixtureOrganizations([ONBOARD_ORG_ID]);
			await withFixtureTenant(ONBOARD_ORG_ID, async (tx) => {
				await tx
					.insert(organizations)
					.values({
						id: ONBOARD_ORG_ID,
						name: "Тестовая клиника онбординга и импорта",
						clinicMode: "solo_doctor",
					})
					.onConflictDoUpdate({
						target: organizations.id,
						set: {
							name: "Тестовая клиника онбординга и импорта",
							clinicMode: "solo_doctor",
							clinicSchedule: {},
							workspaceFeatureFlags: {},
						},
					});
			});
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
			await purgeFixtureOrganizations([ONBOARD_ORG_ID]);
		}
	});

	describe("1. Delimited Matrix Parsing & Normalization", () => {
		it("parses standard semicolon-delimited CSV with UTF-8 BOM", () => {
			const csv =
				"\uFEFFФИО;Телефон;Дата рождения;Комментарий\nИванов Иван;+79991234567;15.05.1985;Осмотр\nПетров Петр;89997654321;20.10.1992;Кариес";
			const matrix = parseDelimitedTextToMatrix(csv);
			assert.strictEqual(matrix.length, 3);
			assert.deepStrictEqual(matrix[0], ["ФИО", "Телефон", "Дата рождения", "Комментарий"]);
			assert.strictEqual(matrix[1]?.[0], "Иванов Иван");
			assert.strictEqual(matrix[1]?.[1], "+79991234567");
		});

		it("parses comma-separated values with escaped quotes and multiline cells", () => {
			const csv =
				'Name,Phone,Notes\n"Smith, John",+1234567890,"Patient notes;\nline 2"\n"Doe, Jane",+1987654321,"Regular checkup"';
			const matrix = parseDelimitedTextToMatrix(csv);
			assert.strictEqual(matrix.length, 3);
			assert.strictEqual(matrix[1]?.[0], "Smith, John");
			assert.strictEqual(matrix[1]?.[1], "+1234567890");
		});

		it("normalizes clinical service categories, prices and durations", () => {
			assert.strictEqual(normalizePricelistCategory("Лечение кариеса"), "therapy");
			assert.strictEqual(normalizePricelistCategory("Хирургическая операция"), "surgery");
			assert.strictEqual(normalizePricelistCategory("Коронка металлокерамика"), "prosthetics");
			assert.strictEqual(normalizePricelistCategory("Брекеты Damon"), "orthodontics");
			assert.strictEqual(normalizePricelistCategory("Профессиональная гигиена"), "hygiene");
			assert.strictEqual(normalizePricelistCategory("Пародонтологическая чистка"), "periodontology");
			assert.strictEqual(normalizePricelistCategory("КТ 2 челюстей"), "imaging");
			assert.strictEqual(normalizePricelistCategory("Первичный осмотр врача"), "consultation");
			assert.strictEqual(normalizePricelistCategory("Неизвестная строка"), "other");
			assert.strictEqual(parsePriceNumber("4 500,50 руб"), 4500.5);
			assert.strictEqual(parsePriceNumber("бесплатно"), 0);
			assert.strictEqual(parseDurationNumber("45 минут"), 45);
			assert.strictEqual(parseDurationNumber("1 час"), 60);
		});
	});

	describe("2. Real PG18 Streaming Importer with FORCE RLS Key Lookup & Commit", () => {
		it("commits patients in PG18 and detects existing DB duplicates via batch key query", async (t) => {
			if (!dbAvailable) return t.skip("Database not available");

			const commitCsv =
				"ФИО;Телефон;Дата рождения;Комментарий\nСидоров Алексей;+7 (916) 111-22-33;01.01.1990;Первичный\n;89001112233;02.02.1992;Без имени";
			const committed = await importPatientsStream({
				organizationId: ONBOARD_ORG_ID,
				bufferOrText: commitCsv,
				filename: "patients_commit.csv",
				commit: true,
			});

			assert.strictEqual(committed.totalRows, 2);
			assert.strictEqual(committed.readyRows, 1);
			assert.strictEqual(committed.blockedRows, 1);
			assert.strictEqual(committed.importedCount, 1);
			assert.strictEqual(committed.importedPatientIds.length, 1);

			// Повторный прогон по живой БД обязан отловить дубликат по ключу (без полного SELECT *)
			const dupeCsv =
				"ФИО;Телефон\nСидоров Алексей;+79161112233\nНовый Пациент;+79169998877";
			const preview = await importPatientsStream({
				organizationId: ONBOARD_ORG_ID,
				bufferOrText: dupeCsv,
				filename: "patients_dupe.csv",
				commit: false,
			});

			assert.strictEqual(preview.totalRows, 2);
			assert.strictEqual(preview.warningRows, 1);
			assert.strictEqual(preview.readyRows, 1);
			assert.strictEqual(preview.items[0]?.status, "warning");
			assert.ok(preview.items[0]?.warning?.includes("Дубликат"));
			assert.strictEqual(preview.items[1]?.status, "ready");
		});

		it("commits pricelist stream with BIGINT priceKopecks and resolves conflicting codes", async (t) => {
			if (!dbAvailable) return t.skip("Database not available");

			const csv =
				"Код;Услуга;Цена;Категория;Длительность\n;Консультация ортопеда;2 000;Консультация;30 мин\nA16.07.002;Пломбирование зуба;4 800,50;Терапия;60";
			const committed = await importPricelistStream({
				organizationId: ONBOARD_ORG_ID,
				bufferOrText: csv,
				filename: "prices_commit.csv",
				commit: true,
			});

			assert.strictEqual(committed.totalRows, 2);
			assert.strictEqual(committed.importedCount, 2);
			assert.strictEqual(committed.importedItemIds.length, 2);

			await withFixtureTenant(ONBOARD_ORG_ID, async (tx) => {
				const saved = await tx
					.select()
					.from(serviceCatalogItems)
					.where(eq(serviceCatalogItems.organizationId, ONBOARD_ORG_ID));
				const filling = saved.find((s) => s.code === "A16.07.002");
				assert.ok(filling, "Услуга A16.07.002 должна быть сохранена в БД");
				assert.strictEqual(Number(filling.priceKopecks), 480050);
			});

			// Повторный импорт с тем же кодом не падает, а автоматически разрешает коллизию кода
			const second = await importPricelistStream({
				organizationId: ONBOARD_ORG_ID,
				bufferOrText: "Код;Услуга;Цена;Категория\nA16.07.002;Пломба повтор;5 000;Терапия",
				filename: "prices_second.csv",
				commit: false,
			});
			assert.strictEqual(second.items[0]?.code, "A16.07.002-2");
		});
	});

	describe("3. Onboarding HTTP Routes & COUNT(*) Status under defineStreamRoute", () => {
		it("persists schedule/chairs and returns SQL COUNT(*) counts in GET /api/onboarding/status", async (t) => {
			if (!dbAvailable) return t.skip("Database not available");

			const app = Fastify();
			await registerOnboardingRoutes(app);
			await app.ready();

			process.env.AUTH_TOKEN_SECRET =
				process.env.AUTH_TOKEN_SECRET || "test-only-synthetic-secret-32chars-min";
			const clinicToken = signToken({ organizationId: ONBOARD_ORG_ID }, authTokenSecret(), 3600);
			const staffToken = signToken(
				{ organizationId: ONBOARD_ORG_ID, userId: OWNER_ID, role: "owner" },
				authTokenSecret(),
				3600,
			);

			try {
				const completeRes = await app.inject({
					method: "POST",
					url: "/api/onboarding/complete",
					headers: {
						"x-dente-clinic-token": clinicToken,
						"x-dente-staff-token": staffToken,
					},
					payload: {
						profile: {
							clinicName: "Клиника Графика",
							phone: "+7 (999) 123-45-67",
							timezone: "Europe/Moscow",
							mode: "small_clinic",
						},
						chairs: [{ name: "Кресло 1" }, { name: "Кресло 2" }],
						schedule: {
							workdayStart: "08:30",
							workdayEnd: "21:00",
							workingDays: [1, 2, 3, 4, 5, 6],
							defaultVisitMinutes: 45,
							appointmentBufferMinutes: 10,
						},
						preset: "small_clinic",
					},
				});
				assert.strictEqual(completeRes.statusCode, 200, completeRes.body);

				const statusRes = await app.inject({
					method: "GET",
					url: "/api/onboarding/status",
					headers: {
						"x-dente-clinic-token": clinicToken,
						"x-dente-staff-token": staffToken,
					},
				});
				assert.strictEqual(statusRes.statusCode, 200, statusRes.body);
				const statusBody = statusRes.json() as {
					completed: boolean;
					mode: string;
					chairsCount: number;
					servicesCount: number;
					schedule: {
						workdayStart?: string;
						workdayEnd?: string;
						workingDays?: number[];
						appointmentBufferMinutes?: number;
					} | null;
					defaultVisitMinutes: number;
				};
				assert.strictEqual(statusBody.completed, true);
				assert.strictEqual(statusBody.mode, "small_clinic");
				assert.strictEqual(statusBody.chairsCount, 2);
				assert.ok(statusBody.servicesCount >= 2);
				assert.strictEqual(statusBody.defaultVisitMinutes, 45);
				assert.deepStrictEqual(statusBody.schedule, {
					workdayStart: "08:30",
					workdayEnd: "21:00",
					workingDays: [1, 2, 3, 4, 5, 6],
					appointmentBufferMinutes: 10,
				});

				// Проверяем /api/onboarding/import/upload + /commit через Fastify
				const uploadRes = await app.inject({
					method: "POST",
					url: "/api/onboarding/import/upload",
					headers: {
						"x-dente-clinic-token": clinicToken,
						"x-dente-staff-token": staffToken,
					},
					payload: {
						type: "patients",
						filename: "onboard.csv",
						rawText: "ФИО;Телефон\nАнтонова Ольга;+79152223344",
					},
				});
				assert.strictEqual(uploadRes.statusCode, 200, uploadRes.body);
				assert.strictEqual((uploadRes.json() as { readyRows: number }).readyRows, 1);

				const commitRes = await app.inject({
					method: "POST",
					url: "/api/onboarding/import/commit",
					headers: {
						"x-dente-clinic-token": clinicToken,
						"x-dente-staff-token": staffToken,
					},
					payload: {
						type: "patients",
						filename: "onboard.csv",
						rawText: "ФИО;Телефон\nАнтонова Ольга;+79152223344",
					},
				});
				assert.strictEqual(commitRes.statusCode, 200, commitRes.body);
				assert.strictEqual((commitRes.json() as { importedCount: number }).importedCount, 1);

				await withFixtureTenant(ONBOARD_ORG_ID, async (tx) => {
					const rows = await tx
						.select({ id: patients.id })
						.from(patients)
						.where(eq(patients.organizationId, ONBOARD_ORG_ID));
					assert.ok(rows.length >= 2);
				});
			} finally {
				await app.close();
			}
		});
	});
});
