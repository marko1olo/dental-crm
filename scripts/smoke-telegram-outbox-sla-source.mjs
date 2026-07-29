import fs from "node:fs";

const source = fs.readFileSync("apps/api/src/sampleData.ts", "utf8");

/*
 * ТРЕБОВАНИЯ-СВЯЗИ, А НЕ ТРЕБОВАНИЯ-НАПИСАНИЕ.
 *
 * Здесь стояла строка-игла
 *   `if (!appointmentReminderInsideDispatchWindow(appointment, leadTimeHours, nowMs)) return [];`
 * и проверка краснела, хотя поведение на месте: в sampleData.ts тот же самый
 * оператор занимает восемь строк (форматтер разнёс аргументы вызова по одному на
 * строку, потому что одной строкой он длиннее лимита). То есть игла требовала
 * ПЕРЕНОСЫ СТРОК, а не защиту от просроченных напоминаний.
 *
 * Ровно эта односрочная запись сохранилась только в apps/api/src/sampleData_opt.ts —
 * мёртвой копии на 429 КБ, которую не импортирует никто и которую этот страж не
 * читает. Игла совпадала бы с мёртвым файлом и не совпадала с живым.
 *
 * Поэтому связь закрепляется регулярным выражением: отрицание оконного стража с
 * теми же тремя аргументами обязано немедленно вести к `return []`. Уберите `!`,
 * потеряйте аргумент, замените ранний выход на что-то другое — проверка покраснеет.
 * Переформатируйте те же 8 строк в 1 или обратно — не покраснеет.
 */
const requiredPatterns = [
	{
		pattern:
			/if\s*\(\s*!\s*appointmentReminderInsideDispatchWindow\(\s*appointment\s*,\s*leadTimeHours\s*,\s*nowMs\s*,?\s*\)\s*\)\s*(?:\{\s*)?return\s*\[\s*\]\s*;/,
		as: "!appointmentReminderInsideDispatchWindow(appointment, leadTimeHours, nowMs) must early-return []",
	},
];

const requiredSnippets = [
	"appointmentReminderDispatchGraceMs",
	"appointmentReminderInsideDispatchWindow",
	"nowMs - scheduledAtMs <= appointmentReminderDispatchGraceMs",
	"postVisitInstructionTaskKeepsOutboxClaim",
	'["sent", "delivered", "completed"].includes(task.status)',
	'task.channel === "telegram" && isOpenCommunicationTask(task)',
	"buildDenteTelegramTaxDocumentRequestItems",
	"buildDenteTelegramDocumentReadyItems",
	"buildDenteTelegramPaymentReminderItems",
	"buildDenteTelegramPostVisitCheckupItems",
	"buildDenteTelegramRecallItems",
	"patientPaymentBalanceRub",
	"paymentReminderAlreadyCovered",
	"recallOutboxId",
	"recallAlreadyCovered",
	"normalizeReviewRequestDelayHours",
	"normalizePostVisitCheckupDelayHoursByTopic",
	"postVisitCheckupDelayHours",
	"settings.postVisitCheckupDelayHoursByTopic",
	"postVisitCheckupAlreadyCovered",
	"taxApplicationSlaWarning",
	"documentReadyAlreadyCovered",
	"taxDocumentRequestOutboxId",
	'source: "tax_document_request"',
	'source: "document_ready"',
	'source: "payment_reminder"',
	'source: "post_visit_checkup"',
	'source: "recall"',
	'templateKind: "payment_reminder_notice"',
	'templateKind: "recall_notice"',
	'templateKind: "tax_document_request_status"',
	'templateKind: "document_ready_notice"',
	'templateKind: "post_visit_checkup"',
	"ageDays >= 30",
];

const forbiddenSnippets = [
	'task.patientId === patientId && task.visitId === visitId && task.intent === "post_visit_instruction"\n  );\n  if (hasTask) return true;',
];

const missing = requiredSnippets.filter((snippet) => !source.includes(snippet));
for (const { pattern, as } of requiredPatterns) {
	if (!pattern.test(source)) missing.push(as);
}
const forbidden = forbiddenSnippets.filter((snippet) =>
	source.includes(snippet),
);

if (missing.length || forbidden.length) {
	console.error(
		JSON.stringify(
			{
				ok: false,
				missing,
				forbidden,
				reason:
					"Telegram outbox must not send stale appointment reminders, let failed/skipped post-visit tasks suppress fallback, drop payment reminders, lose hygiene recalls, drop tax request SLA status items, lose issued-document notices, or miss post-visit checkups.",
			},
			null,
			2,
		),
	);
	process.exit(1);
}

console.log(
	JSON.stringify(
		{
			ok: true,
			checked:
				"Telegram reminder grace window, payment reminders, hygiene recalls, post-visit task coverage/checkups, tax request SLA, and document-ready source guards.",
		},
		null,
		2,
	),
);
