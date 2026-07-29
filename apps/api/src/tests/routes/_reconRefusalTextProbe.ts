/**
 * TEMPORARY RECON PROBE — delete after reading the output. Read-only.
 *
 * Proves what literal text a human receives when the server refuses an action.
 * In-process Fastify + app.inject, because the shared dev server on 4100 is not
 * evidence in this repo. No database and no writes: the two guards under test
 * (security/permissions.ts, accessGuard.ts) decide from the signed token alone.
 *
 * RUN: cd apps/api && node --import tsx src/tests/routes/_reconRefusalTextProbe.ts
 */
import Fastify from "fastify";
import { requireNonDoctorAccess } from "../../accessGuard.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { enforcePermissionWhenStaffKnown } from "../../security/permissions.js";
import { signToken } from "../../utils/cryptoHelper.js";

const ORG = "11111111-1111-4111-8111-111111111111";
const USER = "22222222-2222-4222-8222-222222222222";

/** Verbatim copy of apps/web/src/AppHelpers.tsx:4176-4184 — the web-side gate. */
const technicalWorkflowFailurePattern =
	/\b(TypeError|DOMException|SyntaxError|ReferenceError|Failed to fetch|NetworkError|Load failed|fetch|JSON|ENOENT|EACCES|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EPIPE|stack|undefined|null|NaN|[A-Z][A-Z0-9_]{5,})\b|\/api\/|https?:\/\/|[A-Za-z]:\\|\\\\[^\\]+\\|\/(Users|home|var|tmp)\//i;
function operatorReadableErrorDetail(detail: string | null): string | null {
	const message = detail?.trim() ?? "";
	if (!message) return null;
	if (!/[А-Яа-яЁё]/.test(message)) return null;
	if (technicalWorkflowFailurePattern.test(message)) return null;
	return message;
}

async function main() {
	const secret = authTokenSecret();
	const app = Fastify({ logger: false });

	// Same shape as routes/finance_family.ts and routes/communicationsOutbox.ts.
	app.post("/probe/finance-write", async (request, reply) => {
		if (!enforcePermissionWhenStaffKnown(request, reply, "finance.write")) return;
		return { unreachable: true };
	});
	app.post("/probe/communications-write", async (request, reply) => {
		if (!enforcePermissionWhenStaffKnown(request, reply, "communications.write")) return;
		return { unreachable: true };
	});
	app.post("/probe/settings-write", async (request, reply) => {
		if (!enforcePermissionWhenStaffKnown(request, reply, "settings.write")) return;
		return { unreachable: true };
	});
	// Same shape as routes/whatsapp.ts:130 and routes/max.ts:90.
	app.post("/probe/non-doctor", async (request, reply) => {
		if (!(await requireNonDoctorAccess(request, reply))) return reply;
		return { unreachable: true };
	});

	const scenarios: Array<{ label: string; url: string; role: string }> = [
		{ label: "Врач жмёт «Списать» в семейном кошельке", url: "/probe/finance-write", role: "doctor" },
		{ label: "Ассистент жмёт «Списать» в семейном кошельке", url: "/probe/finance-write", role: "assistant" },
		{ label: "Ассистент отправляет рассылку пациентам", url: "/probe/communications-write", role: "assistant" },
		{ label: "Администратор ресепшена меняет настройки клиники", url: "/probe/settings-write", role: "administrator" },
		{ label: "Врач открывает настройки WhatsApp-бота", url: "/probe/non-doctor", role: "doctor" },
	];

	for (const scenario of scenarios) {
		const staffToken = signToken(
			{ organizationId: ORG, userId: USER, role: scenario.role, fullName: "Иванова Мария Петровна" },
			secret,
		);
		const clinicToken = signToken({ organizationId: ORG }, secret);
		const response = await app.inject({
			method: "POST",
			url: scenario.url,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": staffToken,
				"content-type": "application/json",
			},
			payload: {},
		});
		let body: Record<string, unknown> = {};
		try {
			body = response.json() as Record<string, unknown>;
		} catch {
			body = { __raw: response.body };
		}
		const message = typeof body.message === "string" ? body.message : null;
		const filtered = operatorReadableErrorDetail(message);
		// Path A — clients that route through AppHelpers.responseErrorMessage
		// (useAppLogic.tsx) or operatorReadableErrorDetail (useVisitDiaryLogic.ts).
		const screenA = filtered
			? `Действие не выполнено: ${filtered}`
			: `Действие не выполнено: ${response.statusCode === 403 ? "нет доступа к действию" : `сервер вернул код ${response.statusCode}`}`;
		// Path B — clients that print payload.message with no filter at all:
		// CampaignPanel.tsx:74, MessageDeliveryConsole.tsx:177, FamilyWalletPanel.tsx:306.
		const screenB = message ?? "Ошибка оплаты";
		// Path C — clients that print payload.error: InsuranceContractsPanel.tsx:155.
		const screenC = typeof body.error === "string" ? body.error : "Ошибка сохранения";
		console.log(
			[
				`СЦЕНАРИЙ                 : ${scenario.label}`,
				`СТАТУС                   : ${response.statusCode}`,
				`ПОЛЕ error               : ${JSON.stringify(body.error)}`,
				`ПОЛЕ message             : ${JSON.stringify(message)}`,
				`фильтр пропустил message : ${JSON.stringify(filtered)}`,
				`ЭКРАН A (с фильтром)     : ${JSON.stringify(screenA)}`,
				`ЭКРАН B (message как есть): ${JSON.stringify(screenB)}`,
				`ЭКРАН C (error как есть) : ${JSON.stringify(screenC)}`,
				"",
			].join("\n"),
		);
	}

	// Why does the filter drop a perfectly Russian sentence? Because the /i flag
	// turns [A-Z][A-Z0-9_]{5,} into "any Latin word of 6+ characters".
	console.log("── Почему фильтр глотает русские причины ──");
	for (const probe of [
		"Роль «assistant» не имеет права «finance.write».",
		"Не хватает материала: Карпула Артикаина",
		"WhatsApp-бот не настроен для этой организации.",
		"Недостаточно средств на семейном балансе",
	]) {
		console.log(
			`${JSON.stringify(probe)} -> фильтр вернул ${JSON.stringify(operatorReadableErrorDetail(probe))}; ` +
				`совпадение 6+ латинских букв: ${JSON.stringify(/[A-Za-z][A-Za-z0-9_]{5,}/.exec(probe)?.[0] ?? null)}`,
		);
	}

	await app.close();
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
