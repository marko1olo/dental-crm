import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const tempRoot = mkdtempSync(
	path.join(tmpdir(), "dental-telegram-outbox-persist-"),
);
const stateFilePath = path.join(tempRoot, "state.json");
const backupDirectoryPath = path.join(tempRoot, "backups");

process.env.DENTAL_STATE_FILE = stateFilePath;
process.env.DENTAL_STATE_BACKUP_DIR = backupDirectoryPath;
process.env.DENTAL_STATE_BACKUPS = "2";
delete process.env.DENTAL_STATE_PERSISTENCE;
process.env.DENTE_TELEGRAM_BOT_TOKEN = "123456:synthetic-dente-token";
process.env.DENTE_TELEGRAM_BOT_USERNAME = "dentecrm_bot";
process.env.DENTE_TELEGRAM_WEBHOOK_SECRET = "synthetic-webhook-secret";
process.env.DENTE_TELEGRAM_LINK_CODE_SALT = "synthetic-link-code-salt";
process.env.DENTE_TELEGRAM_CHAT_ENCRYPTION_KEY =
	"synthetic-chat-encryption-key-for-smoke";
process.env.DENTE_TELEGRAM_ALLOW_UNGUARDED_CONTROL_PLANE = "1";

const routePath = path.resolve("apps/api/dist/routes/telegram.js");
const legacyMocksPath = path.resolve("apps/api/dist/telegram/legacyMocks.js");
const marinaPatientId = "3ebb4567-7777-4f19-8c23-2a78c9962796";
const doctorUserId = "8356141b-7cfa-4221-95f7-70f47e7344b1";
const clinicId = "4a3420d1-6ffb-4459-bd8f-7f7087f5e191";

if (!existsSync(routePath)) {
	throw new Error("Build API first: npm run build");
}

const requireFromApi = createRequire(path.resolve("apps/api/package.json"));
const Fastify = requireFromApi("fastify");
const { registerTelegramRoutes, registerTelegramWebhookRoutes } = await import(
	pathToFileURL(routePath).href
);
const { activeVisit, documents } = await import(
	pathToFileURL(legacyMocksPath).href
);

function assert(condition, message) {
	if (!condition) throw new Error(message);
}

function telegramFetchStub(calls) {
	return async (url, init = {}) => {
		calls.push({
			href: String(url),
			body: JSON.parse(String(init.body ?? "{}")),
		});
		return {
			ok: true,
			status: 200,
			json: async () => ({ ok: true, result: { message_id: 76001 } }),
		};
	};
}

