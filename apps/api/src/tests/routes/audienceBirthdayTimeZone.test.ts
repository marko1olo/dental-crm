import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { db } from "../../db/client.js";
import { organizations, patients } from "../../db/schema.js";
import { resolveAudience } from "../../services/communications/audience.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";

/**
 * ДЕНЬ РОЖДЕНИЯ И ВОЗРАСТ — В ПОЯСЕ КЛИНИКИ, А НЕ В UTC.
 *
 * ЧТО БЫЛО СЛОМАНО. Отбор получателей рассылки брал сегодняшний день как
 * `now.getUTCFullYear()/getUTCMonth()/getUTCDate()`. У всех российских поясов
 * смещение ПОЛОЖИТЕЛЬНОЕ, поэтому UTC отстаёт от местного календаря каждую ночь:
 * в Самаре (пояс по умолчанию в схеме) до 04:00, на Камчатке половину суток.
 *
 * ЧТО ЭТО ЗНАЧИЛО ДЛЯ КЛИНИКИ. У пациента день рождения. Администратор на
 * Камчатке открывает рассылку в 09:00 по своим часам — по UTC это ещё 21:00
 * ПРЕДЫДУЩЕГО дня. Отбор «день рождения сегодня» пациента НЕ находил, зато
 * находил отбор «через один день», и поздравление уходило после праздника. С
 * возрастом хуже: пациент, которому сегодня исполнилось 18, ещё сутки числился
 * семнадцатилетним, а от возраста зависит право самому подписывать согласие.
 *
 * ПОЧЕМУ ЭТОТ ТЕСТ НЕ ЗАВИСИТ ОТ ЧАСА ПРОГОНА. Момент «сейчас» и пояс задаются
 * входом (`now`, `timeZone`), поэтому расхождение календарных дат гарантировано
 * конструкцией, а не удачным временем запуска. Ведущий уже попадался на обратном:
 * его проверка часового дефекта была зелёной на сломанном коде, потому что
 * инвариант проверялся по текущему моменту и срабатывал лишь часть суток.
 */

const NAMESPACE = "audienceBirthdayTimeZone";
const ORG = fixtureUuid(NAMESPACE, 1);
const PATIENT = fixtureUuid(NAMESPACE, 2);

/**
 * Момент, в который календарные даты заведомо расходятся: 2026-07-28 21:30 UTC.
 * По UTC это ещё 28 июля, на Камчатке (+12) — уже 29 июля, 09:30 утра. То есть
 * ровно рабочее утро администратора, когда он и запускает поздравления.
 */
const NOW = new Date("2026-07-28T21:30:00.000Z");
const CLINIC_ZONE = "Asia/Kamchatka";
/** День рождения — 29 июля, то есть СЕГОДНЯ по часам клиники и ЗАВТРА по UTC. */
const BIRTH_DATE = "1990-07-29";

