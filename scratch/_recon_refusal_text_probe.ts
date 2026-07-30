/**
 * Read-only proof: what literal text does a human actually receive when the
 * server refuses an action?
 *
 * In-process Fastify + app.inject, per the project rule that the shared dev
 * server on 4100 is not evidence. No database, no writes: the two guards under
 * test (security/permissions.ts, accessGuard.ts) decide from the signed token
 * alone.
 *
 * RUN (cwd apps/api, so the loader picks up .env):
 *   cd apps/api && node --import tsx ../../scratch/_recon_refusal_text_probe.ts
 */
import Fastify from "fastify";
import { requireNonDoctorAccess } from "../apps/api/src/accessGuard.js";
import { authTokenSecret } from "../apps/api/src/security/authSecret.js";
import { enforcePermissionWhenStaffKnown } from "../apps/api/src/security/permissions.js";
import { signToken } from "../apps/api/src/utils/cryptoHelper.js";

const ORG = "11111111-1111-4111-8111-111111111111";
const USER = "22222222-2222-4222-8222-222222222222";

/** Verbatim copies of apps/web/src/AppHelpers.tsx:4176-4184 (the web-side gate). */
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

	// Mirrors the shape used by routes/finance_family.ts and
	// routes/communicationsOutbox.ts: staff-or-admin org, then permission gate.
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
	// Mirrors routes/whatsapp.ts:130 and routes/max.ts:90.
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
		const shownByFilteringClient = operatorReadableErrorDetail(message);
		console.log(
			[
				`СЦЕНАРИЙ            : ${scenario.label}`,
				`СТАТУС              : ${response.statusCode}`,
				`ПОЛЕ error          : ${JSON.stringify(body.error)}`,
				`ПОЛЕ message        : ${JSON.stringify(message)}`,
				`НА ЭКРАНЕ (verbatim): ${JSON.stringify(shownByFilteringClient)}`,
				"",
			].join("\n"),
		);
	}

	await app.close();
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
