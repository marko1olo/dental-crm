import { and, eq, isNull, like, or } from "drizzle-orm";
import { db } from "../../../db/client.js";
import { visitDiaries } from "../../../db/schema.js";
import {
	computeDiaryHash,
	isCertifiedUkepSignature,
	resolveSignatureForStorage,
} from "../../../services/clinical/DiarySigningCeremonyService.js";
import type { DiaryDbTransaction } from "../../../services/clinical/signingModules/signatureTypeVerifier.js";

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
	tx?: DiaryDbTransaction | undefined;
}): Promise<ReattachTxResult> {
	const { id, orgId, userId, incomingPkcs7 } = params;

	const runWithTx = async (tx: DiaryDbTransaction): Promise<ReattachTxResult> => {
		const [row] = await tx
			.select()
			.from(visitDiaries)
			.where(and(eq(visitDiaries.id, id), eq(visitDiaries.organizationId, orgId)))
			.for("update");

		if (!row) return { kind: "not_found" as const };
		if (!row.isLocked) return { kind: "not_locked" as const };

		const lockedAtIso = lockedAtIsoFrom(row.lockedAt);
		const hasPkcs7 = isCertifiedUkepSignature(row.cryptoSignaturePkcs7);
		if (hasPkcs7) {
			return { kind: "already" as const, hash: row.diaryHash, lockedAt: lockedAtIso, hasPkcs7: true };
		}

		const reattachHash = computeDiaryHash(
			row.visitId,
			row.patientId ?? "",
			row.complaint,
			row.anamnesis,
			row.statusLocalis,
			row.treatmentDescription,
			row.diagnosisIcd10,
			row.diagnosisTooth,
			row.complications,
			row.comorbidities,
		);
		const resolvedReattach = await resolveSignatureForStorage({
			pkcs7Signature: incomingPkcs7,
			userId,
			organizationId: orgId,
			diaryHashForMark: reattachHash,
			executor: tx,
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
					or(
						isNull(visitDiaries.cryptoSignaturePkcs7),
						eq(visitDiaries.cryptoSignaturePkcs7, ""),
						like(visitDiaries.cryptoSignaturePkcs7, "SIMPLE_PIN_EP%"),
						like(visitDiaries.cryptoSignaturePkcs7, "PIN:%"),
						eq(visitDiaries.cryptoSignaturePkcs7, "SHIFT_SESSION"),
					),
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
			const againHas = isCertifiedUkepSignature(again?.cryptoSignaturePkcs7);
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
			attached: isCertifiedUkepSignature(resolvedReattach.stored),
		};
	};

	if (params.tx) {
		return runWithTx(params.tx);
	}
	return await db.transaction(runWithTx);
}
