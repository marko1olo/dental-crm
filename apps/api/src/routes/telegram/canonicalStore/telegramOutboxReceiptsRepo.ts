import { and, eq } from "drizzle-orm";
import type {
	DenteTelegramOutboxDeliveryReceipt,
	DenteTelegramOutboxItem,
} from "@dental/shared";
import { withTenantCtx, type TenantDb } from "../../../db/rls.js";
import {
	communicationEvents as communicationEventsTable,
	denteTelegramOutboxDeliveryReceipts as denteTelegramOutboxDeliveryReceiptsTable,
} from "../../../db/schema.js";
import { createApiLogger, safeLogError } from "../../../observability/logger.js";
import {
	denteTelegramOutboxDeliveryReceipts,
	denteTelegramOutboxDeliveryReceiptsMap,
	toValidUuid,
	uniqueStrings,
} from "./telegramRuntimeDefaults.js";

const logger = createApiLogger("telegramOutboxReceiptsRepo");

function parseReceiptRow(
	receiptRow: typeof denteTelegramOutboxDeliveryReceiptsTable.$inferSelect,
): DenteTelegramOutboxDeliveryReceipt {
	let outboxItem: DenteTelegramOutboxItem | null = null;
	if (receiptRow.outboxItemJson) {
		try {
			outboxItem = JSON.parse(receiptRow.outboxItemJson);
		} catch (err) {
			logger.warn(
				{ err: safeLogError(err), outboxItemId: receiptRow.outboxItemId },
				"Failed to parse outboxItemJson from delivery receipt",
			);
			outboxItem = null;
		}
	}

	let warnings: string[] = [];
	if (receiptRow.warningsJson) {
		try {
			warnings = JSON.parse(receiptRow.warningsJson);
		} catch (err) {
			logger.warn(
				{ err: safeLogError(err), outboxItemId: receiptRow.outboxItemId },
				"Failed to parse warningsJson from delivery receipt",
			);
			warnings = [];
		}
	}

	return {
		outboxItemId: receiptRow.outboxItemId,
		status: receiptRow.status as "sent" | "blocked" | "failed",
		outboxItem,
		taskId: receiptRow.taskId,
		eventId: receiptRow.eventId,
		telegramMessageId: receiptRow.telegramMessageId,
		clientMutationId: receiptRow.clientMutationId,
		warnings,
		blockedReason: receiptRow.blockedReason,
		createdAt: receiptRow.createdAt.toISOString(),
	};
}

async function queryReceiptInTx(
	tx: TenantDb,
	targetOrgId: string,
	outboxItemId: string,
	clientMutationId: string,
): Promise<DenteTelegramOutboxDeliveryReceipt | null> {
	const [receiptRow] = await tx
		.select()
		.from(denteTelegramOutboxDeliveryReceiptsTable)
		.where(
			and(
				eq(denteTelegramOutboxDeliveryReceiptsTable.organizationId, targetOrgId),
				eq(denteTelegramOutboxDeliveryReceiptsTable.outboxItemId, outboxItemId),
				eq(
					denteTelegramOutboxDeliveryReceiptsTable.clientMutationId,
					clientMutationId,
				),
			),
		)
		.limit(1);

	return receiptRow ? parseReceiptRow(receiptRow) : null;
}

export function syncDenteTelegramOutboxDeliveryReceiptsMap(): void {
	denteTelegramOutboxDeliveryReceiptsMap.clear();
	for (const receipt of denteTelegramOutboxDeliveryReceipts) {
		denteTelegramOutboxDeliveryReceiptsMap.set(
			`${receipt.outboxItemId}:${receipt.clientMutationId}`,
			receipt,
		);
	}
}

export function findDenteTelegramOutboxDeliveryReceipt(
	outboxItemId: string,
	clientMutationId: string | null | undefined,
): DenteTelegramOutboxDeliveryReceipt | null {
	if (!clientMutationId) return null;
	return (
		denteTelegramOutboxDeliveryReceiptsMap.get(
			`${outboxItemId}:${clientMutationId}`,
		) ?? null
	);
}

