/**
 * Что лежит в очереди сообщений прямо сейчас.
 *
 * ЗАЧЕМ. Очередь — единственное место, где видно, почему пациент не получил
 * сообщение: подавлено по согласию, отложено тихими часами, ждёт повтора после
 * сбоя шлюза. Без такого взгляда остаётся догадываться, а догадки про отправку
 * сообщений живым людям — плохая основа для решений.
 *
 * Поводом послужило расследование: три теста журнала сообщений падали, и надо
 * было отличить дефект кода от строк, оставшихся в базе после прерванных
 * прогонов. Читать очередь глазами оказалось нечем.
 *
 * Только чтение. Никаких изменений, никаких отправок.
 *
 *   npx tsx src/scripts/inspectOutbox.ts                     — сводка по всем
 *   npx tsx src/scripts/inspectOutbox.ts <organizationId>    — одна клиника
 *   npx tsx src/scripts/inspectOutbox.ts <organizationId> --rows
 */

import { desc, eq, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { communicationOutbox } from "../db/schema.js";

const organizationId =
	process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : null;
const showRows = process.argv.includes("--rows");

const summary = await db
	.select({
		organizationId: communicationOutbox.organizationId,
		status: communicationOutbox.status,
		intent: communicationOutbox.intent,
		total: sql<number>`count(*)::int`,
	})
	.from(communicationOutbox)
	.where(
		organizationId
			? eq(communicationOutbox.organizationId, organizationId)
			: sql`true`,
	)
	.groupBy(
		communicationOutbox.organizationId,
		communicationOutbox.status,
		communicationOutbox.intent,
	)
	.orderBy(communicationOutbox.organizationId, communicationOutbox.status);

if (summary.length === 0) {
	console.log(
		organizationId ? "Очередь этой клиники пуста." : "Очередь пуста.",
	);
} else {
	console.log(
		"Клиника                              | статус     | назначение                | строк",
	);
	console.log(
		"-------------------------------------|------------|---------------------------|------",
	);
	for (const row of summary) {
		console.log(
			`${row.organizationId} | ${String(row.status).padEnd(10)} | ${String(row.intent).padEnd(25)} | ${row.total}`,
		);
	}
}

if (showRows) {
	const rows = await db
		.select({
			dedupeKey: communicationOutbox.dedupeKey,
			status: communicationOutbox.status,
			channel: communicationOutbox.channel,
			attempts: communicationOutbox.attempts,
			lockedAt: communicationOutbox.lockedAt,
			errorClass: communicationOutbox.lastErrorClass,
			errorMessage: communicationOutbox.lastErrorMessage,
		})
		.from(communicationOutbox)
		.where(
			organizationId
				? eq(communicationOutbox.organizationId, organizationId)
				: sql`true`,
		)
		.orderBy(desc(communicationOutbox.createdAt))
		.limit(50);

	console.log("\nПоследние строки (до 50):");
	for (const row of rows) {
		const lock = row.lockedAt ? " [захвачена]" : "";
		const failure = row.errorClass
			? ` — ${row.errorClass}: ${row.errorMessage ?? ""}`
			: "";
		console.log(
			`  ${row.status.padEnd(10)} ${row.channel.padEnd(9)} попыток ${row.attempts}${lock} ${row.dedupeKey}${failure}`,
		);
	}
}

process.exit(0);
