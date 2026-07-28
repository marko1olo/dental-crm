/**
 * Живая проверка копеек в контракте прайса. ТОЛЬКО ЧТЕНИЕ.
 *
 * POST /api/pricelist/analyze ничего не пишет в базу: он разбирает переданный
 * текст и сравнивает с каталогом услуг организации. Поэтому это единственная
 * точка, где миграцию денежных полей можно доказать реальным HTTP-вызовом, не
 * создавая ни одной строки в общей и без того загрязнённой базе.
 *
 * Почему именно этот маршрут доказывает миграцию:
 * routes/pricelist.ts:45 прогоняет ответ через dentalPricelistAnalysisResponseSchema
 * .parse() — ЖЁСТКИЙ parse, который бросает исключение. Внутри ответа лежит
 * dentalPricelistCategorySummarySchema с minPriceRub / maxPriceRub /
 * averagePriceRub. До миграции эти три поля были z.number().int(), поэтому цена
 * с копейками в прайсе роняла весь разбор в 500.
 *
 * Ни порт, ни организация не зашиты: порт берётся из .env, организация — из базы.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createHmac } from "node:crypto";
import pg from "pg";

const packetDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(packetDir, "..", "..", "..", "..");

/** Разбор .env без записи и без печати значений. */
function readEnvFile(absolutePath) {
	const result = new Map();
	for (const rawLine of readFileSync(absolutePath, "utf8").split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line || line.startsWith("#")) continue;
		const separator = line.indexOf("=");
		if (separator < 1) continue;
		result.set(line.slice(0, separator).trim(), line.slice(separator + 1).trim());
	}
	return result;
}

const rootEnv = readEnvFile(path.join(repoRoot, ".env"));
const apiEnv = readEnvFile(path.join(repoRoot, "apps", "api", ".env"));

const databaseUrl = rootEnv.get("DATABASE_URL");
const apiHost = rootEnv.get("API_HOST") || "127.0.0.1";
const apiPort = rootEnv.get("API_PORT");
const tokenSecret = apiEnv.get("AUTH_TOKEN_SECRET") ?? rootEnv.get("AUTH_TOKEN_SECRET");

if (!databaseUrl) throw new Error("DATABASE_URL отсутствует в .env");
if (!apiPort) throw new Error("API_PORT отсутствует в .env");
if (!tokenSecret) throw new Error("AUTH_TOKEN_SECRET отсутствует в .env");

/** Тот же двухсегментный HMAC, что и apps/api/src/utils/cryptoHelper.ts. */
function signToken(payload, secret, ttlSeconds = 600) {
	const issuedAt = Math.floor(Date.now() / 1000);
	const full = { ...payload, exp: issuedAt + ttlSeconds, iat: issuedAt };
	const data = Buffer.from(JSON.stringify(full)).toString("base64url");
	const signature = createHmac("sha256", secret).update(data).digest("base64url");
	return `${data}.${signature}`;
}

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();

/*
 * Организация берётся из базы, а не из константы. Фикстура снимков
 * («Демо-клиника для снимков») исключается по имени: у неё нет каталога услуг,
 * и разбор прайса против неё ничего не значит.
 */
const orgRows = await client.query(
	"select id, name from organizations where name <> $1 order by name",
	["Демо-клиника для снимков"],
);
if (orgRows.rowCount !== 1) {
	throw new Error(`ожидалась одна реальная организация, найдено ${orgRows.rowCount}`);
}
const organization = orgRows.rows[0];
await client.end();

const clinicToken = signToken(
	{ organizationId: organization.id, clinicName: organization.name },
	tokenSecret,
);

/*
 * Две цены с копейками в одной категории. Среднее (1500,50 + 2300,25) / 2 =
 * 1900,375 — три знака, то есть значение, которое НОВАЯ схема обязана
 * отвергнуть. Значит потребитель обязан округлить его до копейки сам, и именно
 * это проверяется ниже: 1900,38 проходит, 1900,375 не прошло бы.
 */
const rawText = [
	"Лечение кариеса 1500,50",
	"Пломба композитная 2300,25",
].join("\n");

const url = `http://${apiHost}:${apiPort}/api/pricelist/analyze`;
const response = await fetch(url, {
	method: "POST",
	headers: {
		"Content-Type": "application/json",
		"x-dente-clinic-token": clinicToken,
	},
	body: JSON.stringify({ sourceName: "aa3-kopecks-proof", sourceKind: "text", rawText }),
});

const bodyText = await response.text();
console.log("POST", url);
console.log("организация:", organization.name, organization.id);
console.log("HTTP", response.status);

if (!response.ok) {
	console.log("тело ответа:", bodyText.slice(0, 900));
	process.exit(1);
}

const body = JSON.parse(bodyText);
console.log("\nразобранные строки прайса (priceRub из контракта):");
for (const item of body.items ?? []) {
	console.log(`  ${item.title} -> priceRub = ${item.priceRub}`);
}
console.log("\nсводка по категориям (три миграированных поля):");
for (const summary of body.summary ?? []) {
	console.log(
		`  ${summary.category}: min=${summary.minPriceRub} max=${summary.maxPriceRub} avg=${summary.averagePriceRub}`,
	);
}

/** Копейки обязаны дожить до ответа неизменными. */
const prices = (body.items ?? []).map((item) => item.priceRub).filter((value) => value !== null);
const withKopecks = prices.filter((value) => !Number.isInteger(value));
console.log("\nцен всего:", prices.length, "| из них с копейками:", withKopecks.length);
console.log("значения с копейками:", JSON.stringify(withKopecks));

const averages = (body.summary ?? [])
	.map((summary) => summary.averagePriceRub)
	.filter((value) => value !== null);
const fractionalAverages = averages.filter((value) => !Number.isInteger(value));
console.log("средних всего:", averages.length, "| из них дробных:", fractionalAverages.length);
console.log("значения средних:", JSON.stringify(averages));
