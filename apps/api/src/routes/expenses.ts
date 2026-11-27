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
	kopecksToRub,
	kopecksToRubles,
	rubToKopecks,
	rublesToKopecks,
} from "@dental/shared";
import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { defineTenantMutation, defineTenantQuery } from "../core/routeFactories.js";
import { recordAuditEventInDb } from "../db/auditQuery.js";
import {
	cashBoxes,
	cashBoxShifts,
	cashExpenseReasons,
	cashOperations,
	payments,
	users,
} from "../db/schema.js";
import {
	ensureOrganizationCashBoxes,
	ensureOrganizationExpenseReasons,
} from "../db/seeds/seed_cash_and_reasons.js";
import {
	formatDateIsoInTimeZone,
	resolveClinicTimeZone,
} from "./payrollModules/payrollTypesAndQueries.js";
import { ADMIN_ROLES } from "../security/identity.js";

function resolveSafeKop(
	kopecksVal: number | bigint | null | undefined,
	rubVal: number | string | null | undefined,
): number {
	const kop = kopecksVal != null ? Number(kopecksVal) : 0;
	const rubKop = rubToKopecks(Number(rubVal || 0));
	return kop !== 0 || rubKop === 0 ? kop : rubKop;
}

const createExpenseBodySchema = z
	.object({
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
	})
	.strict();

const listExpensesQuerySchema = z
	.object({
		organizationId: z.string().optional(),
		startDate: z.string().optional(),
		endDate: z.string().optional(),
		category: expenseCategorySchema.optional(),
	})
	.strict();

const summaryQuerySchema = z
	.object({
		organizationId: z.string().optional(),
		month: z.string().optional(), // YYYY-MM
		revenueKopecks: z.coerce.number().int().min(0).optional(),
		revenueRub: z.coerce.number().min(0).optional(),
	})
	.strict();

