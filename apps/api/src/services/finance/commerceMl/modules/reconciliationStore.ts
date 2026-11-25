import { and, eq } from "drizzle-orm";
import { withTenantCtx, type TenantDb } from "../../../../db/rls.js";
import { commercemlExportedPackages, commercemlSyncJournal } from "../../../../db/schema.js";
import type { DoublePostingCheckResult } from "../types.js";

export interface SyncJournalEntrySummary {
	id: string;
	processedCount: number;
	createdCount: number;
	updatedCount: number;
	createdAt: Date;
}

export async function getSyncJournalEntryTx(
	tx: TenantDb,
	organizationId: string,
	hash: string,
): Promise<SyncJournalEntrySummary | null> {
	const [row] = await tx
		.select({
			id: commercemlSyncJournal.id,
			processedCount: commercemlSyncJournal.processedCount,
			createdCount: commercemlSyncJournal.createdCount,
			updatedCount: commercemlSyncJournal.updatedCount,
			createdAt: commercemlSyncJournal.createdAt,
		})
		.from(commercemlSyncJournal)
		.where(
			and(
				eq(commercemlSyncJournal.organizationId, organizationId),
				eq(commercemlSyncJournal.packageId, hash),
			),
		)
		.limit(1);
	return row ?? null;
}

export async function isSyncHashProcessedTx(
	tx: TenantDb,
	organizationId: string,
	hash: string,
): Promise<boolean> {
	const row = await getSyncJournalEntryTx(tx, organizationId, hash);
	return Boolean(row);
}

export async function isSyncHashProcessed(
	organizationId: string,
	hash: string,
): Promise<boolean> {
	return withTenantCtx(organizationId, (tx) => isSyncHashProcessedTx(tx, organizationId, hash));
}

export async function markSyncHashProcessedTx(
	tx: TenantDb,
	organizationId: string,
	hash: string,
	meta?: {
		syncTransactionId?: string | undefined;
		status?: string | undefined;
		processedCount?: number | undefined;
		createdCount?: number | undefined;
		updatedCount?: number | undefined;
		errorsJson?: string[] | undefined;
		summaryText?: string | undefined;
		actorUserId?: string | undefined;
	},
): Promise<void> {
	await tx.insert(commercemlSyncJournal).values({
		organizationId,
		syncId: meta?.syncTransactionId || hash,
		packageId: hash,
		direction: "inbound",
		status: meta?.status || "success",
		processedCount: meta?.processedCount ?? 0,
		createdCount: meta?.createdCount ?? 0,
		updatedCount: meta?.updatedCount ?? 0,
		errorsJson: meta?.errorsJson ?? [],
		summaryText: meta?.summaryText ?? "",
		actorUserId: meta?.actorUserId ?? null,
	});
}

export async function markSyncHashProcessed(
	organizationId: string,
	hash: string,
): Promise<void> {
	await withTenantCtx(organizationId, (tx) => markSyncHashProcessedTx(tx, organizationId, hash));
}

export async function registerExportedPackageTx(
	tx: TenantDb,
	organizationId: string,
	sha256: string,
	info: {
		exportedAtIso: string;
		packageId: string;
		packageKind?: string | undefined;
		documentCount?: number | undefined;
		totalAmountKopecks?: number | bigint | undefined;
		exportedByUserId?: string | undefined;
	},
): Promise<void> {
	const parsedDate = new Date(info.exportedAtIso);
	const exportedAt = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
	await tx
		.insert(commercemlExportedPackages)
		.values({
			organizationId,
			packageId: sha256,
			packageKind: info.packageKind || info.packageId || "shift_export",
			documentCount: info.documentCount ?? 0,
			totalAmountKopecks: BigInt(info.totalAmountKopecks ?? 0),
			exportedByUserId: info.exportedByUserId ?? null,
			exportedAt,
		})
		.onConflictDoNothing({
			target: [commercemlExportedPackages.organizationId, commercemlExportedPackages.packageId],
		});
}

export async function registerExportedPackage(
	organizationId: string,
	sha256: string,
	info: {
		exportedAtIso: string;
		packageId: string;
		packageKind?: string | undefined;
		documentCount?: number | undefined;
		totalAmountKopecks?: number | bigint | undefined;
		exportedByUserId?: string | undefined;
	},
): Promise<void> {
	await withTenantCtx(organizationId, (tx) =>
		registerExportedPackageTx(tx, organizationId, sha256, info),
	);
}

export async function checkDoublePosting(
	organizationId: string,
	sha256Hash: string,
): Promise<DoublePostingCheckResult> {
	const [existing] = await withTenantCtx(organizationId, (tx) =>
		tx
			.select({
				packageId: commercemlExportedPackages.packageId,
				exportedAt: commercemlExportedPackages.exportedAt,
			})
			.from(commercemlExportedPackages)
			.where(
				and(
					eq(commercemlExportedPackages.organizationId, organizationId),
					eq(commercemlExportedPackages.packageId, sha256Hash),
				),
			)
			.limit(1),
	);

	if (existing) {
		const previousExportDate = existing.exportedAt.toISOString();
		return {
			isDoublePosting: true,
			previousExportDate,
			message: `ВНИМАНИЕ: Пакет с контрольным хэшем SHA-256 (${sha256Hash.slice(0, 16)}...) уже выгружался ранее (${previousExportDate}). Повторное проведение может привести к удвоению проводок в 1С!`,
		};
	}

	return {
		isDoublePosting: false,
		message: "Пакет уникален, двойное проведение отсутствует.",
	};
}

export async function clearReconciliationStoreForTests(organizationId?: string): Promise<void> {
	if (!organizationId) return;
	await withTenantCtx(organizationId, async (tx) => {
		await tx
			.delete(commercemlSyncJournal)
			.where(eq(commercemlSyncJournal.organizationId, organizationId));
		await tx
			.delete(commercemlExportedPackages)
			.where(eq(commercemlExportedPackages.organizationId, organizationId));
	});
}