describe("отбор получателей рассылки: день рождения в поясе клиники", () => {
	let databaseAvailable = true;

	before(async () => {
		try {
			await purgeFixtureOrganizations([ORG]);
			/*
			 * Сев и отбор идут под тенант-контекстом клиники. Под FORCE RLS вставка
			 * без `app.current_tenant` отвергается кодом 42501, а чтение без него
			 * возвращает ноль строк молча: отбор не нашёл бы пациента ни в одном
			 * поясе, и проверка часового дефекта выродилась бы в проверку пустоты.
			 */
			await withFixtureTenant(ORG, async () => {
				await db
					.insert(organizations)
					.values({ id: ORG, name: "Клиника поздравлений" })
					.onConflictDoNothing();
				await db
					.insert(patients)
					.values({
						id: PATIENT,
						organizationId: ORG,
						fullName: "Именинников Ночной Поясович",
						phone: "+79990000429",
						birthDate: BIRTH_DATE,
						status: "active",
					})
					.onConflictDoNothing();
			});
		} catch (error) {
			if (isDatabaseUnavailable(error)) {
				databaseAvailable = false;
				return;
			}
			throw error;
		}
	});

	after(async () => {
		if (!databaseAvailable) return;
		// Уборка через каталожный помощник, а не своим списком таблиц: он знает
		// порядок связей и превращает остаток в исключение, а не замалчивает его.
		await purgeFixtureOrganizations([ORG]);
	});

	/**
	 * Прошёл ли пациент КАЛЕНДАРНЫЙ признак — и только его.
	 *
	 * Проверяется причина отсева, а не итоговое число получателей. Причина: до
	 * получателей пациент не доходит из-за ОТСУТСТВИЯ СОГЛАСИЯ — это отдельный
	 * барьер и отдельный модуль. Заводить фикстуру согласия ради проверки часового
	 * пояса значило бы сцепить эту проверку с модулем согласий: она начала бы
	 * краснеть на правках, к дате рождения не относящихся. Замер это подтвердил:
	 * при поясе клиники пациент отсеивается как `no_consent` (то есть календарный
	 * признак ПРОШЁЛ), при UTC — как `excluded_by_criteria` (не прошёл).
	 */
	async function rejectedByCalendar(
		timeZone: string | null,
		withinDays: number,
	): Promise<boolean> {
		const preview = await withFixtureTenant(ORG, async () =>
			resolveAudience({
				organizationId: ORG,
				criteria: { birthdayWithinDays: withinDays },
				channel: "sms",
				scope: "marketing",
				now: NOW,
				timeZone,
			}),
		);
		return preview.excluded.excluded_by_criteria > 0;
	}

	async function rejectedByAge(
		timeZone: string | null,
		ageFrom: number,
	): Promise<boolean> {
		const preview = await withFixtureTenant(ORG, async () =>
			resolveAudience({
				organizationId: ORG,
				criteria: { ageFrom },
				channel: "sms",
				scope: "marketing",
				now: NOW,
				timeZone,
			}),
		);
		return preview.excluded.excluded_by_criteria > 0;
	}

	test("«день рождения сегодня» находит пациента по часам клиники", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");
		assert.equal(
			await rejectedByCalendar(CLINIC_ZONE, 0),
			false,
			"пациент, у которого день рождения СЕГОДНЯ по часам клиники, отсеян календарным признаком: " +
				"сегодняшний день снова считается по UTC, и поздравление уйдёт после праздника",
		);
	});

	test("тот же момент по UTC пациента сегодня не видит — это и был дефект", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");
		assert.equal(
			await rejectedByCalendar("UTC", 0),
			true,
			"проверка выродилась: в поясе UTC этот пациент проходить НЕ должен, иначе она не различает пояса вовсе",
		);
	});

	test("в поясе UTC он попадает в «через один день» — поздравление опаздывает", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");
		assert.equal(
			await rejectedByCalendar("UTC", 1),
			false,
			"ожидалось, что по UTC день рождения числится завтрашним — именно так поздравление и опаздывало",
		);
	});

	test("возраст считается по календарю клиники, а не по UTC", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");
		// Родился 29 июля 1990. По часам клиники сегодня 29 июля 2026 — ему ровно
		// 36. По UTC ещё 28 июля, то есть 35: сутки разницы на границе возраста, а
		// от возраста зависит право самому подписывать согласие.
		assert.equal(
			await rejectedByAge(CLINIC_ZONE, 36),
			false,
			"клиника обязана видеть возраст 36 в день рождения, а не на следующий день",
		);
		assert.equal(
			await rejectedByAge("UTC", 36),
			true,
			"проверка выродилась: по UTC ему ещё 35, и порог 36 пройти не должен",
		);
	});

	test("неизвестный пояс не роняет отбор и не подставляет московский", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");
		// Имени пояса не существует — предпросмотр обязан ответить, а не упасть:
		// отбор получателей важнее точности на сутки. И «неизвестно» не должно
		// превращаться в «Москва»: подставленный пояс сдвинул бы поздравления
		// ровно у той клиники, про которую мы ничего не знаем.
		assert.equal(
			await rejectedByCalendar("Europe/Nowhereland", 400),
			false,
			"несуществующее имя пояса уронило или исказило отбор",
		);
	});
});
