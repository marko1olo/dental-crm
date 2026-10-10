import {
	type MigrationEntityKind,
	type MigrationQuarantineItem,
	type MigrationRunSummary,
	migrationEntityKindTitles,
} from "@dental/shared";
import { and, desc, eq, inArray } from "drizzle-orm";
import { withTenantCtx } from "../../db/rls.js";
import {
	appointments,
	auditEvents,
	migrationEntityLinks,
	migrationQuarantineRecords,
	migrationRuns,
	migrationStagingRecords,
	patients,
	payments,
	visits,
} from "../../db/schema.js";
import {
	ROLLBACK_ORDER,
	type RollbackOutcome,
} from "./types.js";

export function summaryFrom(
	run: typeof migrationRuns.$inferSelect,
): MigrationRunSummary {
	return {
		runId: run.id,
		sourceName: run.sourceName,
		sourceKind: run.sourceKind,
		vendorProfile: run.vendorProfile,
		status: run.status,
		dryRun: run.dryRun,
		sourceRows: run.sourceRows,
		stagedRows: run.stagedRows,
		loadedRows: run.loadedRows,
		updatedRows: run.updatedRows,
		duplicateRows: run.duplicateRows,
		quarantinedRows: run.quarantinedRows,
		skippedRows: run.skippedRows,
		llmCalls: run.llmCalls,
		llmRejectedSuggestions: run.llmRejectedSuggestions,
		startedAt: run.startedAt?.toISOString() ?? null,
		finishedAt: run.finishedAt?.toISOString() ?? null,
		errorMessage: run.errorMessage,
	};
}

/** Записи карантина прогона с привязкой к строке источника. */
export async function listQuarantine(
	organizationId: string,
	runId: string,
	limit = 200,
	offset = 0,
): Promise<MigrationQuarantineItem[]> {
	const rows = await withTenantCtx(organizationId, async (tx) =>
		tx
			.select({
				id: migrationQuarantineRecords.id,
				stagingRecordId: migrationQuarantineRecords.stagingRecordId,
				entityKind: migrationQuarantineRecords.entityKind,
				reason: migrationQuarantineRecords.reason,
				blocking: migrationQuarantineRecords.blocking,
				fieldPath: migrationQuarantineRecords.fieldPath,
				message: migrationQuarantineRecords.message,
				suggestedFix: migrationQuarantineRecords.suggestedFix,
				resolution: migrationQuarantineRecords.resolution,
				sourceRowNumber: migrationStagingRecords.sourceRowNumber,
				sourceTable: migrationStagingRecords.sourceTable,
			})
			.from(migrationQuarantineRecords)
			.leftJoin(
				migrationStagingRecords,
				eq(
					migrationQuarantineRecords.stagingRecordId,
					migrationStagingRecords.id,
				),
			)
			.where(
				and(
					eq(migrationQuarantineRecords.runId, runId),
					eq(migrationQuarantineRecords.organizationId, organizationId),
				),
			)
			// Блокирующее вперёд: это то, что требует действия.
			.orderBy(
				desc(migrationQuarantineRecords.blocking),
				migrationQuarantineRecords.createdAt,
			)
			.limit(limit)
			.offset(offset),
	);

	return rows.map((row) => ({
		id: row.id,
		stagingRecordId: row.stagingRecordId,
		entityKind: row.entityKind,
		reason: row.reason,
		blocking: row.blocking,
		fieldPath: row.fieldPath,
		message: row.message,
		suggestedFix: row.suggestedFix,
		resolution: row.resolution,
		sourceRowNumber: row.sourceRowNumber,
		sourceTable: row.sourceTable,
	}));
}

/** Прогоны организации, свежие первыми. */
export async function listRuns(
	organizationId: string,
	limit = 50,
): Promise<MigrationRunSummary[]> {
	const rows = await withTenantCtx(organizationId, async (tx) =>
		tx
			.select()
			.from(migrationRuns)
			.where(eq(migrationRuns.organizationId, organizationId))
			.orderBy(desc(migrationRuns.createdAt))
			.limit(limit),
	);
	return rows.map(summaryFrom);
}