function mapCategoryToReasonCode(category: ExpenseCategory): number {
	switch (category) {
		case "salaries": return 1;
		case "taxes_fees": return 2;
		case "supplies": return 4;
		case "marketing": return 6;
		case "utilities": return 10;
		case "lab_costs": return 11;
		case "rent": return 100;
		case "equipment_lease": return 5;
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

function rowToExpenseRecord(
	row: typeof cashOperations.$inferSelect,
	clinicTimeZone: string,
): ExpenseRecord {
	const meta = (row.metadata as ExpenseMetadata | null) || {};
	const dateStr =
		meta.expenseDate ||
		formatDateIsoInTimeZone(row.createdAt ?? new Date(), clinicTimeZone);
	const category = meta.category || mapReasonCodeToCategory(row.reasonCode);
	const createdIso = row.createdAt ? row.createdAt.toISOString() : new Date().toISOString();

	return {
		id: row.id,
		organizationId: row.organizationId,
		clinicId: meta.clinicId ?? null,
		category,
		amountKopecks: row.amountKopecks != null ? Number(row.amountKopecks) : rublesToKopecks(row.amountRub),
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

const EXPENSE_AUTH_OPTIONS = {
	requireStaffToken: true,
	allowAdminSecretBypass: true,
} as const;

export const registerExpensesRoutes: FastifyPluginAsync = async (server) => {
	// 1. GET /api/v1/expenses & /api/expenses
	const registerListExpenses = (path: string) => {
		defineTenantQuery(server, {
			path,
			permission: "finance.read",
			authOptions: EXPENSE_AUTH_OPTIONS,
			query: async ({ tx, principal, request, reply }) => {
				const organizationId = principal.organizationId;
				const parsed = listExpensesQuerySchema.safeParse(request.query);
				if (!parsed.success) {
					return reply.status(400).send({
						error: "InvalidQuery",
						message: "Некорректные параметры фильтрации расходов.",
					});
				}

				const { startDate, endDate, category } = parsed.data;
				const clinicTz = await resolveClinicTimeZone(tx, organizationId);

				const conditions = [
					eq(cashOperations.organizationId, organizationId),
					eq(cashOperations.operationType, "expense"),
				];

				if (startDate) {
					conditions.push(
						sql`COALESCE(${cashOperations.metadata}->>'expenseDate', to_char(${cashOperations.createdAt} AT TIME ZONE ${clinicTz}, 'YYYY-MM-DD')) >= ${startDate}`,
					);
				}
				if (endDate) {
					conditions.push(
						sql`COALESCE(${cashOperations.metadata}->>'expenseDate', to_char(${cashOperations.createdAt} AT TIME ZONE ${clinicTz}, 'YYYY-MM-DD')) <= ${endDate}`,
					);
				}

				const rows = await tx
					.select()
					.from(cashOperations)
					.where(and(...conditions))
					.orderBy(desc(cashOperations.createdAt));

				let filtered = rows.map((r) => rowToExpenseRecord(r, clinicTz));
				if (category) {
					filtered = filtered.filter((e) => e.category === category);
				}

				return { data: filtered, total: filtered.length };
			},
		});
	};

	registerListExpenses("/api/v1/expenses");
	registerListExpenses("/api/expenses");

	// 2. POST /api/v1/expenses & /api/expenses
	const registerCreateExpense = (path: string) => {
		defineTenantMutation(server, {
			method: "POST",
			path,
			permission: "finance.write",
			authOptions: EXPENSE_AUTH_OPTIONS,
			idempotency: "optional_header",
			execute: async ({ tx, principal, request, reply }) => {
				const organizationId = principal.organizationId;
				const parsed = createExpenseBodySchema.safeParse(request.body);
				if (!parsed.success) {
					request.log.error({ issues: parsed.error.issues, body: request.body }, "Expense validation failed");
					return reply.status(400).send({
						error: "ValidationError",
						message: "Некорректные данные для создания расхода.",
						details: parsed.error.issues,
					});
				}

				const data = parsed.data;
				const amountRub = kopecksToRubles(data.amountKopecks);
				const reasonCode = mapCategoryToReasonCode(data.category);
				const clinicTz = await resolveClinicTimeZone(tx, organizationId);

				await ensureOrganizationCashBoxes(tx, organizationId);
				await ensureOrganizationExpenseReasons(tx, organizationId);

				const [reason] = await tx
					.select()
					.from(cashExpenseReasons)
					.where(and(eq(cashExpenseReasons.organizationId, organizationId), eq(cashExpenseReasons.code, reasonCode)))
					.limit(1);

				// Детерминированный порядок блокировок: cashBoxes -> cashBoxShifts (ORDER BY id ASC FOR UPDATE)
				const targetType = data.paymentMethod === "cash" || data.paymentMethod === "cash_register" ? "main" : "account";
				let [targetBox] = await tx
					.select()
					.from(cashBoxes)
					.where(and(eq(cashBoxes.organizationId, organizationId), eq(cashBoxes.type, targetType)))
					.orderBy(asc(cashBoxes.id))
					.for("update")
					.limit(1);

				if (!targetBox) {
					const [fallback] = await tx
						.select()
						.from(cashBoxes)
						.where(eq(cashBoxes.organizationId, organizationId))
						.orderBy(asc(cashBoxes.id))
						.for("update")
						.limit(1);
					targetBox = fallback;
				}

				if (!targetBox) {
					return reply.status(400).send({
						error: "NoCashBox",
						message: "Кассовые счета организации не найдены для списания расхода.",
					});
				}

				const balanceBeforeKop = resolveSafeKop(targetBox.balanceKopecks, targetBox.balanceRub);
				const balanceBefore = kopecksToRub(balanceBeforeKop);
				const expenseKop = data.amountKopecks;
				const balanceAfterKop = balanceBeforeKop - expenseKop;
				const balanceAfter = kopecksToRub(balanceAfterKop);

				const [activeShift] = await tx
					.select()
					.from(cashBoxShifts)
					.where(
						and(
							eq(cashBoxShifts.organizationId, organizationId),
							eq(cashBoxShifts.cashBoxId, targetBox.id),
							eq(cashBoxShifts.status, "open"),
						),
					)
					.orderBy(asc(cashBoxShifts.id))
					.for("update")
					.limit(1);

				await tx
					.update(cashBoxes)
					.set({
						balanceRub: balanceAfter,
						balanceKopecks: balanceAfterKop,
						updatedAt: new Date(),
					})
					.where(and(eq(cashBoxes.id, targetBox.id), eq(cashBoxes.organizationId, organizationId)));

				if (activeShift) {
					const prevExpenseKop = resolveSafeKop(
						activeShift.expenseTotalKopecks,
						activeShift.expenseTotalRub,
					);
					const nextExpenseKop = prevExpenseKop + expenseKop;
					await tx
						.update(cashBoxShifts)
						.set({
							expenseTotalRub: kopecksToRub(nextExpenseKop),
							expenseTotalKopecks: nextExpenseKop,
							updatedAt: new Date(),
						})
						.where(and(eq(cashBoxShifts.id, activeShift.id), eq(cashBoxShifts.organizationId, organizationId)));
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
						cashBoxId: targetBox.id,
						shiftId: activeShift?.id ?? null,
						operationType: "expense",
						amountRub,
						amountKopecks: expenseKop,
						balanceBeforeRub: balanceBefore,
						balanceBeforeKopecks: BigInt(balanceBeforeKop),
						balanceAfterRub: balanceAfter,
						balanceAfterKopecks: BigInt(balanceAfterKop),
						reasonId: reason?.id ?? null,
						reasonCode: reason?.code ?? reasonCode,
						reasonText: data.description ?? reason?.name ?? data.category,
						operatorId: data.createdBy ?? null,
						kkmReceiptUrl: data.receiptUrl ?? null,
						metadata,
					})
					.returning();

				if (!operation) {
					throw new Error("Не удалось записать расходную операцию в кассу.");
				}

				reply.status(201);
				return { success: true, data: rowToExpenseRecord(operation, clinicTz) };
			},
		});
	};

	registerCreateExpense("/api/v1/expenses");
	registerCreateExpense("/api/expenses");

	// 3. GET /api/v1/expenses/summary & /api/expenses/summary
	const registerExpensesSummary = (path: string) => {
		defineTenantQuery(server, {
			path,
			permission: "finance.read",
			authOptions: EXPENSE_AUTH_OPTIONS,
			query: async ({ tx, principal, request, reply }) => {
				const organizationId = principal.organizationId;
				const parsed = summaryQuerySchema.safeParse(request.query);
				if (!parsed.success) {
					return reply.status(400).send({
						error: "InvalidQuery",
						message: "Некорректные параметры отчёта.",
					});
				}

				const { month, revenueKopecks, revenueRub } = parsed.data;
				const requestedRevenueKop =
					revenueKopecks !== undefined && revenueKopecks > 0
						? revenueKopecks
						: revenueRub !== undefined && revenueRub > 0
							? rublesToKopecks(revenueRub)
							: 0;

				const [clinicTz, rows] = await Promise.all([
					resolveClinicTimeZone(tx, organizationId),
					tx
						.select()
						.from(cashOperations)
						.where(
							and(
								eq(cashOperations.organizationId, organizationId),
								eq(cashOperations.operationType, "expense"),
							),
						)
						.orderBy(desc(cashOperations.createdAt)),
				]);

				let monthRevenueKop = 0;
				if (requestedRevenueKop === 0 && month) {
					const [yearStr, monthStr] = month.split("-");
					const y = Number(yearStr);
					const m = Number(monthStr);
					if (Number.isFinite(y) && Number.isFinite(m) && m >= 1 && m <= 12) {
						const monthStart = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
						const monthEnd = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
						const paidPayments = await tx
							.select({
								amountKopecks: payments.amountKopecks,
								amountRub: payments.amountRub,
							})
							.from(payments)
							.where(
								and(
									eq(payments.organizationId, organizationId),
									eq(payments.status, "paid"),
									gte(payments.paidAt, monthStart),
									lte(payments.paidAt, monthEnd),
								),
							);
						monthRevenueKop = paidPayments.reduce(
							(acc, p) => acc + resolveSafeKop(p.amountKopecks, p.amountRub),
							0,
						);
					}
				}

				const records = rows.map((r) => rowToExpenseRecord(r, clinicTz));
				let filtered = records;
				if (month) {
					filtered = filtered.filter((e) => e.expenseDate.startsWith(month));
				}

				const effectiveRevenueKop = requestedRevenueKop > 0 ? requestedRevenueKop : monthRevenueKop;
				const summary = calculateMonthlyExpensesSummary(filtered);
				const profit = calculateNetProfitAndMargin(
					kopecksToRub(effectiveRevenueKop),
					summary.totalExpensesRub,
				);

				return {
					data: {
						summary,
						profit,
					},
				};
			},
		});
	};

	registerExpensesSummary("/api/v1/expenses/summary");
	registerExpensesSummary("/api/expenses/summary");

	// 4. DELETE /api/v1/expenses/:id & /api/expenses/:id
	// Мандат безопасности [SEC-06]: удаление расхода разрешено строго ролям owner / admin / administrator
	// и сопровождается обязательной фиксацией в журнале аудита audit_events в единой транзакции.
	const registerDeleteExpense = (path: string) => {
		defineTenantMutation(server, {
			method: "DELETE",
			path,
			permission: "finance.write",
			authOptions: EXPENSE_AUTH_OPTIONS,
			idempotency: "optional_header",
			execute: async ({ tx, principal, request, reply }) => {
				if (
					principal.authMode !== "admin_secret" &&
					!(ADMIN_ROLES as readonly (string | null | undefined)[]).includes(principal.role)
				) {
					return reply.status(403).send({
						error: "PermissionDenied",
						permission: "finance.expenses.delete",
						role: principal.role,
						message: "Удаление расходных операций разрешено только руководству или администратору клиники.",
					});
				}

				const organizationId = principal.organizationId;
				const paramsParsed = z.object({ id: z.string().uuid() }).safeParse(request.params);
				if (!paramsParsed.success) {
					return reply.status(400).send({
						error: "ValidationError",
						message: "Некорректный идентификатор расхода (ожидается UUID).",
					});
				}
				const { id } = paramsParsed.data;

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
					.orderBy(asc(cashOperations.id))
					.for("update")
					.limit(1);

				if (!op) {
					return reply.status(404).send({
						error: "NotFound",
						message: "Расходная операция не найдена.",
					});
				}

				// Детерминированный порядок блокировок: cashBoxes -> cashBoxShifts
				const [box] = await tx
					.select()
					.from(cashBoxes)
					.where(and(eq(cashBoxes.id, op.cashBoxId), eq(cashBoxes.organizationId, organizationId)))
					.orderBy(asc(cashBoxes.id))
					.for("update")
					.limit(1);

				const refundKop = resolveSafeKop(op.amountKopecks, op.amountRub);

				if (box) {
					const restoredKop = resolveSafeKop(box.balanceKopecks, box.balanceRub) + refundKop;
					const restoredBalance = kopecksToRub(restoredKop);
					await tx
						.update(cashBoxes)
						.set({
							balanceRub: restoredBalance,
							balanceKopecks: restoredKop,
							updatedAt: new Date(),
						})
						.where(and(eq(cashBoxes.id, box.id), eq(cashBoxes.organizationId, organizationId)));
				}

				if (op.shiftId) {
					const [shiftRow] = await tx
						.select()
						.from(cashBoxShifts)
						.where(
							and(
								eq(cashBoxShifts.id, op.shiftId),
								eq(cashBoxShifts.organizationId, organizationId),
								eq(cashBoxShifts.status, "open"),
							),
						)
						.orderBy(asc(cashBoxShifts.id))
						.for("update")
						.limit(1);
					if (shiftRow) {
						const curExpKop = resolveSafeKop(
							shiftRow.expenseTotalKopecks,
							shiftRow.expenseTotalRub,
						);
						const nextExpKop = Math.max(0, curExpKop - refundKop);
						await tx
							.update(cashBoxShifts)
							.set({
								expenseTotalRub: kopecksToRub(nextExpKop),
								expenseTotalKopecks: nextExpKop,
								updatedAt: new Date(),
							})
							.where(and(eq(cashBoxShifts.id, shiftRow.id), eq(cashBoxShifts.organizationId, organizationId)));
					}
				}

				await tx
					.delete(cashOperations)
					.where(and(eq(cashOperations.id, id), eq(cashOperations.organizationId, organizationId)));

				let actorUserId: string | null = null;
				const identityUserId =
					typeof principal.userId === "string" ? principal.userId : null;
				if (
					identityUserId &&
					/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
						identityUserId,
					)
				) {
					const [existingUser] = await tx
						.select({ id: users.id })
						.from(users)
						.where(
							and(
								eq(users.id, identityUserId),
								eq(users.organizationId, organizationId),
							),
						)
						.limit(1);
					if (existingUser) {
						actorUserId = existingUser.id;
					}
				}

				await recordAuditEventInDb(
					organizationId,
					{
						entityType: "cash_operation",
						entityId: id,
						action: "delete_expense",
						actorUserId,
						reason: `Аннулирование расходной операции на сумму ${op.amountRub} руб. (${op.reasonText || "без описания"})`,
					},
					tx,
				);

				return { success: true };
			},
		});
	};

	// door-validation: none — удаление расхода по URL-параметру :id без тела запроса
	registerDeleteExpense("/api/v1/expenses/:id");
	// door-validation: none — удаление расхода по URL-параметру :id без тела запроса
	registerDeleteExpense("/api/expenses/:id");
};
