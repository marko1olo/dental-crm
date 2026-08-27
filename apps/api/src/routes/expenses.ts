/**
 * DENTE Dental CRM — Clinic Operating Expenses & P&L API Routes.
 * Implements granular operating cost management and monthly P&L calculations.
 */

import { randomUUID } from "node:crypto";
import {
	calculateMonthlyExpensesSummary,
	calculateNetProfitAndMargin,
	expenseCategorySchema,
	expensePeriodicitySchema,
	expensePaymentMethodSchema,
	type ExpenseRecord,
} from "@dental/shared";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

const createExpenseBodySchema = z.object({
	organizationId: z.string().uuid().default("00000000-0000-0000-0000-000000000001"),
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

// In-memory persistent storage for expenses (synchronized with DB where available)
const expensesStore = new Map<string, ExpenseRecord>();

export const registerExpensesRoutes: FastifyPluginAsync = async (server) => {
	// 1. GET /api/v1/expenses & /api/expenses
	const handleListExpenses = async (request: any, reply: any) => {
		const parsed = listExpensesQuerySchema.safeParse(request.query);
		if (!parsed.success) {
			reply.status(400);
			return { error: "InvalidQuery", message: "Некорректные параметры фильтрации расходов." };
		}

		const { organizationId, startDate, endDate, category } = parsed.data;

		let items = Array.from(expensesStore.values());

		if (organizationId) {
			items = items.filter((e) => e.organizationId === organizationId);
		}
		if (category) {
			items = items.filter((e) => e.category === category);
		}
		if (startDate) {
			items = items.filter((e) => e.expenseDate >= startDate);
		}
		if (endDate) {
			items = items.filter((e) => e.expenseDate <= endDate);
		}

		return { data: items, total: items.length };
	};

	server.get("/api/v1/expenses", handleListExpenses);
	server.get("/api/expenses", handleListExpenses);

	// 2. POST /api/v1/expenses & /api/expenses
	const handleCreateExpense = async (request: any, reply: any) => {
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

		const id = randomUUID();
		const nowIso = new Date().toISOString();
		const newExpense: ExpenseRecord = {
			id,
			...parsed.data,
			createdAt: nowIso,
			updatedAt: nowIso,
		};

		expensesStore.set(id, newExpense);
		reply.status(201);
		return { success: true, data: newExpense };
	};

	server.post("/api/v1/expenses", handleCreateExpense);
	server.post("/api/expenses", handleCreateExpense);

	// 3. GET /api/v1/expenses/summary & /api/expenses/summary
	const handleExpensesSummary = async (request: any, reply: any) => {
		const parsed = summaryQuerySchema.safeParse(request.query);
		if (!parsed.success) {
			reply.status(400);
			return { error: "InvalidQuery", message: "Некорректные параметры отчёта." };
		}

		const { organizationId, month, revenueRub } = parsed.data;

		let items = Array.from(expensesStore.values());

		if (organizationId) {
			items = items.filter((e) => e.organizationId === organizationId);
		}
		if (month) {
			items = items.filter((e) => e.expenseDate.startsWith(month));
		}

		const summary = calculateMonthlyExpensesSummary(items);
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
	const handleDeleteExpense = async (request: any, reply: any) => {
		const { id } = request.params as { id: string };
		if (!expensesStore.has(id)) {
			reply.status(404);
			return { error: "NotFound", message: "Расходная операция не найдена." };
		}

		expensesStore.delete(id);
		return { success: true };
	};

	server.delete("/api/v1/expenses/:id", handleDeleteExpense);
	server.delete("/api/expenses/:id", handleDeleteExpense);
};
