import { and, desc, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import {
	periodontogramSites,
	periodontogramSnapshots,
	periodontogramTeeth,
} from "../db/schema.js";
import type { ToothHistoryTimelineEvent } from "./toothHistory.js";

/**
 * Fetches periodontal examination events for tooth history timeline (Форма 043/у).
 * Extracts probing depth (PD max), bleeding on probing (BOP), Miller mobility, and furcation.
 */
export async function fetchToothPeriodontalEvents(
	orgId: string,
	patientId: string,
	toothNum: number,
): Promise<ToothHistoryTimelineEvent[]> {
	try {
		const perioRecords = await db
			.select({
				snapshotId: periodontogramSnapshots.id,
				status: periodontogramSnapshots.status,
				recordedAt: periodontogramSnapshots.recordedAt,
				createdAt: periodontogramSnapshots.createdAt,
				recordedByUserId: periodontogramSnapshots.recordedByUserId,
				notes: periodontogramSnapshots.notes,
				isPresent: periodontogramTeeth.isPresent,
				isImplant: periodontogramTeeth.isImplant,
				mobility: periodontogramTeeth.mobility,
				prognosis: periodontogramTeeth.prognosis,
				furcationBuccal: periodontogramTeeth.furcationBuccal,
				furcationLingual: periodontogramTeeth.furcationLingual,
			})
			.from(periodontogramTeeth)
			.innerJoin(
				periodontogramSnapshots,
				eq(periodontogramTeeth.snapshotId, periodontogramSnapshots.id),
			)
			.where(
				and(
					eq(periodontogramSnapshots.organizationId, orgId),
					eq(periodontogramSnapshots.patientId, patientId),
					eq(periodontogramTeeth.toothNumber, toothNum),
				),
			)
			.orderBy(desc(periodontogramSnapshots.recordedAt));

		if (perioRecords.length === 0) return [];

		const events: ToothHistoryTimelineEvent[] = [];

		for (const record of perioRecords) {
			const sites = await db
				.select({
					siteCode: periodontogramSites.siteCode,
					probingDepthMm: periodontogramSites.probingDepthMm,
					gingivalMarginMm: periodontogramSites.gingivalMarginMm,
					bleedingOnProbing: periodontogramSites.bleedingOnProbing,
					suppuration: periodontogramSites.suppuration,
					plaque: periodontogramSites.plaque,
				})
				.from(periodontogramSites)
				.where(
					and(
						eq(periodontogramSites.snapshotId, record.snapshotId),
						eq(periodontogramSites.toothNumber, toothNum),
					),
				);

			let maxPd = 0;
			let hasBop = false;
			let hasSuppuration = false;
			let hasPlaque = false;

			for (const s of sites) {
				if (s.probingDepthMm && s.probingDepthMm > maxPd) {
					maxPd = s.probingDepthMm;
				}
				if (s.bleedingOnProbing) hasBop = true;
				if (s.suppuration) hasSuppuration = true;
				if (s.plaque) hasPlaque = true;
			}

			const mobilityStr =
				record.mobility !== null && record.mobility > 0
					? `ст. ${record.mobility}`
					: "0 (устойчив)";
			const furcationStr =
				record.furcationBuccal && record.furcationBuccal !== "0"
					? `вестиб. ${record.furcationBuccal}`
					: record.furcationLingual && record.furcationLingual !== "0"
						? `язычн. ${record.furcationLingual}`
						: "нет";

			const clinicalNotes = record.notes ? ` (${record.notes})` : "";
			const statusLabel = record.status === "draft" ? " [Черновик]" : "";

			const description =
				`Пародонтограмма${statusLabel}: макс. глубина кармана ${maxPd || "до 2"} мм, ` +
				`BOP: ${hasBop ? "есть" : "нет"}, подвижность: ${mobilityStr}, ` +
				`фуркация: ${furcationStr}` +
				(hasSuppuration ? ", нагноение" : "") +
				(hasPlaque ? ", налёт" : "") +
				clinicalNotes;

			events.push({
				type: "periodontogram",
				date: record.recordedAt || record.createdAt,
				description,
				authorId: record.recordedByUserId || "Пародонтолог",
				visitId: null,
				studyId: record.snapshotId,
			});
		}

		return events;
	} catch (err) {
		console.warn("[toothHistoryPerio] Ошибка извлечения пародонтограммы зуба:", err);
		return [];
	}
}