try {
	const app = Fastify({ logger: false });
	await registerTelegramRoutes(app);
	await registerTelegramWebhookRoutes(app);
	const telegramFetchCalls = [];
	globalThis.fetch = telegramFetchStub(telegramFetchCalls);

	const settingsResponse = await app.inject({
		method: "PUT",
		url: "/api/settings/telegram",
		payload: {
			patientPortalBaseUrl: "https://portal.dente.example/p",
			clinicReviewUrl: "https://reviews.dente.example/rate",
			clinicMapsUrl: "https://maps.dente.example/clinic",
		},
	});
	assert(
		settingsResponse.statusCode === 200,
		`telegram settings save failed: ${settingsResponse.statusCode} ${settingsResponse.body}`,
	);

	const linkCodeResponse = await app.inject({
		method: "POST",
		url: "/api/telegram/link-codes",
		payload: {
			subjectType: "patient",
			subjectId: marinaPatientId,
			clinicId,
			ttlMinutes: 15,
			createdByUserId: doctorUserId,
		},
	});
	assert(
		linkCodeResponse.statusCode === 200,
		`link code create failed: ${linkCodeResponse.statusCode} ${linkCodeResponse.body}`,
	);
	const linkCode = linkCodeResponse.json();
	assert(
		linkCode.clinicId === clinicId,
		"persistent link code must keep clinic scope",
	);

	const webhookResponse = await app.inject({
		method: "POST",
		url: "/api/telegram/webhook",
		headers: {
			"x-telegram-bot-api-secret-token":
				process.env.DENTE_TELEGRAM_WEBHOOK_SECRET,
		},
		payload: {
			update_id: 97001,
			message: {
				chat: { id: 777000111, type: "private" },
				text: `/start ${linkCode.code}`,
			},
		},
	});
	assert(
		webhookResponse.statusCode === 200,
		`link webhook failed: ${webhookResponse.statusCode} ${webhookResponse.body}`,
	);
	assert(
		webhookResponse.json().action === "linked_patient_telegram_chat",
		"link webhook did not bind patient chat",
	);
	telegramFetchCalls.length = 0;
	activeVisit.status = "signed";
	activeVisit.updatedAt = new Date().toISOString();
	documents.push({
		id: "doc-smoke-post-visit",
		organizationId: "4a3420d1-6ffb-4459-bd8f-7f7087f5e191",
		clinicId,
		patientId: marinaPatientId,
		visitId: "af94df45-a669-4cae-b400-6e4f020f9120",
		kind: "post_visit_recommendations",
		status: "issued",
		issuedAt: new Date().toISOString(),
		payload: {
			postVisitRecommendations: {
				safeForTelegramSending: true,
				telegramText: "Памятка по уходу",
			},
		},
	});

	const outboxResponse = await app.inject({
		method: "GET",
		url: "/api/telegram/outbox",
	});
	assert(
		outboxResponse.statusCode === 200,
		`outbox failed: ${outboxResponse.statusCode} ${outboxResponse.body}`,
	);
	const outbox = outboxResponse.json();
	const readyItem = outbox.items.find(
		(item) => item.deliveryStatus === "ready",
	);
	assert(
		readyItem,
		"outbox must expose at least one ready item after patient chat link",
	);

	const mutationId = "smoke-persistent-outbox-send";
	const sendResponse = await app.inject({
		method: "POST",
		url: `/api/telegram/outbox/${encodeURIComponent(readyItem.id)}/send`,
		payload: {
			dryRun: false,
			clientMutationId: mutationId,
		},
	});
	assert(
		sendResponse.statusCode === 200,
		`outbox send failed: ${sendResponse.statusCode} ${sendResponse.body}`,
	);
	const sent = sendResponse.json();
	assert(
		sent.status === "sent" && sent.telegramMessageId === 76001,
		"sent outbox item must be delivered",
	);
	assert(
		telegramFetchCalls.length === 1,
		"outbox send must invoke telegram HTTP transport once",
	);

	const duplicateSendResponse = await app.inject({
		method: "POST",
		url: `/api/telegram/outbox/${encodeURIComponent(readyItem.id)}/send`,
		payload: {
			dryRun: false,
			clientMutationId: mutationId,
		},
	});
	assert(
		duplicateSendResponse.statusCode === 200,
		`duplicate outbox send failed: ${duplicateSendResponse.statusCode} ${duplicateSendResponse.body}`,
	);
	const dup = duplicateSendResponse.json();
	assert(
		dup.duplicate === true || dup.status === "sent",
		"duplicate mutation id must return idempotent replay response",
	);
	assert(
		telegramFetchCalls.length === 1,
		"idempotent duplicate send must not invoke telegram HTTP transport again",
	);

	const statusResponse = await app.inject({
		method: "GET",
		url: "/api/telegram/status",
	});
	assert(
		statusResponse.statusCode === 200,
		`status failed: ${statusResponse.statusCode} ${statusResponse.body}`,
	);
	assert(
		statusResponse.json().activeChatLinkCount >= 1,
		"status must register active chat link from persistent storage",
	);

	assert(existsSync(stateFilePath), "persistent state file must exist on disk");

	console.log(
		JSON.stringify(
			{
				ok: true,
				persistentStateFile: stateFilePath,
				telegramFetchCalls: telegramFetchCalls.length,
				idempotentReplayVerified: true,
			},
			null,
			2,
		),
	);
} finally {
	rmSync(tempRoot, { recursive: true, force: true });
}
