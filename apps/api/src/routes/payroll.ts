import { eq, and } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { requireResolvedOrganizationId, requireResolvedStaffOrAdminOrganizationId } from "../accessGuard.js";
import { db } from "../db/client.js";
import {
	doctorCommissions,
	inventoryTransactions,
	patientInvoices,
	users,
	visits,
	visitDiaries,
} from "../db/schema.js";

export const payrollRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
	// GET my payroll (logged-in doctor)
	server.get<{ Params: { organizationId: string } }>("/:organizationId/my", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(request, reply, "payroll read");
		if (!orgId) return;

		const userContext = (request as any).user;
		const userId = userContext?.id;
		if (!userId) {
			return reply.code(401).send({ error: "Unauthorized" });
		}

		return await computePayrollForDoctor(orgId, userId);
	});

	// GET all doctors payroll (admin only)
	server.get<{ Params: { organizationId: string } }>("/:organizationId/all", async (request, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(request, reply, "payroll read all");
		if (!orgId) return;

		// Fetch all doctors in the organization who have completed visits
		const allVisits = await db
			.select({ doctorId: visitDiaries.doctorId })
			.from(visits)
			.innerJoin(visitDiaries, eq(visits.id, visitDiaries.visitId))
			.where(and(eq(visits.organizationId, orgId), eq(visits.status, "signed")));

		const uniqueDoctorIds = Array.from(new Set(allVisits.map((v) => v.doctorId).filter(Boolean))) as string[];

		const results: any[] = [];
		for (const docId of uniqueDoctorIds) {
			const data = await computePayrollForDoctor(orgId, docId);
			results.push(data);
		}

		return results;
	});
};

async function computePayrollForDoctor(orgId: string, doctorId: string) {
	// Fetch doctor profile
	const [doctorUser] = await db
		.select({ name: users.fullName, id: users.id })
		.from(users)
		.where(eq(users.id, doctorId));

	if (!doctorUser) {
		throw new Error("Doctor not found");
	}

	// Fetch doctor commissions configurations
	const commissions = await db
		.select()
		.from(doctorCommissions)
		.where(
			and(
				eq(doctorCommissions.organizationId, orgId),
				eq(doctorCommissions.userId, doctorId),
				eq(doctorCommissions.isActive, true)
			)
		);

	// Default fallback values if no specific commission is set
	const defaultCommissionPct = commissions.length > 0 ? (commissions[0]?.commissionPct ?? 30) : 30;
	const defaultMaterialDeductionPct = commissions.length > 0 ? (commissions[0]?.materialCostDeductionPct ?? 100) : 100;

	// Fetch paid invoices for this doctor's visits
	const paidInvoicesResult = await db
		.select({
			visitId: patientInvoices.visitId,
			totalAmountRub: patientInvoices.totalAmountRub,
			itemsJson: patientInvoices.itemsJson,
		})
		.from(patientInvoices)
		.innerJoin(visits, eq(patientInvoices.visitId, visits.id))
		.innerJoin(visitDiaries, eq(visits.id, visitDiaries.visitId))
		.where(
			and(
				eq(patientInvoices.organizationId, orgId),
				eq(patientInvoices.status, "paid"),
				eq(visitDiaries.doctorId, doctorId)
			)
		);

	let totalRevenue = 0;
	let totalMaterialCosts = 0;
	let totalSalary = 0;
	
	const visitDetails: any[] = [];

	for (const inv of paidInvoicesResult) {
		if (!inv.visitId) continue;

		// Get treatment items from invoice to calculate exact revenue
		let items: any[] = [];
		try {
			items = typeof inv.itemsJson === 'string' ? JSON.parse(inv.itemsJson) : inv.itemsJson;
		} catch (e) {
			items = [];
		}

		let visitRevenue = 0;
		if (Array.isArray(items)) {
			for (const item of items) {
				visitRevenue += Number(item.priceRub || 0) * Number(item.quantity || 1);
			}
		}
		
		// Get material costs from inventoryTransactions for this visit
		const invTx = await db
			.select({
				qty: inventoryTransactions.quantityChanged,
				cost: inventoryTransactions.unitCostRub,
			})
			.from(inventoryTransactions)
			.where(
				and(
					eq(inventoryTransactions.organizationId, orgId),
					eq(inventoryTransactions.visitId, inv.visitId),
					eq(inventoryTransactions.transactionType, "deduction")
				)
			);

		let visitMaterialCost = 0;
		for (const tx of invTx) {
			// qty is usually negative for deduction
			const qty = Math.abs(Number(tx.qty));
			const cost = Number(tx.cost);
			visitMaterialCost += qty * cost;
		}

		// Apply commission
		// Simplified for now: applying default commission across the board.
		// A full implementation would map each treatment item to a serviceCategory and look up specific commissionPct.
		const doctorShare = visitRevenue * (defaultCommissionPct / 100);
		const materialDeduction = visitMaterialCost * (defaultMaterialDeductionPct / 100);
		const netSalary = Math.max(0, doctorShare - materialDeduction);

		totalRevenue += visitRevenue;
		totalMaterialCosts += visitMaterialCost;
		totalSalary += netSalary;

		visitDetails.push({
			visitId: inv.visitId,
			revenueRub: visitRevenue,
			materialCostRub: visitMaterialCost,
			salaryRub: netSalary,
		});
	}

	return {
		doctorId,
		doctorName: doctorUser.name,
		commissionPct: defaultCommissionPct,
		materialDeductionPct: defaultMaterialDeductionPct,
		totalRevenue,
		totalMaterialCosts,
		totalSalary,
		visits: visitDetails,
	};
}
