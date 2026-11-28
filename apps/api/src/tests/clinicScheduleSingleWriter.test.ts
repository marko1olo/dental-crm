import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import {
	clinicModeSchema,
	clinicScheduleDefaultsSchema,
} from "@dental/shared";
import {
	getClinicSettingsFromDb,
	updateClinicModeInDb,
	updateClinicProfileInDb,
} from "../db/settings/clinicProfileQueries.js";
import { organizations } from "../db/schema.js";
import { resolveDaySchedule } from "../routes/publicBooking/slotAvailabilityEngine.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "./support/fixtureOrganizations.js";

const ORG_ID = fixtureUuid("clinicScheduleSingleWriter", 1);

describe("единый канон формата clinicSchedule и clinicMode (6Г)", () => {
	let databaseAvailable = true;
	const prevPersistence = process.env.DENTE_STATE_PERSISTENCE;

	before(async () => {
		process.env.DENTE_STATE_PERSISTENCE = "database";
		try {
			await purgeFixtureOrganizations([ORG_ID]);
			await withFixtureTenant(ORG_ID, async (tx) => {
				await tx.insert(organizations).values({
					id: ORG_ID,
					name: "Тестовая клиника Single Writer",
					clinicMode: "small_clinic",
				});
			});
		} catch (error) {
			if (!isDatabaseUnavailable(error)) throw error;
			databaseAvailable = false;
		}
	});

	after(async () => {
		if (databaseAvailable) {
			await purgeFixtureOrganizations([ORG_ID]);
		}
		if (prevPersistence === undefined) delete process.env.DENTE_STATE_PERSISTENCE;
		else process.env.DENTE_STATE_PERSISTENCE = prevPersistence;
	});

	test("формат единственного писателя графика — тот, который читают настройки", () => {
		const settingsShape = {
			workdayStart: "08:00",
			workdayEnd: "20:00",
			workingDays: [1, 2, 3, 4, 5],
			appointmentBufferMinutes: 15,
		};
		assert.equal(
			clinicScheduleDefaultsSchema.safeParse(settingsShape).success,
			true,
			"формат экрана настроек должен проходить разбор графика",
		);
		assert.equal(
			clinicScheduleDefaultsSchema.safeParse({
				workHours: [9, 18],
				specs: ["therapy"],
			}).success,
			false,
			"старая раскладка мастера первого запуска не должна проходить разбор",
		);
	});

	test("словарь режимов не пуст и принимает только канонические значения", () => {
		assert.ok(clinicModeSchema.options.length >= 2);
		assert.equal(clinicModeSchema.safeParse("single").success, false);
		assert.equal(clinicModeSchema.safeParse("network").success, false);
		assert.equal(clinicModeSchema.safeParse("demo").success, false);
		assert.equal(clinicModeSchema.safeParse("solo_doctor").success, true);
		assert.equal(clinicModeSchema.safeParse("small_clinic").success, true);
	});

	test("resolveDaySchedule корректно разбирает канонические настройки и сменные дни", () => {
		const canonical = resolveDaySchedule(
			{
				workdayStart: "09:30",
				workdayEnd: "19:30",
				workingDays: [1, 2, 3],
			},
			2,
		);
		assert.equal(canonical.isWorking, true);
		assert.equal(canonical.openMinute, 9 * 60 + 30);
		assert.equal(canonical.closeMinute, 19 * 60 + 30);

		const dayOff = resolveDaySchedule(
			{
				workdayStart: "09:30",
				workdayEnd: "19:30",
				workingDays: [1, 2, 3],
			},
			5,
		);
		assert.equal(dayOff.isWorking, false);
	});

	test("updateClinicProfileInDb и updateClinicModeInDb сохраняют формат без потерь на чтении из PG18", async (context) => {
		if (!databaseAvailable) return context.skip("DB unavailable");
		await updateClinicModeInDb(ORG_ID, "solo_doctor");
		await updateClinicProfileInDb(ORG_ID, {
			scheduleDefaults: {
				workdayStart: "09:00",
				workdayEnd: "21:00",
				workingDays: [1, 2, 3, 4, 5, 6],
				appointmentBufferMinutes: 10,
			},
		});

		const settings = await getClinicSettingsFromDb(ORG_ID);
		assert.equal(settings.soloDoctorMode, true);
		assert.equal(settings.profile.scheduleDefaults?.workdayStart, "09:00");
		assert.equal(settings.profile.scheduleDefaults?.workdayEnd, "21:00");
		assert.deepEqual(settings.profile.scheduleDefaults?.workingDays, [1, 2, 3, 4, 5, 6]);
		assert.equal(settings.profile.scheduleDefaults?.appointmentBufferMinutes, 10);
	});
});
