import { and, eq, inArray, sql } from "drizzle-orm";
import { withTenantCtx } from "../../db/rls.js";
import {
	paymentSignedExactFlowKopecksSql,
	paymentSignedLegacyFlowRubSql,
} from "../../db/paymentRefundSql.js";
import { installmentContracts, patients, payments, treatmentPlans, users } from "../../db/schema.js";
import { calculateCuratorMetrics, kopecksToRubles, rublesToKopecks } from "@dental/shared";
import { buildCuratorQueueItem } from "./curatorQueueBuilder.js";
import type { CuratorStaffUser } from "./curatorTypes.js";

export async function fetchCuratorAnalyticsPayload(orgId: string) {
	const { staffList, plans, directPlanPayments, installmentPlanPayments } = await withTenantCtx(
		orgId,
		async (tx) => {
			const staffRows = await tx
				.select({ id: users.id, fullName: users.fullName, role: users.role })
				.from(users)
				.where(eq(users.organizationId, orgId));

			const planRows = await tx
				.select({
					id: treatmentPlans.id,
					name: treatmentPlans.name,
					status: treatmentPlans.status,
					alternativeTier: treatmentPlans.alternativeTier,
					totalPriceKopecks: treatmentPlans.totalPriceKopecks,
					planDiscountKopecks: treatmentPlans.planDiscountKopecks,
					totalPriceRub: treatmentPlans.totalPriceRub,
					totalPrice: treatmentPlans.totalPrice,
					createdAt: treatmentPlans.createdAt,
					patientId: treatmentPlans.patientId,
					doctorId: treatmentPlans.doctorId,
					patientFullName: patients.fullName,
					patientPhone: patients.phone,
					patientEmail: patients.email,
					patientAdminProfile: patients.administrativeProfile,
				})
				.from(treatmentPlans)
				.innerJoin(patients, and(eq(treatmentPlans.patientId, patients.id), eq(patients.organizationId, orgId)))
				.where(eq(treatmentPlans.organizationId, orgId));

			// PLN-05 [SEV-1]: Учет оплат строго по planId / treatmentPlanId, ликвидация заражения планов старыми оплатами пациента.
			// 1. Прямые оплаты, привязанные к плану лечения (documentId = treatment_plans.id)
			const directRows = await tx
				.select({
					planId: payments.documentId,
					exactNetKopecks: sql<number>`coalesce(sum(${paymentSignedExactFlowKopecksSql()}), 0)::bigint`,
					legacyNetRub: sql<number>`coalesce(sum(${paymentSignedLegacyFlowRubSql()}), 0)`,
				})
				.from(payments)
				.where(
					and(
						eq(payments.organizationId, orgId),
						inArray(payments.status, ["paid", "refunded"]),
						sql`${payments.documentId} is not null`,
					),
				)
				.groupBy(payments.documentId);

			// 2. Оплаты по договорам рассрочки данного плана лечения
			const installmentRows = await tx
				.select({
					planId: installmentContracts.treatmentPlanId,
					exactPaidKopecks: sql<number>`coalesce(sum(case when ${installmentContracts.paidAmountKopecks} is not null and ${installmentContracts.paidAmountKopecks} <> 0 then ${installmentContracts.paidAmountKopecks} else 0 end), 0)::bigint`,
					legacyPaidRub: sql<number>`coalesce(sum(case when (${installmentContracts.paidAmountKopecks} is null or ${installmentContracts.paidAmountKopecks} = 0) then coalesce(${installmentContracts.paidAmountRub}, 0) else 0 end), 0)`,
				})
				.from(installmentContracts)
				.where(
					and(
						eq(installmentContracts.organizationId, orgId),
						sql`${installmentContracts.treatmentPlanId} is not null`,
					),
				)
				.groupBy(installmentContracts.treatmentPlanId);

			return {
				staffList: staffRows,
				plans: planRows,
				directPlanPayments: directRows,
				installmentPlanPayments: installmentRows,
			};
		},
	);

	const curatorUsers: CuratorStaffUser[] = staffList
		.filter((u) => ["curator", "administrator", "manager", "admin", "owner"].includes(u.role))
		.map((u) => ({ id: u.id, fullName: u.fullName, role: u.role }));

	const planPaymentKopecksMap = new Map<string, number>();
	for (const p of directPlanPayments) {
		if (p.planId) {
			const kop = Number(p.exactNetKopecks || 0) + rublesToKopecks(Number(p.legacyNetRub || 0));
			planPaymentKopecksMap.set(p.planId, Math.max(0, (planPaymentKopecksMap.get(p.planId) || 0) + kop));
		}
	}
	for (const p of installmentPlanPayments) {
		if (p.planId) {
			const kop = Number(p.exactPaidKopecks || 0) + rublesToKopecks(Number(p.legacyPaidRub || 0));
			planPaymentKopecksMap.set(p.planId, (planPaymentKopecksMap.get(p.planId) || 0) + kop);
		}
	}

	const planPaymentMap = new Map<string, number>();
	for (const [planId, kop] of planPaymentKopecksMap) {
		planPaymentMap.set(planId, kopecksToRubles(kop));
	}

	const doctorMap = new Map(staffList.map((u) => [u.id, u.fullName]));
	const defaultCurator: CuratorStaffUser | null = curatorUsers[0] ?? null;

	const queueItems = plans.map((plan) =>
		buildCuratorQueueItem(plan, planPaymentMap, doctorMap, defaultCurator, planPaymentKopecksMap),
	);
	const overallMetrics = calculateCuratorMetrics(queueItems, "all", "Все кураторы");
	const perCuratorMetrics = curatorUsers.map((cur) =>
		calculateCuratorMetrics(queueItems, cur.id, cur.fullName),
	);

	return {
		curators: curatorUsers,
		overallMetrics,
		perCuratorMetrics,
		queue: queueItems,
	};
}
