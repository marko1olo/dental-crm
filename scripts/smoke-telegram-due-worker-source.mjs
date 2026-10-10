import { readFileSync, existsSync } from "node:fs";
import { readApiServerSourceSync } from "./lib/api-server-source.mjs";

const telegramFiles = [
	"apps/api/src/routes/telegram.ts",
	"apps/api/src/routes/telegram/index.ts",
	"apps/api/src/routes/telegram/telegramOutboxWorker.ts",
	"apps/api/src/routes/telegram/telegramOutboxRoute.ts",
	"apps/api/src/routes/telegram/telegramOutboxDelivery.ts",
	"apps/api/src/routes/telegram/telegramOutboxSendHandlers.ts",
	"apps/api/src/routes/telegram/telegramManagementRoutes.ts",
];
const telegramSource = telegramFiles
	.filter((path) => existsSync(path))
	.map((path) => readFileSync(path, "utf8"))
	.join("\n");
const serverSource = readApiServerSourceSync();
const sampleFiles = [
	"apps/api/src/sampleData.ts",
	"apps/api/src/services/telegram/legacyMemory/outboxDelivery.ts",
];
const sampleSource = sampleFiles
	.filter((path) => existsSync(path))
	.map((path) => readFileSync(path, "utf8"))
	.join("\n");

function assert(condition, message) {
	if (!condition) throw new Error(message);
}

const requiredTelegramSnippets = [
	"export async function executeDenteTelegramOutboxDueBatch",
	"export function startDenteTelegramOutboxDueWorker",
	"DENTE_TELEGRAM_OUTBOX_WORKER_ENABLED",
	"DENTE_TELEGRAM_OUTBOX_WORKER_INTERVAL_MS",
	"DENTE_TELEGRAM_OUTBOX_WORKER_BATCH_LIMIT",
	"DENTE_TELEGRAM_OUTBOX_WORKER_DRY_RUN",
	"DENTE_TELEGRAM_OUTBOX_WORKER_RUN_ON_START",
	"setTimeout",
	"retryAfterSeconds",
	"executeDenteTelegramOutboxDueBatch",
	'clientMutationId?.startsWith("due-")',
];

for (const snippet of requiredTelegramSnippets) {
	assert(
		telegramSource.includes(snippet),
		`telegram worker source missing: ${snippet}`,
	);
}

assert(
	!telegramSource.includes("setInterval"),
	"due worker must use recursive setTimeout, not setInterval",
);
assert(
	sampleSource.includes(
		'existing?.status === "failed" && clientMutationId.startsWith("due-")',
	),
	"failed due-send receipts must not become permanent idempotent replays",
);
assert(
	serverSource.includes("startDenteTelegramOutboxDueWorker") &&
		serverSource.includes('app.addHook("onClose"'),
	"API server must start and stop the Telegram due worker",
);

const sendDueRouteStart = telegramSource.indexOf(
	'"/api/telegram/outbox/send-due"',
);
const nextRouteStart =
	sendDueRouteStart >= 0
		? telegramSource.indexOf("\n  app.post", sendDueRouteStart + 1)
		: -1;
const routeBlock =
	sendDueRouteStart >= 0
		? telegramSource.slice(
				sendDueRouteStart,
				nextRouteStart >= 0 ? nextRouteStart : undefined,
			)
		: "";
assert(
	routeBlock.includes("executeDenteTelegramOutboxDueBatch") &&
		routeBlock.includes("input") &&
		routeBlock.includes("runtimeResult.runtime"),
	"manual send-due route must reuse worker batch service in the resolved bot runtime scope",
);
assert(
	!routeBlock.includes("for (const item of dueItems)"),
	"manual send-due route must not duplicate worker batch loop",
);

console.log(
	JSON.stringify({ ok: true, checked: "telegram due worker source" }, null, 2),
);
