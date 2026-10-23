import { and, eq, isNull, or } from "drizzle-orm";
import { db } from "../../../db/client.js";
import { visitDiaries } from "../../../db/schema.js";
import {
	computeDiaryHash,
	resolveSignatureForStorage,
} from "../../../services/clinical/DiarySigningCeremonyService.js";

export type ReattachTxResult =
	| { kind: "not_found" }
	| { kind: "not_locked" }
	| { kind: "already"; hash: string | null; lockedAt: string | null; hasPkcs7: boolean }
	| { kind: "pin_rejected"; code: string; message: string }
	| { kind: "ok"; hash: string; lockedAt: string | null; attached: boolean };

export function lockedAtIsoFrom(lockedAt: Date | string | null | undefined): string | null {
	return lockedAt instanceof Date ? lockedAt.toISOString() : typeof lockedAt === "string" ? lockedAt : null;
}

export async function executeReattachCeremony(params: {
	id: string;
	orgId: string;
	userId: string | null;
	incomingPkcs7: string;
}): Promise<ReattachTxResult> {
	const { id, orgId, userId, incomingPkcs7 } = params;

	return await db.transaction(async (tx) => {
		const [row] = await tx
			.select()
			.from(visitDiaries)
			.where(and(eq(visitDiaries.id, id), eq(visitDiaries.organizationId, orgId)))
			.for("update");

		if (!row) return { kind: "not_found" as const };
		if (!row.isLocked) return { kind: "not_locked" as const };

		const lockedAtIso = lockedAtIsoFrom(row.lockedAt);
		const hasPkcs7 = typeof row.cryptoSignaturePkcs7 === "string" && row.cryptoSignaturePkcs7.length > 0;
		if (hasPkcs7) {
			return { kind: "already" as const, hash: row.diaryHash, lockedAt: lockedAtIso, hasPkcs7: true };
		}

		const reattachHash = computeDiaryHash(
			row.visitId,
			row.patientId ?? "",
			row.anamnesis,
			row.statusLocalis,
			row.treatmentDescription,
			row.diagnosisIcd10,
			row.diagnosisTooth,
			row.complications,
			row.comorbidities,
			row.instrumentTrayBarcode,
		);
		const resolvedReattach = await resolveSignatureForStorage({
			pkcs7Signature: incomingPkcs7,
			userId,
			organizationId: orgId,
			diaryHashForMark: reattachHash,
		});
		if (!resolvedReattach.ok) {
			return {
				kind: "pin_rejected" as const,
				code: resolvedReattach.code,
				message: resolvedReattach.message,
			};
		}

		const now = new Date();
		const updatedRows = await tx
			.update(visitDiaries)
			.set({
				diaryHash: reattachHash,
				cryptoSignaturePkcs7: resolvedReattach.stored,
				coSignedByUserId: userId,
				authorId: row.authorId ?? userId,
				doctorId: row.doctorId ?? userId,
				lockedByUserId: row.lockedByUserId ?? userId,
				updatedAt: now,
			})
			.where(
				and(
					eq(visitDiaries.id, id),
					eq(visitDiaries.organizationId, orgId),
					eq(visitDiaries.isLocked, true),
					or(isNull(visitDiaries.cryptoSignaturePkcs7), eq(visitDiaries.cryptoSignaturePkcs7, "")),
				),
			)
			.returning({ id: visitDiaries.id });

		if (updatedRows.length === 0) {
			const [again] = await tx
				.select({
					diaryHash: visitDiaries.diaryHash,
					lockedAt: visitDiaries.lockedAt,
					cryptoSignaturePkcs7: visitDiaries.cryptoSignaturePkcs7,
				})
				.from(visitDiaries)
				.where(and(eq(visitDiaries.id, id), eq(visitDiaries.organizationId, orgId)))
				.limit(1);
			const againHas = typeof again?.cryptoSignaturePkcs7 === "string" && again.cryptoSignaturePkcs7.length > 0;
			return {
				kind: "already" as const,
				hash: again?.diaryHash ?? row.diaryHash,
				lockedAt: lockedAtIsoFrom(again?.lockedAt ?? row.lockedAt),
				hasPkcs7: againHas,
			};
		}

		return {
			kind: "ok" as const,
			hash: reattachHash,
			lockedAt: lockedAtIso,
			attached: Boolean(resolvedReattach.stored),
		};
	});
}
