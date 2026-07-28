/**
 * Почему соединение с базой обрывается: снимаем НАСТОЯЩУЮ ошибку, а не догадку.
 *
 * ПОЧЕМУ ЭТОТ СКРИПТ СУЩЕСТВУЕТ. Первый прогон упал с `read ECONNRESET` без
 * подробностей, и я дважды успел построить объяснение (внешний ключ на
 * выдуманную демо-организацию; расхождение версий pg) — оба раза не проверив.
 * Порт 5432 слушает, процессы postgres живы, значит обрыв происходит на
 * рукопожатии, то есть на проверке доступа. Здесь ошибка ловится и печатается
 * целиком, включая поля драйвера, и отдельно проверяется:
 *   1) служебная база `postgres` — жив ли сервер вообще;
 *   2) рабочая база из DATABASE_URL — жива ли именно она.
 * Различить это важно: «сервер лежит» и «база повреждена» лечатся по-разному.
 *
 * ТОЛЬКО ЧТЕНИЕ. Ни одной записи.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

function rootDatabaseUrl() {
	if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
	const env = readFileSync(".env", "utf8");
	const line = env.split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="));
	if (!line) throw new Error("DATABASE_URL не найден в корневом .env");
	return line.slice("DATABASE_URL=".length).trim();
}

const url = rootDatabaseUrl();
const parsed = new URL(url);
/* Пароль не печатается никогда — ни в вывод, ни в файл. */
console.log(
	`строка подключения: пользователь=${parsed.username} хост=${parsed.hostname} порт=${parsed.port} база=${parsed.pathname.slice(1)}`,
);

function describe(error) {
	const fields = ["message", "code", "severity", "routine", "detail", "hint", "errno", "syscall"];
	const out = [];
	for (const f of fields) {
		if (error?.[f] !== undefined) out.push(`    ${f}: ${error[f]}`);
	}
	if (error?.cause) {
		out.push("    cause:");
		for (const f of fields) {
			if (error.cause?.[f] !== undefined) out.push(`      ${f}: ${error.cause[f]}`);
		}
	}
	return out.join("\n") || "    (драйвер не дал ни одного поля)";
}

async function tryConnect(label, database) {
	const client = new pg.Client({
		user: parsed.username,
		password: decodeURIComponent(parsed.password),
		host: parsed.hostname,
		port: Number(parsed.port),
		database,
		/* Явное отключение SSL: сервер разработки его не требует, а молчаливая
		 * попытка TLS — ещё один способ получить обрыв вместо внятного отказа. */
		ssl: false,
		connectionTimeoutMillis: 8000,
	});
	try {
		await client.connect();
		const r = await client.query("select current_database() as db, current_user as who");
		console.log(`\n[${label}] ПОДКЛЮЧИЛСЯ: база=${r.rows[0].db} пользователь=${r.rows[0].who}`);
		await client.end();
		return true;
	} catch (error) {
		console.log(`\n[${label}] НЕ ПОДКЛЮЧИЛСЯ:`);
		console.log(describe(error));
		try {
			await client.end();
		} catch {
			/* закрытие уже мёртвого соединения ничего не сообщает */
		}
		return false;
	}
}

await tryConnect("служебная база postgres", "postgres");
await tryConnect("рабочая база из .env", parsed.pathname.slice(1));
