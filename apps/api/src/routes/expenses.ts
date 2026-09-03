/**
 * DENTE Dental CRM — Clinic Operating Expenses & P&L API Routes.
 * Implements granular operating cost management and monthly P&L calculations
 * backed by PostgreSQL tables cash_operations and cash_expense_reasons.
 */

import {
	calculateMonthlyExpensesSummary,
	calculateNetProfitAndMargin,
	expenseCategorySchema,
	expensePaymentMethodSchema,
	expensePeriodicitySchema,
	type ExpenseCategory,
	type ExpenseRecord,
	kopecksToRubles,
	rublesToKopecks,
} from "@dental/shared";
import { and, desc, eq, sql } from "drizzle-orm";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireResolvedStaffOrAdminOrganizationId } from "../accessGuard.js";
import { withTenantCtx } from "../db/rls.js";
import {
	cashBoxes,
	cashExpenseReasons,
	cashOperations,
} from "../db/schema.js";
import {
	ensureOrganizationCashBoxes,
	ensureOrganizationExpenseReasons,
} from "../db/seeds/seed_cash_and_reasons.js";

const createExpenseBodySchema = z.object({
	organizationId: z.string().uuid().optional(),
	clinicId: z.string().uuid().optional().nullable(),
	category: expenseCategorySchema,
	amountKopecks: z.number().int().positive(),
	expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	description: z.string().max(2000).optional().nullable(),
	vendorName: z.string().max(255).optional().nullable(),
	periodicity: expensePeriodicitySchema.default("one_time"),
	paymentMethod: expensePaymentMethodSchema.default("cashless_invoice"),
	receiptUrl: z.string().url().optional().nullable(),
	createdBy: z.string().uuid().optional().nullable(),
});

const listExpensesQuerySchema = z.object({
	organizationId: z.string().optional(),
	startDate: z.string().optional(),
	endDate: z.string().optional(),
	category: expenseCategorySchema.optional(),
});

const summaryQuerySchema = z.object({
	organizationId: z.string().optional(),
	month: z.string().optional(), // YYYY-MM
	revenueRub: z.coerce.number().min(0).default(0),
});

function mapCategoryToReasonCode(category: ExpenseCategory): number {
	switch (category) {
		case "salaries": return 1;
		case "taxes_fees": return 2;
		case "supplies": return 4;
		case "marketing": return 6;
		case "utilities": return 10;
		case "lab_costs": return 11;
		case "rent": return 100;
		default: return 8; // подотчет / прочие
	}
}

function mapReasonCodeToCategory(code?: number | null): ExpenseCategory {
	switch (code) {
		case 1: return "salaries";
		case 2: return "taxes_fees";
		case 3:
		case 4:
		case 5: return "supplies";
		case 6: return "marketing";
		case 7:
		case 10: return "utilities";
		case 11: return "lab_costs";
		case 100: return "rent";
		default: return "other";
	}
}

interface ExpenseMetadata {
	category?: ExpenseCategory | undefined;
	clinicId?: string | null | undefined;
	vendorName?: string | null | undefined;
	periodicity?: "one_time" | "monthly" | "annual" | undefined;
	paymentMethod?: "cashless_invoice" | "cash_register" | "corporate_card" | "cash" | "card" | "bank_transfer" | undefined;
	receiptUrl?: string | null | undefined;
	expenseDate?: string | undefined;
	createdBy?: string | null | undefined;
}

