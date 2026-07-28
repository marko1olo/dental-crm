/**
 * Продление токенов для съёмки панелей. НЕ СИД: в базу не пишет ничего.
 *
 * ЗАЧЕМ. seedOpsScreenshotDemo.ts подписывает токены на 3600 секунд. Файл
 * .ops-shot-tokens.json был выдан в 10:05, к моменту прогона он истёк, и
 * сценарий съёмки честно упал на «Рабочий кабинет не открылся». Пересев базы —
 * общий гейт лида (§7a конституции), брать его нельзя. А данные
 * демонстрационной организации в базе уже есть: истекли только подписи.
 *
 * ЧТО ДЕЛАЕТ. Читает существующий .ops-shot-tokens.json, разбирает полезную
 * нагрузку обоих токенов (двухсегментный HMAC: base64url(JSON).подпись — тело
 * читается без секрета), выбрасывает старые exp/iat и подписывает те же
 * личности заново тем же секретом, что использует сервер.
 *
 * Ни один идентификатор здесь не зашит: и организация, и сотрудник берутся из
 * уже выданных токенов. Секрет не печатается — только готовый JSON.
 *
 * ЗАПУСК (cwd обязательно apps/api: там лежит .data/dev-auth-secret):
 *   cd apps/api && npx tsx ../../.agents/archon/packets/W5-capture-theme-assert/refresh-ops-tokens.mts
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { authTokenSecret } from "../../../../apps/api/src/security/authSecret.js";
import { signToken } from "../../../../apps/api/src/utils/cryptoHelper.js";

const TTL_SECONDS = 3600;
const tokenFile = path.resolve(process.cwd(), "../../.ops-shot-tokens.json");

type TokenFile = { organizationId?: string; clinicToken: string; staffToken: string };

function payloadOf(token: string): Record<string, unknown> {
	const [data] = token.split(".");
	if (!data) throw new Error("Токен не двухсегментный: полезную нагрузку не прочитать");
	const parsed: unknown = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
	if (!parsed || typeof parsed !== "object") throw new Error("Полезная нагрузка токена не объект");
	const { exp, iat, ...rest } = parsed as Record<string, unknown>;
	if (exp === undefined) throw new Error("В токене нет срока действия: это не наш формат");
	return rest;
}

const current = JSON.parse(readFileSync(tokenFile, "utf8")) as TokenFile;

/**
 * Окружение подтягивается тем же dotenv, что и server.ts: AUTH_TOKEN_SECRET
 * задан в apps/api/.env, и без него подпись пошла бы локальным dev-секретом из
 * .data — сервер такой токен отвергает с 401 (проверено). Пакет разрешается от
 * cwd (apps/api), потому что из .agents/ его не видно: он лежит в
 * apps/api/node_modules. Секрет читает процесс, не человек: он нигде не печатается.
 */
await import(pathToFileURL(path.resolve(process.cwd(), "node_modules/dotenv/config.js")).href);
const secret = authTokenSecret();

console.log(
	JSON.stringify({
		organizationId: current.organizationId,
		clinicToken: signToken(payloadOf(current.clinicToken), secret, TTL_SECONDS),
		staffToken: signToken(payloadOf(current.staffToken), secret, TTL_SECONDS)
	})
);