export async function findDenteTelegramOutboxDeliveryReceiptDb(
	organizationId: string | null | undefined,
	outboxItemId: string,
	clientMutationId: string | null | undefined,
): Promise<DenteTelegramOutboxDeliveryReceipt | null> {
	if (!clientMutationId) return null;
	const targetOrgId = toValidUuid(organizationId);
	if (!targetOrgId) return null;

	try {
		return await withTenantCtx(targetOrgId, (tx) =>
			queryReceiptInTx(tx, targetOrgId, outboxItemId, clientMutationId),
		);
	} catch (err) {
		logger.warn(
			{ err: safeLogError(err), targetOrgId, outboxItemId, clientMutationId },
			"Failed to query delivery receipt from Postgres 18",
		);
		return null;
	}
}

export function claimDenteTelegramOutboxDeliveryReceipt(
	item: DenteTelegramOutboxItem,
	clientMutationId: string,
	warnings: string[],
): DenteTelegramOutboxDeliveryReceipt | null {
	const existing = findDenteTelegramOutboxDeliveryReceipt(
		item.id,
		clientMutationId,
	);
	if (existing?.status === "failed" && clientMutationId.startsWith("due-"))
		return null;
	if (existing) return existing;

	const receipt: DenteTelegramOutboxDeliveryReceipt = {
		outboxItemId: item.id,
		status: "blocked",
		outboxItem: item,
		taskId: item.taskId,
		eventId: null,
		telegramMessageId: null,
		clientMutationId,
		warnings: uniqueStrings([...warnings, "telegram_delivery_processing"]),
		blockedReason: "telegram_delivery_processing",
		createdAt: new Date().toISOString(),
	};
	denteTelegramOutboxDeliveryReceipts.unshift(receipt);
	denteTelegramOutboxDeliveryReceiptsMap.set(
		`${receipt.outboxItemId}:${receipt.clientMutationId}`,
		receipt,
	);
	denteTelegramOutboxDeliveryReceipts.splice(200);
	return null;
}

export async function claimDenteTelegramOutboxDeliveryReceiptDb(
	organizationId: string | null | undefined,
	item: DenteTelegramOutboxItem,
	clientMutationId: string,
	warnings: string[],
): Promise<DenteTelegramOutboxDeliveryReceipt | null> {
	const targetOrgId = toValidUuid(organizationId);
	if (!targetOrgId) return null;

	try {
		return await withTenantCtx(targetOrgId, async (tx) => {
			const existing = await queryReceiptInTx(
				tx,
				targetOrgId,
				item.id,
				clientMutationId,
			);
			if (existing?.status === "failed" && clientMutationId.startsWith("due-"))
				return null;
			if (existing) return existing;

			await tx
				.insert(denteTelegramOutboxDeliveryReceiptsTable)
				.values({
					organizationId: targetOrgId,
					outboxItemId: item.id,
					status: "blocked",
					outboxItemJson: JSON.stringify(item),
					taskId: toValidUuid(item.taskId),
					eventId: null,
					telegramMessageId: null,
					clientMutationId,
					warningsJson: JSON.stringify(
						uniqueStrings([...warnings, "telegram_delivery_processing"]),
					),
					blockedReason: "telegram_delivery_processing",
				})
				.onConflictDoNothing();
			return null;
		});
	} catch (err) {
		logger.warn(
			{
				err: safeLogError(err),
				targetOrgId,
				outboxItemId: item.id,
				clientMutationId,
			},
			"Failed to claim delivery receipt in Postgres 18",
		);
		return null;
	}
}

