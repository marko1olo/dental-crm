import { and, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { db } from "../../db/client.js";
import { familyGroups, patients, payments } from "../../db/schema.js";

export async function familyGroupForOrganization(
	familyGroupId: string,
	organizationId: string,
) {
	const [family] = await db
		.select()
		.from(familyGroups)
		.where(
			and(
				eq(familyGroups.id, familyGroupId),
				eq(familyGroups.organizationId, organizationId),
			),
		)
		.limit(1);
	return family ?? null;
}

export async function familyMembersForOrganization(
	familyGroupId: string,
	organizationId: string,
) {
	return db
		.select({
			id: patients.id,
			fullName: patients.fullName,
			phone: patients.phone,
		})
		.from(patients)
		.where(
			and(
				eq(patients.familyGroupId, familyGroupId),
				eq(patients.organizationId, organizationId),
			),
		);
}

export async function getFamilyHistoryRecords(
	familyGroupId: string,
	organizationId: string,
) {
	const family = await familyGroupForOrganization(familyGroupId, organizationId);
	if (!family) return null;

	const members = await familyMembersForOrganization(familyGroupId, organizationId);
	const memberMap = new Map<string, string>();
	const memberIds: string[] = [];

	for (const m of members) {
		memberMap.set(m.id, m.fullName || "Член семьи");
		memberIds.push(m.id);
	}
	if (family.headPatientId && !memberMap.has(family.headPatientId)) {
		memberIds.push(family.headPatientId);
		const [headPat] = await db
			.select({ id: patients.id, fullName: patients.fullName })
			.from(patients)
			.where(and(eq(patients.id, family.headPatientId), eq(patients.organizationId, organizationId)))
			.limit(1);
		if (headPat) {
			memberMap.set(headPat.id, headPat.fullName || "Глава семьи");
		}
	}
	if (memberIds.length === 0) return [];

	const paymentRows = await db
		.select()
		.from(payments)
		.where(
			and(
				eq(payments.organizationId, organizationId),
				inArray(payments.patientId, memberIds),
				or(
					eq(payments.method, "family_wallet"),
					eq(payments.status, "planned"),
					eq(payments.status, "refunded"),
					ilike(payments.note, "%семейный%"),
					ilike(payments.note, "%депозит%"),
				),
			),
		)
		.orderBy(desc(payments.createdAt))
		.limit(100);

	return paymentRows.map((p) => {
		const isPlanned = p.status === "planned";
		const isVoided = p.status === "voided" || p.status === "refunded" || Number(p.amountRub) < 0;
		const isTopup = isPlanned || (p.note ? p.note.toLowerCase().includes("пополнение") : false);
		const isRefund = isVoided || (p.note ? p.note.toLowerCase().includes("возврат") : false);
		const operationType: "topup" | "spend" | "refund" = isRefund ? "refund" : isTopup ? "topup" : "spend";
		const patientName = memberMap.get(p.patientId) || p.payerFullName || "Член семьи";
		const headName = (family.headPatientId && memberMap.get(family.headPatientId)) || "Семейный счёт";

		return {
			id: p.id,
			date: p.createdAt ? p.createdAt.toISOString() : new Date().toISOString(),
			operationType,
			amountRub: Math.abs(Number(p.amountRub)),
			payerPatientId: isTopup ? p.patientId : family.headPatientId || p.patientId,
			payerName: isTopup ? patientName : headName,
			targetPatientId: p.patientId,
			targetName: patientName,
			method: p.method === "family_wallet" ? "pool" : p.method,
			note: p.note || (isRefund ? "Возврат с семейного депозита" : isTopup ? "Пополнение семейного счёта" : "Оплата стоматологических услуг"),
		};
	});
}
