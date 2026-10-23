import type { FastifyReply } from "fastify";
import { and, eq } from "drizzle-orm";
import { db } from "../../../db/client.js";
import { visitDiaries } from "../../../db/schema.js";
import { DiarySigningError } from "../../../services/clinical/DiarySigningCeremonyService.js";

export async function handleDiarySigningError(
	err: unknown,
	diaryId: string,
	orgId: string,
	reply: FastifyReply,
): Promise<void> {
	if (err instanceof DiarySigningError) {
		if (err.code === "AlreadyLocked") {
			const [lockedRow] = await db
				.select({
					diaryHash: visitDiaries.diaryHash,
					lockedAt: visitDiaries.lockedAt,
				})
				.from(visitDiaries)
				.where(and(eq(visitDiaries.id, diaryId), eq(visitDiaries.organizationId, orgId)))
				.limit(1);
			return reply.code(409).send({
				error: "AlreadyLocked",
				hash: lockedRow?.diaryHash ?? null,
				lockedAt:
					lockedRow?.lockedAt instanceof Date
						? lockedRow.lockedAt.toISOString()
						: typeof lockedRow?.lockedAt === "string"
							? lockedRow.lockedAt
							: null,
				message: err.message,
			});
		}

		if (err.code === "NotFound") {
			return reply.code(404).send({ error: "NotFound", message: err.message });
		}
		if (err.code === "NotSaved") {
			return reply.code(500).send({ error: "DiaryNotSaved", message: err.message });
		}
		if (
			err.code === "Icd10Required" ||
			err.code === "Icd10Invalid" ||
			err.code === "ToothRequired" ||
			err.code === "ToothInvalid" ||
			err.code === "PepDoctorForbidden"
		) {
			return reply.code(422).send({ error: err.code, message: err.message });
		}
		return reply.code(400).send({ error: "TransactionFailed", message: err.message });
	}
	throw err;
}
