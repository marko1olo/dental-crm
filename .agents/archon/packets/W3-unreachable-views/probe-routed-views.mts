/**
 * API-проверка трёх подключённых разделов: склад, стерилизация, воронка обращений.
 *
 * Скрипт только читает. Он не печатает ни секрет, ни токен — в вывод уходят адрес,
 * код ответа и краткая форма тела. Организация берётся из живой базы, а не задаётся
 * константой: смысл проверки в том, что маршрут отвечает по настоящему арендатору.
 *
 * Запуск: node --import tsx .agents/archon/packets/W3-unreachable-views/probe-routed-views.mts
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { signToken } from "../../../../apps/api/src/utils/cryptoHelper.js";

const repoRoot = path.resolve(import.meta.dirname, "../../../..");

function readEnvValue(file: string, key: string): string | null {
	try {
		for (const line of readFileSync(path.join(repoRoot, file), "utf8").split(/\r?\n/)) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith("#")) continue;
			const separator = trimmed.indexOf("=");
			if (separator === -1) continue;
			if (trimmed.slice(0, separator).trim() !== key) continue;
			return trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
		}
	} catch {
		return null;
	}
	return null;
}

const authSecret = readEnvValue("apps/api/.env", "AUTH_TOKEN_SECRET");
if (!authSecret) throw new Error("AUTH_TOKEN_SECRET не найден в apps/api/.env");
const databaseUrl = readEnvValue(".env", "DATABASE_URL");
if (!databaseUrl) throw new Error("DATABASE_URL не найден в .env");

const apiHost = readEnvValue(".env.local", "API_HOST") ?? readEnvValue(".env", "API_HOST") ?? "127.0.0.1";
const apiPort = readEnvValue(".env.local", "API_PORT") ?? readEnvValue(".env", "API_PORT") ?? "4100";
const base = `http://${apiHost}:${apiPort}`;

const { default: pg } = await import("pg");
const pool = new pg.Pool({ connectionString: databaseUrl });
const orgRow = await pool.query<{ id: string; name: string }>(
	"select id, name from organizations order by created_at asc limit 1",
);
const organization = orgRow.rows[0];
if (!organization) throw new Error("В базе нет ни одной организации");
console.log(`organization: ${organization.id} (${organization.name})`);

const inventoryCount = await pool.query<{ count: string }>(
	"select count(*)::text as count from inventory_items where organization_id = $1",
	[organization.id],
);
const sterilizationCount = await pool.query<{ count: string }>(
	"select count(*)::text as count from sterilization_logs where organization_id = $1",
	[organization.id],
);
const leadsCount = await pool.query<{ count: string }>(
	"select count(*)::text as count from crm_leads where organization_id = $1",
	[organization.id],
);
console.log(`DB rows: inventory_items=${inventoryCount.rows[0]?.count} sterilization_logs=${sterilizationCount.rows[0]?.count} crm_leads=${leadsCount.rows[0]?.count}`);
/*
 * Три адреса стерилизации закрыты requireResolvedStaffOrAdminOrganizationId: одного
 * токена кабинета им мало, нужен userId из токена сотрудника. В браузере оба
 * заголовка подставляет обёртка lib/apiAuthFetch.ts, здесь их надо выписать самому —
 * иначе проверка отчитается о 401 там, где приложение получает 200.
 */
const staffRow = await pool.query<{ id: string; full_name: string }>(
	"select id, full_name from users where organization_id = $1 and is_active = true order by created_at asc limit 1",
	[organization.id],
);
const staffUser = staffRow.rows[0];
console.log(staffUser ? `staff user: ${staffUser.id}` : "staff user: НЕТ активного сотрудника");
await pool.end();

const clinicToken = signToken({ organizationId: organization.id, clinicName: organization.name }, authSecret, 600);
const staffToken = staffUser
	? signToken({ organizationId: organization.id, userId: staffUser.id }, authSecret, 600)
	: null;

async function probe(method: string, url: string) {
	const headers: Record<string, string> = { "x-dente-clinic-token": clinicToken };
	if (staffToken) headers["x-dente-staff-token"] = staffToken;
	const response = await fetch(`${base}${url}`, { method, headers });
	const text = await response.text();
	let shape = `${text.length} bytes`;
	try {
		const parsed: unknown = JSON.parse(text);
		if (Array.isArray(parsed)) {
			shape = `array(${parsed.length})`;
			const first = parsed[0];
			if (first && typeof first === "object") shape += ` keys=[${Object.keys(first).slice(0, 6).join(",")}]`;
		} else if (parsed && typeof parsed === "object") {
			shape = `object keys=[${Object.keys(parsed).slice(0, 8).join(",")}]`;
		}
	} catch {
		shape = `non-json ${text.slice(0, 80)}`;
	}
	console.log(`${method} ${url} -> ${response.status} ${shape}`);
	return response.status;
}

const statuses = [
	await probe("GET", `/api/inventory/${organization.id}`),
	await probe("GET", "/api/sterilization/logs"),
	await probe("GET", "/api/leads"),
];

const failed = statuses.filter((status) => status !== 200);
console.log(failed.length === 0 ? "ALL 200" : `NOT 200: ${failed.join(",")}`);
process.exit(failed.length === 0 ? 0 : 1);
