/**
 * Часовой пояс клиники и приведение для PostgreSQL.
 *
 * Канонический источник истины clinicTimeZone и postgresKnowsTimeZone.
 */

import { eq, sql } from "drizzle-orm";
import { db } from "../../../db/client.js";
import { clinics } from "../../../db/schema.js";

/**
 * Канонический часовой пояс по умолчанию из схемы клиники (clinics.timezone default 'Europe/Samara').
 */
export const DEFAULT_CLINIC_TIME_ZONE = "Europe/Samara";

/**
 * ПОЯС, КОТОРЫЙ POSTGRESQL ЗНАЕТ. Иначе `AT TIME ZONE` бросает 22023
 * (`time zone "…" not recognized`) и отчёт превращается в 500.
 *
 * Проверять обязательно: `clinics.timezone` — свободный текст со значением по
 * умолчанию `Europe/Samara`, без ограничения на список
 * (`apps/api/src/db/schema.ts:298`). Единственная проверка при записи —
 * `timeZoneSchema` в общем пакете, и она спрашивает ICU, а не PostgreSQL:
 * `pg_timezone_names` знает 598 имён, набор ICU другой. Значит имя, принятое
 * при записи, здесь может оказаться неизвестным.
 *
 * Ответ кэшируется на процесс: список поясов внутри одной версии сервера не
 * меняется, а отчёты зовут это на каждый запрос.
 */
const TIME_ZONE_NAME_SHAPE = /^[A-Za-z0-9_+/-]+$/;

/**
 * Фрагмент «в поясе клиники» для группировки в PostgreSQL.
 *
 * ПОЧЕМУ ИМЯ ПОЯСА ВСТАВЛЯЕТСЯ ЛИТЕРАЛОМ, А НЕ ПАРАМЕТРОМ. Через параметр
 * (`AT TIME ZONE $1`) выражение в SELECT и в GROUP BY получает РАЗНЫЕ номера
 * ($1 и $6), PostgreSQL считает их разными выражениями и отвергает запрос —
 * «column must appear in the GROUP BY clause». Именно так моя первая редакция
 * этой правки уронила отчёты в 500, и поймал это набор, а не рассуждение.
 *
 * ЛИТЕРАЛ ЗДЕСЬ БЕЗОПАСЕН, и это не «доверимся». Значение приходит только из
 * postgresKnowsTimeZone, то есть уже НАЙДЕНО в собственном каталоге
 * pg_timezone_names этого же сервера. Плюс форма имени сверяется ниже: буквы,
 * цифры, подчёркивание, плюс, минус и косая черта. Что не прошло — не
 * подставляется вовсе, и группировка остаётся в поясе сессии, как раньше.
 */
export function inClinicZone(column: unknown, zone: string | null) {
	if (!zone || !TIME_ZONE_NAME_SHAPE.test(zone)) return sql`${column}`;
	return sql`(${column} AT TIME ZONE ${sql.raw(`'${zone}'`)})`;
}

/**
 * ЧАСОВОЙ ПОЯС КЛИНИКИ, ОДИН НА ПРОЕКТ. `null` — определить не удалось.
 *
 * ЖИВЁТ ЗДЕСЬ, А НЕ В МАРШРУТЕ, потому что нужен уже двум разным маршрутам:
 * отчётам руководителя и выплатам врачам. Вторая копия этой функции стала бы
 * вторым источником истины о поясе клиники — ровно та болезнь, из которой в этом
 * проекте выросли четыре разных расчёта долга.
 *
 * Отказ базы не роняет отчёт: пояс неизвестен, и вызывающий работает как раньше.
 * Выдумывать московский за клинику нельзя — в базе пояс по умолчанию
 * Europe/Samara, и подстановка сдвинула бы границы месяца на час.
 */
export async function clinicTimeZone(
	organizationId: string,
): Promise<string | null> {
	try {
		const [clinic] = await db
			.select({ timezone: clinics.timezone })
			.from(clinics)
			.where(eq(clinics.organizationId, organizationId))
			.limit(1);
		return clinic?.timezone ?? null;
	} catch {
		return null;
	}
}

const knownTimeZoneCache = new Map<string, boolean>();

export async function postgresKnowsTimeZone(
	timeZone: string | null | undefined,
): Promise<string | null> {
	if (!timeZone) return null;
	const cached = knownTimeZoneCache.get(timeZone);
	if (cached !== undefined) return cached ? timeZone : null;
	try {
		const found = await db.execute(
			sql`select 1 as ok from pg_timezone_names where name = ${timeZone} limit 1`,
		);
		const known = found.rows.length > 0;
		knownTimeZoneCache.set(timeZone, known);
		return known ? timeZone : null;
	} catch {
		// До базы не дошли — считаем пояс неизвестным и работаем как раньше.
		// Ронять отчёт из-за неудачной сверки списка поясов нельзя.
		return null;
	}
}