export function recordDenteTelegramOutboxDelivery(input: {
	item: DenteTelegramOutboxItem;
	status: "sent" | "failed";
	message: string;
	organizationId?: string | null;
	telegramMessageId?: number | null;
	clientMutationId?: string | null;
	warnings?: string[];
	blockedReason?: string | null;
	actorUserId?: string | null;
}): { eventId: string | null; taskId: string | null; taskCompleted: boolean } {
	const clientMutationId = input.clientMutationId?.trim() || "";
	const receipt: DenteTelegramOutboxDeliveryReceipt = {
		outboxItemId: input.item.id,
		status: input.status,
		outboxItem: input.item,
		taskId: input.item.taskId,
		eventId: null,
		telegramMessageId: input.telegramMessageId ?? null,
		clientMutationId,
		warnings: input.warnings ?? input.item.warnings ?? [],
		blockedReason:
			input.blockedReason ??
			(input.status === "failed" ? "telegram_transport_failed" : null),
		createdAt: new Date().toISOString(),
	};
	denteTelegramOutboxDeliveryReceipts.unshift(receipt);
	if (clientMutationId) {
		denteTelegramOutboxDeliveryReceiptsMap.set(
			`${receipt.outboxItemId}:${receipt.clientMutationId}`,
			receipt,
		);
	}
	denteTelegramOutboxDeliveryReceipts.splice(200);
	return {
		eventId: null,
		taskId: input.item.taskId,
		taskCompleted: input.status === "sent",
	};
}

export async function recordDenteTelegramOutboxDeliveryDb(input: {
	item: DenteTelegramOutboxItem;
	status: "sent" | "failed";
	message: string;
	organizationId?: string | null;
	telegramMessageId?: number | null;
	clientMutationId?: string | null;
	warnings?: string[];
	blockedReason?: string | null;
	actorUserId?: string | null;
}): Promise<{
	eventId: string | null;
	taskId: string | null;
	taskCompleted: boolean;
}> {
	const memResult = recordDenteTelegramOutboxDelivery(input);
	const targetOrgId =
		toValidUuid(input.organizationId) ?? toValidUuid(input.item.organizationId);
	const clientMutationId = input.clientMutationId?.trim() || "";
	const patientId = toValidUuid(input.item.patientId);
	const taskId = toValidUuid(input.item.taskId);

	let dbEventId: string | null = null;
	if (!targetOrgId) return memResult;

	try {
		dbEventId = await withTenantCtx(targetOrgId, async (tx) => {
			let insertedEventId: string | null = null;
			if (patientId) {
				const [insertedEvent] = await tx
					.insert(communicationEventsTable)
					.values({
						organizationId: targetOrgId,
						taskId,
						patientId,
						actorUserId: toValidUuid(input.actorUserId ?? null),
						channel: "telegram",
						direction: "outbound",
						status: input.status === "sent" ? "sent" : "failed",
						message: input.message,
					})
					.returning({ id: communicationEventsTable.id });
				if (insertedEvent?.id) {
					insertedEventId = insertedEvent.id;
				}
			}

			if (clientMutationId) {
				await tx
					.insert(denteTelegramOutboxDeliveryReceiptsTable)
					.values({
						organizationId: targetOrgId,
						outboxItemId: input.item.id,
						status: input.status,
						outboxItemJson: JSON.stringify(input.item),
						taskId,
						eventId: insertedEventId ?? toValidUuid(memResult.eventId),
						telegramMessageId:
							typeof input.telegramMessageId === "number"
								? input.telegramMessageId
								: null,
						clientMutationId,
						warningsJson: JSON.stringify(
							input.warnings ?? input.item.warnings ?? [],
						),
						blockedReason:
							input.blockedReason ??
							(input.status === "failed" ? "telegram_transport_failed" : null),
					})
					.onConflictDoNothing();
			}

			return insertedEventId;
		});
	} catch (dbErr) {
		logger.warn(
			{
				err: safeLogError(dbErr),
				targetOrgId,
				outboxItemId: input.item.id,
				clientMutationId,
			},
			"Failed to persist delivery receipt to Postgres 18",
		);
	}

	return {
		eventId: dbEventId ?? memResult.eventId,
		taskId: memResult.taskId,
		taskCompleted: memResult.taskCompleted,
	};
}