function rowToExpenseRecord(row: typeof cashOperations.$inferSelect): ExpenseRecord {
	const meta = (row.metadata as ExpenseMetadata | null) || {};
	const dateStr = meta.expenseDate || (row.createdAt ? row.createdAt.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
	const category = meta.category || mapReasonCodeToCategory(row.reasonCode);
	const createdIso = row.createdAt ? row.createdAt.toISOString() : new Date().toISOString();

	return {
		id: row.id,
		organizationId: row.organizationId,
		clinicId: meta.clinicId ?? null,
		category,
		amountKopecks: rublesToKopecks(row.amountRub),
		expenseDate: dateStr,
		description: row.reasonText,
		vendorName: meta.vendorName ?? null,
		periodicity: meta.periodicity ?? "one_time",
		paymentMethod: meta.paymentMethod ?? "cashless_invoice",
		receiptUrl: meta.receiptUrl ?? row.kkmReceiptUrl ?? null,
		createdBy: row.operatorId ?? meta.createdBy ?? null,
		createdAt: createdIso,
		updatedAt: createdIso,
	};
}

export const registerExpensesRoutes: FastifyPluginAsync = async (server) => {
	// 1. GET /api/v1/expenses & /api/expenses
	const handleListExpenses = async (request: FastifyRequest, reply: FastifyReply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"expenses list",
		);
		if (!organizationId) return;

		const parsed = listExpensesQuerySchema.safeParse(request.query);
		if (!parsed.success) {
			reply.status(400);
			return { error: "InvalidQuery", message: "Некорректные параметры фильтрации расходов." };
		}

		const { startDate, endDate, category } = parsed.data;

		const records = await withTenantCtx(organizationId, async (tx) => {
			const conditions = [
				eq(cashOperations.organizationId, organizationId),
				eq(cashOperations.operationType, "expense"),
			];

			if (startDate) {
				conditions.push(sql`${cashOperations.createdAt} >= ${startDate}`);
			}
			if (endDate) {
				conditions.push(sql`${cashOperations.createdAt} <= ${endDate}T23:59:59.999Z`);
			}

			const rows = await tx
				.select()
				.from(cashOperations)
				.where(and(...conditions))
				.orderBy(desc(cashOperations.createdAt));

			return rows.map(rowToExpenseRecord);
		});

		let filtered = records;
		if (category) {
			filtered = filtered.filter((e) => e.category === category);
		}

		return { data: filtered, total: filtered.length };
	};

	server.get("/api/v1/expenses", handleListExpenses);
	server.get("/api/expenses", handleListExpenses);

	// 2. POST /api/v1/expenses & /api/expenses
	const handleCreateExpense = async (request: FastifyRequest, reply: FastifyReply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"expenses create",
		);
		if (!organizationId) return;

		const parsed = createExpenseBodySchema.safeParse(request.body);
		if (!parsed.success) {
			request.log.error({ issues: parsed.error.issues, body: request.body }, "Expense validation failed");
			reply.status(400);
			return {
				error: "ValidationError",
				message: "Некорректные данные для создания расхода.",
				details: parsed.error.issues,
			};
		}

		const data = parsed.data;
		const amountRub = kopecksToRubles(data.amountKopecks);
		const reasonCode = mapCategoryToReasonCode(data.category);

		const newRecord = await withTenantCtx(organizationId, async (tx) => {
			await ensureOrganizationCashBoxes(tx, organizationId);
			await ensureOrganizationExpenseReasons(tx, organizationId);

			// Находим статью расхода
			const [reason] = await tx
				.select()
				.from(cashExpenseReasons)
				.where(and(eq(cashExpenseReasons.organizationId, organizationId), eq(cashExpenseReasons.code, reasonCode)))
				.limit(1);

			// Определяем кассу (по способу оплаты: наличные -> main, иначе account/expenses)
			const targetType = data.paymentMethod === "cash" || data.paymentMethod === "cash_register" ? "main" : "account";
			let [targetBox] = await tx
				.select()
				.from(cashBoxes)
				.where(and(eq(cashBoxes.organizationId, organizationId), eq(cashBoxes.type, targetType)))
				.limit(1);

			if (!targetBox) {
				const [fallback] = await tx
					.select()
					.from(cashBoxes)
					.where(eq(cashBoxes.organizationId, organizationId))
					.limit(1);
				targetBox = fallback;
			}

			const balanceBefore = targetBox?.balanceRub ?? 0;
			const balanceAfter = kopecksToRubles(rublesToKopecks(balanceBefore) - rublesToKopecks(amountRub));

			if (targetBox) {
				await tx
					.update(cashBoxes)
					.set({
						balanceRub: balanceAfter,
						updatedAt: new Date(),
					})
					.where(eq(cashBoxes.id, targetBox.id));
			}

			const metadata: ExpenseMetadata = {
				category: data.category,
				clinicId: data.clinicId,
				vendorName: data.vendorName,
				periodicity: data.periodicity,
				paymentMethod: data.paymentMethod,
				receiptUrl: data.receiptUrl,
				expenseDate: data.expenseDate,
				createdBy: data.createdBy,
			};

			const [operation] = await tx
				.insert(cashOperations)
				.values({
					organizationId,
					cashBoxId: targetBox!.id,
					operationType: "expense",
					amountRub,
					balanceBeforeRub: balanceBefore,
					balanceAfterRub: balanceAfter,
					reasonId: reason?.id ?? null,
					reasonCode: reason?.code ?? reasonCode,
					reasonText: data.description ?? reason?.name ?? data.category,
					operatorId: data.createdBy ?? null,
					kkmReceiptUrl: data.receiptUrl ?? null,
					metadata,
				})
				.returning();

			return rowToExpenseRecord(operation!);
		});

		reply.status(201);
		return { success: true, data: newRecord };
	};

	server.post("/api/v1/expenses", handleCreateExpense);
	server.post("/api/expenses", handleCreateExpense);

	// 3. GET /api/v1/expenses/summary & /api/expenses/summary
	const handleExpensesSummary = async (request: FastifyRequest, reply: FastifyReply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"expenses summary",
		);
		if (!organizationId) return;

		const parsed = summaryQuerySchema.safeParse(request.query);
		if (!parsed.success) {
			reply.status(400);
			return { error: "InvalidQuery", message: "Некорректные параметры отчёта." };
		}

		const { month, revenueRub } = parsed.data;

		const records = await withTenantCtx(organizationId, async (tx) => {
			const rows = await tx
				.select()
				.from(cashOperations)
				.where(
					and(
						eq(cashOperations.organizationId, organizationId),
						eq(cashOperations.operationType, "expense"),
					),
				)
				.orderBy(desc(cashOperations.createdAt));

			return rows.map(rowToExpenseRecord);
		});

		let filtered = records;
		if (month) {
			filtered = filtered.filter((e) => e.expenseDate.startsWith(month));
		}

		const summary = calculateMonthlyExpensesSummary(filtered);
		const profit = calculateNetProfitAndMargin(revenueRub, summary.totalExpensesRub);

		return {
			data: {
				summary,
				profit,
			},
		};
	};

	server.get("/api/v1/expenses/summary", handleExpensesSummary);
	server.get("/api/expenses/summary", handleExpensesSummary);

	// 4. DELETE /api/v1/expenses/:id & /api/expenses/:id
	const handleDeleteExpense = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"expenses delete",
		);
		if (!organizationId) return;

		const { id } = request.params;

		const deleted = await withTenantCtx(organizationId, async (tx) => {
			const [op] = await tx
				.select()
				.from(cashOperations)
				.where(
					and(
						eq(cashOperations.id, id),
						eq(cashOperations.organizationId, organizationId),
						eq(cashOperations.operationType, "expense"),
					),
				)
				.limit(1);

			if (!op) return false;

			// Возвращаем средства обратно на кассовый счет
			const [box] = await tx
				.select()
				.from(cashBoxes)
				.where(eq(cashBoxes.id, op.cashBoxId))
				.limit(1);

			if (box) {
				const restoredBalance = kopecksToRubles(rublesToKopecks(box.balanceRub) + rublesToKopecks(op.amountRub));
				await tx
					.update(cashBoxes)
					.set({
						balanceRub: restoredBalance,
						updatedAt: new Date(),
					})
					.where(eq(cashBoxes.id, box.id));
			}

			await tx
				.delete(cashOperations)
				.where(eq(cashOperations.id, id));

			return true;
		});

		if (!deleted) {
			reply.status(404);
			return { error: "NotFound", message: "Расходная операция не найдена." };
		}

		return { success: true };
	};

	server.delete("/api/v1/expenses/:id", handleDeleteExpense);
	server.delete("/api/expenses/:id", handleDeleteExpense);
};
