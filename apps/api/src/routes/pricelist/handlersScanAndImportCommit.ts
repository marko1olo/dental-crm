import type { FastifyReply, FastifyRequest } from "fastify";
import { ServiceCatalogStorageDisabledError } from "../../db/pricelistQuery.js";
import { commitScanAndImportItems } from "./catalogOperations.js";
import type { ScanAndImportItem } from "./types.js";

export async function processScanAndImportCommit(params: {
	request: FastifyRequest;
	reply: FastifyReply;
	orgId: string;
	itemsToCommit: ScanAndImportItem[];
	collisionStrategy: "update_existing" | "skip_duplicates" | "create_new";
	scanResult: unknown;
}) {
	const { request, reply, orgId, itemsToCommit, collisionStrategy, scanResult } = params;
	try {
		const { createdCount, updatedCount, skippedCount } =
			await commitScanAndImportItems(orgId, itemsToCommit, collisionStrategy);

		return reply.code(200).send({
			success: true,
			committedCount: createdCount + updatedCount,
			createdCount,
			updatedCount,
			skippedCount,
			scanResult,
		});
	} catch (error) {
		if (error instanceof ServiceCatalogStorageDisabledError) {
			return reply.code(503).send({
				error: "ServiceCatalogStorageDisabled",
				message:
					"Хранилище прейскуранта отключено: настройте постоянную базу данных для сохранения услуг.",
			});
		}
		request.log.error(
			{ err: error },
			"Ошибка при транзакционной фиксации прейскуранта",
		);
		return reply.code(500).send({
			error: "PricelistCommitTransactionError",
			message:
				(error as Error).message ||
				"Ошибка транзакционного импорта прейскуранта",
		});
	}
}