// ---------------------------------------------------------------------------
// Откат
// ---------------------------------------------------------------------------

/**
 * Отменяет загрузку прогона.
 *
 * Удаляется ТОЛЬКО то, что создал этот прогон: список берётся из
 * migration_entity_links, где записана каждая созданная сущность. Записи,
 * обновлённые прогоном (status = updated), не удаляются — они существовали до
 * него, и удалить их значило бы уничтожить данные клиники.
 *
 * Сущность, на которую после переноса уже сослались новой работой (пациенту
 * записали приём в новой системе), не удаляется: она сохраняется, и о ней
 * сообщается отдельно. Молча удалить её каскадом означало бы потерять работу,
 * сделанную после переноса.
 */
export async function rollbackRun(input: {
	organizationId: string;
	runId: string;
	actorUserId?: string | null;
}): Promise<{
	outcomes: RollbackOutcome[];
	status: "rolled_back";
	message: string;
}> {
	const [run] = await withTenantCtx(input.organizationId, async (tx) =>
		tx
			.select()
			.from(migrationRuns)
			.where(
				and(
					eq(migrationRuns.id, input.runId),
					eq(migrationRuns.organizationId, input.organizationId),
				),
			),
	);

	if (!run) throw new Error("Прогон переноса не найден в этой организации.");
	if (run.status === "rolled_back") throw new Error("Этот прогон уже откачен.");
	if (run.dryRun)
		throw new Error("Сухой прогон ничего не записывал — откатывать нечего.");

	const links = await withTenantCtx(input.organizationId, async (tx) =>
		tx
			.select({
				id: migrationEntityLinks.id,
				entityKind: migrationEntityLinks.entityKind,
				targetEntityId: migrationEntityLinks.targetEntityId,
			})
			.from(migrationEntityLinks)
			.where(
				and(
					eq(migrationEntityLinks.createdByRunId, input.runId),
					eq(migrationEntityLinks.organizationId, input.organizationId),
				),
			),
	);

	const byKind = new Map<MigrationEntityKind, string[]>();
	for (const link of links) {
		const group = byKind.get(link.entityKind) ?? [];
		group.push(link.targetEntityId);
		byKind.set(link.entityKind, group);
	}

	const outcomes: RollbackOutcome[] = [];

	/**
	 * БЫЛО `db.transaction(...)` без тенант-контекста. Откат — это DELETE по
	 * боевым таблицам под FORCE RLS, а DELETE под RLS МОЛЧА совпадает с нулём
	 * строк: откат «проходил» и отчитывался «удалено 0», ничего не удалив.
	 * СТАЛО: та же одна транзакция (откат обязан быть неделим — иначе половина
	 * удалена, половина нет), но с установленным арендатором.
	 */
	await withTenantCtx(input.organizationId, async (tx) => {
		for (const entityKind of ROLLBACK_ORDER) {
			const ids = byKind.get(entityKind);
			if (!ids?.length) continue;

			let deleted = 0;
			let retained = 0;
			let retainedReason: string | null = null;

			if (entityKind === "payment") {
				const removed = await tx
					.delete(payments)
					.where(
						and(
							eq(payments.organizationId, input.organizationId),
							inArray(payments.id, ids),
						),
					)
					.returning({ id: payments.id });
				deleted = removed.length;
				retained = ids.length - deleted;
			} else if (entityKind === "visit") {
				const removed = await tx
					.delete(visits)
					.where(
						and(
							eq(visits.organizationId, input.organizationId),
							inArray(visits.id, ids),
						),
					)
					.returning({ id: visits.id });
				deleted = removed.length;
				retained = ids.length - deleted;
			} else if (entityKind === "appointment") {
				const removed = await tx
					.delete(appointments)
					.where(
						and(
							eq(appointments.organizationId, input.organizationId),
							inArray(appointments.id, ids),
						),
					)
					.returning({ id: appointments.id });
				deleted = removed.length;
				retained = ids.length - deleted;
			} else if (entityKind === "patient") {
				/**
				 * Пациент удаляется только если на него не ссылается ничего, созданного
				 * после переноса. Проверяется явно, до удаления: полагаться на отказ
				 * внешнего ключа нельзя, потому что он оборвал бы всю транзакцию отката.
				 */
				const referencedRows = await tx
					.select({ patientId: appointments.patientId })
					.from(appointments)
					.where(
						and(
							eq(appointments.organizationId, input.organizationId),
							inArray(appointments.patientId, ids),
						),
					)
					.union(
						tx
							.select({ patientId: visits.patientId })
							.from(visits)
							.where(
								and(
									eq(visits.organizationId, input.organizationId),
									inArray(visits.patientId, ids),
								),
							),
					)
					.union(
						tx
							.select({ patientId: payments.patientId })
							.from(payments)
							.where(
								and(
									eq(payments.organizationId, input.organizationId),
									inArray(payments.patientId, ids),
								),
							),
					);

				const referenced = new Set(
					referencedRows
						.map((row) => row.patientId)
						.filter((value): value is string => Boolean(value)),
				);
				const deletable = ids.filter((id) => !referenced.has(id));
				retained = ids.length - deletable.length;
				if (retained > 0) {
					retainedReason =
						"На карточки уже ссылаются приёмы, записи или платежи, появившиеся после переноса. Такие карточки сохранены, чтобы не потерять работу, сделанную после миграции.";
				}

				if (deletable.length > 0) {
					const removed = await tx
						.delete(patients)
						.where(
							and(
								eq(patients.organizationId, input.organizationId),
								inArray(patients.id, deletable),
							),
						)
						.returning({ id: patients.id });
					deleted = removed.length;
				}
			} else {
				retained = ids.length;
				retainedReason = `Откат для сущности «${migrationEntityKindTitles[entityKind]}» не реализован — она и не загружалась автоматически.`;
			}

			outcomes.push({ entityKind, deleted, retained, retainedReason });
		}

		/**
		 * Ссылки удалённых сущностей убираются: иначе повторный перенос увидит
		 * соответствие «ключ старой системы → удалённый uuid» и решит, что пациент
		 * уже перенесён, — и не создаст его.
		 */
		await tx
			.delete(migrationEntityLinks)
			.where(
				and(
					eq(migrationEntityLinks.createdByRunId, input.runId),
					eq(migrationEntityLinks.organizationId, input.organizationId),
				),
			);

		await tx
			.update(migrationStagingRecords)
			.set({ status: "skipped", targetEntityId: null, updatedAt: new Date() })
			.where(
				and(
					eq(migrationStagingRecords.runId, input.runId),
					inArray(migrationStagingRecords.status, ["loaded", "updated"]),
				),
			);

		await tx
			.update(migrationRuns)
			.set({
				status: "rolled_back",
				updatedAt: new Date(),
				finishedAt: new Date(),
			})
			.where(eq(migrationRuns.id, input.runId));

		await tx.insert(auditEvents).values({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId ?? null,
			entityType: "migration_run",
			entityId: input.runId,
			action: "migration_rolled_back",
			reason: `Откат переноса из «${run.sourceName}»: ${outcomes
				.map(
					(outcome) =>
						`${outcome.entityKind} удалено ${outcome.deleted}, сохранено ${outcome.retained}`,
				)
				.join("; ")}.`,
		});
	});

	const totalDeleted = outcomes.reduce(
		(sum, outcome) => sum + outcome.deleted,
		0,
	);
	const totalRetained = outcomes.reduce(
		(sum, outcome) => sum + outcome.retained,
		0,
	);

	return {
		outcomes,
		status: "rolled_back",
		message:
			totalRetained === 0
				? `Откат выполнен: удалено ${totalDeleted} записей, созданных переносом. Исходные строки сохранены в стейджинге и доступны для повторной загрузки.`
				: `Откат выполнен частично: удалено ${totalDeleted} записей, сохранено ${totalRetained}, на которые уже сослались после переноса. Подробности по сущностям — в отчёте.`,
	};
}
