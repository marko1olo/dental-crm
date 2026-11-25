import { kopecksToNumericString, kopecksToRub, parseKopecks } from "@dental/shared";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { db } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import { familyGroups, patients, payments } from "../../db/schema.js";

type DatabaseTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type DbOrTx = DatabaseTransaction | typeof db;

export async function familyGroupForOrganization(
	familyGroupId: string,
	organizationId: string,
) {
	return withTenantCtx(organizationId, async (tx) => {
		const [family] = await tx
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
	});
}

export async function familyMembersForOrganization(
	familyGroupId: string,
	organizationId: string,
) {
	return withTenantCtx(organizationId, async (tx) =>
		tx
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
			),
	);
}

export async function getFamilyHistoryRecords(
	familyGroupId: string,
	organizationId: string,
) {
	return withTenantCtx(organizationId, async (tx) => {
		const [family] = await tx
			.select()
			.from(familyGroups)
			.where(
				and(
					eq(familyGroups.id, familyGroupId),
					eq(familyGroups.organizationId, organizationId),
				),
			)
			.limit(1);
		if (!family) return null;

		const members = await tx
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

		const memberMap = new Map<string, string>();
		const memberIds: string[] = [];

		for (const m of members) {
			memberMap.set(m.id, m.fullName || "Член семьи");
			memberIds.push(m.id);
		}
		if (family.headPatientId && !memberMap.has(family.headPatientId)) {
			memberIds.push(family.headPatientId);
			const [headPat] = await tx
				.select({ id: patients.id, fullName: patients.fullName })
				.from(patients)
				.where(and(eq(patients.id, family.headPatientId), eq(patients.organizationId, organizationId)))
				.limit(1);
			if (headPat) {
				memberMap.set(headPat.id, headPat.fullName || "Глава семьи");
			}
		}
		if (memberIds.length === 0) return [];

		const paymentRows = await tx
			.select()
			.from(payments)
			.where(
				and(
					eq(payments.organizationId, organizationId),
					or(
						// Реляционная привязка пополнений и возвратов к семейной группе через documentId
						eq(payments.documentId, familyGroupId),
						// Операции списания со счета семьи членами семейной группы
						and(
							inArray(payments.patientId, memberIds),
							eq(payments.method, "family_wallet"),
						),
					),
				),
			)
			.orderBy(desc(payments.createdAt))
			.limit(100);

		return paymentRows.map((p) => {
			const signedAmtKop =
				p.amountKopecks !== null && p.amountKopecks !== undefined && p.amountKopecks !== 0n
					? Number(p.amountKopecks)
					: parseKopecks(p.amountRub);
			const isRefund = p.status === "refunded" || signedAmtKop < 0;
			const isSpend = p.method === "family_wallet";
			const isTopup = !isRefund && !isSpend && p.status === "paid";
			const operationType: "topup" | "spend" | "refund" = isRefund ? "refund" : isSpend ? "spend" : "topup";
			const patientName = memberMap.get(p.patientId) || p.payerFullName || "Член семьи";
			const headName = (family.headPatientId && memberMap.get(family.headPatientId)) || "Семейный счёт";

			const amountKop = Math.abs(signedAmtKop);
			return {
				id: p.id,
				date: p.createdAt ? p.createdAt.toISOString() : new Date().toISOString(),
				operationType,
				amountRub: kopecksToRub(amountKop),
				amountKopecks: amountKop,
				payerPatientId: isTopup ? p.patientId : family.headPatientId || p.patientId,
				payerName: isTopup ? patientName : headName,
				targetPatientId: p.patientId,
				targetName: patientName,
				method: p.method === "family_wallet" ? "pool" : p.method,
				note: p.note || (isRefund ? "Возврат средств с семейного депозита" : isTopup ? "Пополнение семейного счёта" : "Оплата стоматологических услуг"),
			};
		});
	});
}
