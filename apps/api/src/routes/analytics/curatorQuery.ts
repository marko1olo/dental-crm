import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { installmentContracts, patients, payments, treatmentPlans, users } from "../../db/schema.js";
import { calculateCuratorMetrics, kopecksToRubles } from "@dental/shared";
import { buildCuratorQueueItem } from "./curatorQueueBuilder.js";
import type { CuratorStaffUser } from "./curatorTypes.js";

export async function fetchCuratorAnalyticsPayload(orgId: string) {
	const staffList = await db
		.select({ id: users.id, fullName: users.fullName, role: users.role })
		.from(users)
		.where(eq(users.organizationId, orgId));

	const curatorUsers: CuratorStaffUser[] = staffList
		.filter((u) => ["curator", "administrator", "manager", "admin", "owner"].includes(u.role))
		.map((u) => ({ id: u.id, fullName: u.fullName, role: u.role }));

	const plans = await db
		.select({
			id: treatmentPlans.id,
			name: treatmentPlans.name,
			status: treatmentPlans.status,
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
	const directPlanPayments = await db
		.select({
			planId: payments.documentId,
			totalPaidKopecks: sql<number>`coalesce(sum(coalesce(nullif(${payments.amountKopecks}, 0), round(coalesce(${payments.amountRub}, 0) * 100)::bigint, 0)), 0)::bigint`,
		})
		.from(payments)
		.where(
			and(
				eq(payments.organizationId, orgId),
				eq(payments.status, "paid"),
				sql`${payments.documentId} is not null`,
			),
		)
		.groupBy(payments.documentId);

	// 2. Оплаты по договорам рассрочки данного плана лечения
	const installmentPlanPayments = await db
		.select({
			planId: installmentContracts.treatmentPlanId,
			totalPaidKopecks: sql<number>`coalesce(sum(coalesce(nullif(${installmentContracts.paidAmountKopecks}, 0), round(coalesce(${installmentContracts.paidAmountRub}, 0) * 100)::bigint, 0)), 0)::bigint`,
		})
		.from(installmentContracts)
		.where(
			and(
				eq(installmentContracts.organizationId, orgId),
				sql`${installmentContracts.treatmentPlanId} is not null`,
			),
		)
		.groupBy(installmentContracts.treatmentPlanId);

	const planPaymentKopecksMap = new Map<string, number>();
	for (const p of directPlanPayments) {
		if (p.planId) {
			planPaymentKopecksMap.set(p.planId, (planPaymentKopecksMap.get(p.planId) || 0) + Number(p.totalPaidKopecks));
		}
	}
	for (const p of installmentPlanPayments) {
		if (p.planId) {
			planPaymentKopecksMap.set(p.planId, (planPaymentKopecksMap.get(p.planId) || 0) + Number(p.totalPaidKopecks));
		}
	}

	const planPaymentMap = new Map<string, number>();
	for (const [planId, kop] of planPaymentKopecksMap) {
		planPaymentMap.set(planId, kopecksToRubles(kop));
	}

	const doctorMap = new Map(staffList.map((u) => [u.id, u.fullName]));
	const defaultCurator: CuratorStaffUser | null = curatorUsers[0] ?? null;

	const queueItems = plans.map((plan) =>
		buildCuratorQueueItem(plan, planPaymentMap, doctorMap, defaultCurator),
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
