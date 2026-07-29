import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

process.env.DENTAL_STATE_PERSISTENCE = "off";
process.env.NODE_ENV = "production";
/*
 * ОКРУЖЕНИЕ БОЕВОГО ЗАПУСКА ЗАДАЁТ СЦЕНАРИЙ, А НЕ МАШИНА.
 *
 * `dist/server.js` выполняет `assertSecurityConfiguration()` на верхнем уровне
 * модуля, поэтому под `NODE_ENV=production` импорт падал ДО единственной строки,
 * которую этот сценарий проверяет, и общий прогон получал стек вместо вердикта.
 * Падал он по двум причинам, обе — правильная работа сторожей сервера:
 *   1) без `AUTH_TOKEN_SECRET` сервер отказывается подписывать токены известным
 *      секретом;
 *   2) при включённых флагах-послаблениях (в `.env` разработчика их четыре) в
 *      production сервер отказывается стартовать вовсе.
 * Поэтому секрет задаётся синтетическим, а послабления снимаются: сценарий
 * проверяет боевую границу ошибок, а не окружение чужой машины.
 *
 * Послабления именно ГАСЯТСЯ значением "0", а не удаляются: и `accessGuard.ts`, и
 * `server.ts` тянут `dotenv/config`, поэтому удалённая переменная возвращается из
 * `.env` разработчика при первом же импорте (проверено: удаление не помогло,
 * сервер снова отказался стартовать). Значение "0" переживает dotenv, потому что
 * dotenv не перезаписывает уже заданное, и закрывает охрану, а не открывает:
 * послабление требует ровно "1".
 */
process.env.AUTH_TOKEN_SECRET ??=
	"synthetic-auth-token-secret-for-global-error-boundary-smoke";
for (const escapeFlag of [
	"DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS",
	"DENTE_CLINICAL_ALLOW_UNGUARDED_READS",
	"DENTE_SETTINGS_ALLOW_UNGUARDED_MUTATIONS",
	"DENTE_SCHEDULE_ALLOW_UNGUARDED_MUTATIONS",
	"DENTE_TELEGRAM_ALLOW_UNGUARDED_CONTROL_PLANE",
	"DENTE_DEV_ALLOW_HEADER_ORG",
	"DENTE_ALLOW_DEMO_LOGIN",
	"DENTE_ALLOW_DEMO_FIXTURES",
]) {
	process.env[escapeFlag] = "0";
}

const serverPath = path.resolve("apps/api/dist/server.js");

if (!existsSync(serverPath)) {
	throw new Error("Build API first: npm run build -w @dental/api");
}

const serverSource = readFileSync("apps/api/src/server.ts", "utf8");

function assert(condition, message) {
	if (!condition) throw new Error(message);
}

assert(
	serverSource.includes("export async function createDenteApiApp"),
	"server must expose app factory for error-boundary proof",
);
assert(
	serverSource.includes("publicValidationErrorMessage"),
	"server must own bounded public validation fallback copy",
);
assert(
	!serverSource.includes("issues: error.issues"),
	"global API validation fallback must not return raw zod issues",
);
assert(
	!serverSource.includes("localizeZodIssueMessage"),
	"global API validation fallback must not map zod issues into public payloads",
);
assert(
	serverSource.includes("pathToFileURL(process.argv[1]).href"),
	"server module must only listen when executed as the entry point",
);

const requireFromApi = createRequire(path.resolve("apps/api/package.json"));
const { z } = requireFromApi("zod");
const { createDenteApiApp } = await import(pathToFileURL(serverPath).href);

const app = await createDenteApiApp({ startTelegramWorker: false });

app.post("/api/smoke/global-zod-boundary", async () =>
	z
		.object({
			patientId: z.string().uuid(),
			startsAt: z.string().datetime(),
			amountRub: z.number().positive(),
		})
		.parse({
			patientId: "bad-patient-id",
			startsAt: "bad-date",
			amountRub: -1,
		}),
);

app.get("/api/smoke/global-technical-error", async () => {
	throw new Error(
		"ENOENT C:\\clinic\\DENTE_SECRET\\raw-file.json stack undefined",
	);
});

try {
	const zodResponse = await app.inject({
		method: "POST",
		url: "/api/smoke/global-zod-boundary",
		payload: {},
	});
	assert(
		zodResponse.statusCode === 400,
		`global zod fallback must return 400, got ${zodResponse.statusCode}: ${zodResponse.body}`,
	);
	const zodBody = zodResponse.json();
	assert(
		zodBody.error === "ValidationError",
		`global zod fallback error code mismatch: ${zodResponse.body}`,
	);
	assert(
		zodBody.message === "Форма отправлена с неверными или неполными полями.",
		`global zod fallback message mismatch: ${zodResponse.body}`,
	);
	assert(
		!Object.hasOwn(zodBody, "issues"),
		`global zod fallback leaked issues: ${zodResponse.body}`,
	);
	assert(
		!/ZodError|issues|path|code|invalid_type|invalid_string|too_small|patientId|startsAt|amountRub|uuid|datetime|request\.body|safeParse/i.test(
			zodResponse.body,
		),
		`global zod fallback leaked schema/parser detail: ${zodResponse.body}`,
	);

	const technicalResponse = await app.inject({
		method: "GET",
		url: "/api/smoke/global-technical-error",
	});
	assert(
		technicalResponse.statusCode === 500,
		`global technical fallback must return 500, got ${technicalResponse.statusCode}: ${technicalResponse.body}`,
	);
	const technicalBody = technicalResponse.json();
	assert(
		technicalBody.error === "ServerError",
		`global technical fallback error code mismatch: ${technicalResponse.body}`,
	);
	assert(
		technicalBody.message ===
			"Сервер не выполнил действие. Повторите позже или обратитесь к администратору клиники.",
		`global technical fallback message mismatch: ${technicalResponse.body}`,
	);
	assert(
		!/ENOENT|DENTE_SECRET|raw-file|stack|undefined|C:\\|clinic|TypeError|SyntaxError/i.test(
			technicalResponse.body,
		),
		`global technical fallback leaked raw exception detail: ${technicalResponse.body}`,
	);

	console.log(
		JSON.stringify({
			ok: true,
			globalZodHidden: true,
			globalTechnicalHidden: true,
		}),
	);
} finally {
	await app.close();
}
