import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { patients, payments, treatmentPlans, users } from "../../db/schema.js";
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

	const patientPayments = await db
		.select({
			patientId: payments.patientId,
			totalPaid: sql<number>`coalesce(sum(${payments.amountRub}), 0)`,
		})
		.from(payments)
		.where(and(eq(payments.organizationId, orgId), eq(payments.status, "paid")))
		.groupBy(payments.patientId);

	const paymentMap = new Map(patientPayments.map((p) => [p.patientId, Number(p.totalPaid)]));
	const doctorMap = new Map(staffList.map((u) => [u.id, u.fullName]));
	const defaultCurator: CuratorStaffUser = curatorUsers[0] || {
		id: "00000000-0000-0000-0000-000000000001",
		fullName: "Куратор клиники",
		role: "curator",
	};

	const queueItems = plans.map((plan) =>
		buildCuratorQueueItem(plan, paymentMap, doctorMap, defaultCurator),
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
