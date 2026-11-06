import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { installmentContracts, patients, payments, treatmentPlans, users } from "../../db/schema.js";
import { calculateCuratorMetrics } from "@dental/shared";
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
		.innerJoin(patients, eq(treatmentPlans.patientId, patients.id))
		.where(eq(treatmentPlans.organizationId, orgId));

	// PLN-05 [SEV-1]: Учет оплат строго по planId / treatmentPlanId, ликвидация заражения планов старыми оплатами пациента.
	// 1. Прямые оплаты, привязанные к плану лечения (documentId = treatment_plans.id)
	const directPlanPayments = await db
		.select({
			planId: payments.documentId,
			totalPaid: sql<number>`coalesce(sum(${payments.amountRub}), 0)`,
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
			totalPaid: sql<number>`coalesce(sum(${installmentContracts.paidAmountRub}), 0)`,
		})
		.from(installmentContracts)
		.where(
			and(
				eq(installmentContracts.organizationId, orgId),
				sql`${installmentContracts.treatmentPlanId} is not null`,
			),
		)
		.groupBy(installmentContracts.treatmentPlanId);

	const planPaymentMap = new Map<string, number>();
	for (const p of directPlanPayments) {
		if (p.planId) {
			planPaymentMap.set(p.planId, (planPaymentMap.get(p.planId) || 0) + Number(p.totalPaid));
		}
	}
	for (const p of installmentPlanPayments) {
		if (p.planId) {
			planPaymentMap.set(p.planId, (planPaymentMap.get(p.planId) || 0) + Number(p.totalPaid));
		}
	}

	const doctorMap = new Map(staffList.map((u) => [u.id, u.fullName]));
	const defaultCurator: CuratorStaffUser = curatorUsers[0] || {
		id: "00000000-0000-0000-0000-000000000001",
		fullName: "Куратор клиники",
		role: "curator",
	};

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
