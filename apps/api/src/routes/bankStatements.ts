/**
 * apps/api/src/routes/bankStatements.ts
 *
 * DENTE Dental CRM — 1C Bank Statement (1CClientBankExchange) Upload, Persistence & Reconciliation API.
 * Wave 130 & Mandates 8b, 8e, 8bm, 8bo: PG18 RLS persistence, dedup, cash_operations matching.
 */

import { and, desc, eq, inArray } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
	kopecksToRub,
	matchClinicExpensesWithBankOrders,
	parse1CBankStatement,
	rublesToKopecks,
	sha256Hex,
	type BankMatcherExpenseItem,
} from "@dental/shared";
import { defineTenantMutation, defineTenantQuery } from "../core/routeFactories.js";
import {
	bankStatements,
	bankStatementTransactions,
	cashOperations,
	organizations,
	users,
} from "../db/schema.js";
import {
	formatDateIsoInTimeZone,
	resolveClinicTimeZone,
} from "./payrollModules/payrollTypesAndQueries.js";

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

const uploadBankStatementSchema = z
	.object({
		content: z.string().min(1, "Содержимое файла выписки не может быть пустым"),
		filename: z.string().max(255).optional(),
		contentEncoding: z.enum(["utf-8", "base64-windows-1251"]).optional().default("utf-8"),
		organizationId: z.string().uuid().optional(),
		clinicId: z.string().uuid().optional().nullable(),
	})
	.strict();

function decodeStatementContent(content: string, encoding: "utf-8" | "base64-windows-1251"): string {
	const cleaned = content.replace(/^\uFEFF/, "");
	if (encoding === "base64-windows-1251") {
		const buf = Buffer.from(cleaned, "base64");
		return new TextDecoder("windows-1251").decode(buf).replace(/^\uFEFF/, "");
	}
	return cleaned;
}

function serializeStatementHeader(row: typeof bankStatements.$inferSelect) {
	const openingKop = Number(row.openingBalanceKopecks);
	const closingKop = Number(row.closingBalanceKopecks);
	const incomingKop = Number(row.totalIncomingKopecks);
	const outgoingKop = Number(row.totalOutgoingKopecks);
	return {
		id: row.id,
		sourceFilename: row.sourceFilename,
		sourceHash: row.sourceHash,
		bankAccountNumber: row.bankAccountNumber,
		periodStart: row.periodStart,
		periodEnd: row.periodEnd,
		openingBalanceKopecks: openingKop,
		closingBalanceKopecks: closingKop,
		totalIncomingKopecks: incomingKop,
		totalOutgoingKopecks: outgoingKop,
		openingBalanceRub: kopecksToRub(openingKop),
		closingBalanceRub: kopecksToRub(closingKop),
		totalReceivedRub: kopecksToRub(incomingKop),
		totalDeductedRub: kopecksToRub(outgoingKop),
		transactionCount: row.transactionCount,
		matchedCount: row.matchedCount,
		unmatchedCount: row.unmatchedCount,
		createdAt: row.createdAt.toISOString(),
	};
}

function serializeStatementTx(row: typeof bankStatementTransactions.$inferSelect) {
	const amountKop = Number(row.amountKopecks);
	return {
		id: row.id,
		statementId: row.statementId,
		documentNumber: row.documentNumber,
		documentDate: row.documentDate,
		direction: row.direction,
		amountKopecks: amountKop,
		amountRub: kopecksToRub(amountKop),
		payerName: row.payerName,
		payerInn: row.payerInn,
		receiverName: row.receiverName,
		receiverInn: row.receiverInn,
		paymentPurpose: row.paymentPurpose,
		matchStatus: row.matchStatus,
		matchedCashOperationId: row.matchedCashOperationId,
		createdAt: row.createdAt.toISOString(),
	};
}

const BANK_AUTH_OPTIONS = {
	requireStaffToken: true,
	allowAdminSecretBypass: true,
} as const;

export const registerBankStatementsRoutes: FastifyPluginAsync = async (server) => {
	const registerUpload = (path: string) => {
		defineTenantMutation(server, {
			method: "POST",
			path,
			permission: "finance.write",
			authOptions: BANK_AUTH_OPTIONS,
			idempotency: "required_header",
			execute: async ({ tx, principal, request, reply }) => {
				const organizationId = principal.organizationId;
				const userId = principal.userId || "";

				const parsed = uploadBankStatementSchema.safeParse(request.body);
				if (!parsed.success) {
					return reply.status(400).send({
						error: "ValidationError",
						message: "Некорректные данные запроса выписки 1С.",
						details: parsed.error.issues,
					});
				}

				if (parsed.data.organizationId && parsed.data.organizationId !== organizationId) {
					return reply.status(403).send({
						error: "TenantMismatch",
						message: "Указанная организация не совпадает с авторизованным арендатором.",
					});
				}

				const decodedContent = decodeStatementContent(
					parsed.data.content,
					parsed.data.contentEncoding,
				);
				const normalizedForHash = decodedContent.replace(/\r\n/g, "\n").trim();
				const sourceHash = sha256Hex(normalizedForHash);
				const sourceFilename = parsed.data.filename?.trim() || "1c_bank_statement.txt";

				const [[orgMeta], clinicTz] = await Promise.all([
					tx
						.select({
							name: organizations.name,
							inn: organizations.inn,
							kpp: organizations.kpp,
						})
						.from(organizations)
						.where(eq(organizations.id, organizationId))
						.limit(1),
					resolveClinicTimeZone(tx, organizationId),
				]);

				let registry: ReturnType<typeof parse1CBankStatement>;
				try {
					registry = parse1CBankStatement(decodedContent, {
						clinicName: orgMeta?.name,
						clinicInn: orgMeta?.inn ?? undefined,
						clinicKpp: orgMeta?.kpp,
					});
				} catch (err: unknown) {
					const msg =
						err instanceof Error ? err.message : "Ошибка синтаксического разбора файла выписки 1С";
					return reply.status(400).send({
						error: "InvalidBankStatement",
						message: msg,
					});
				}

				const [existingStatement] = await tx
					.select()
					.from(bankStatements)
					.where(
						and(
							eq(bankStatements.organizationId, organizationId),
							eq(bankStatements.sourceHash, sourceHash),
						),
					)
					.limit(1);

				let txResult: {
					deduplicated: boolean;
					statement: typeof bankStatements.$inferSelect;
					transactions: Array<typeof bankStatementTransactions.$inferSelect>;
					registry: ReturnType<typeof parse1CBankStatement>;
					totalMatchedKopecks: number;
				};

				if (existingStatement) {
					const existingTxs = await tx
						.select()
						.from(bankStatementTransactions)
						.where(
							and(
								eq(bankStatementTransactions.organizationId, organizationId),
								eq(bankStatementTransactions.statementId, existingStatement.id),
							),
						);
					txResult = {
						deduplicated: true,
						statement: existingStatement,
						transactions: existingTxs,
						registry,
						totalMatchedKopecks: existingTxs
							.filter((t) => t.matchStatus === "matched")
							.reduce((acc, t) => acc + Number(t.amountKopecks), 0),
					};
				} else {
					const openingKop = registry.openingBalanceKopecks ?? 0;
					const closingKop = registry.closingBalanceKopecks ?? 0;
					const incomingKop = registry.totalReceivedKopecks ?? 0;
					const outgoingKop = registry.totalDeductedKopecks ?? 0;

					let resolvedUploadedByUserId: string | null = null;
					if (UUID_REGEX.test(userId)) {
						const [userRow] = await tx
							.select({ id: users.id })
							.from(users)
							.where(and(eq(users.id, userId), eq(users.organizationId, organizationId)))
							.limit(1);
						resolvedUploadedByUserId = userRow?.id ?? null;
					}

					const [insertedStatement] = await tx
						.insert(bankStatements)
						.values({
							organizationId,
							uploadedByUserId: resolvedUploadedByUserId,
							sourceFilename,
							sourceHash,
							bankAccountNumber: registry.accountNumber || "",
							periodStart: registry.dateFrom || null,
							periodEnd: registry.dateTo || null,
							openingBalanceKopecks: BigInt(openingKop),
							closingBalanceKopecks: BigInt(closingKop),
							totalIncomingKopecks: BigInt(incomingKop),
							totalOutgoingKopecks: BigInt(outgoingKop),
							transactionCount: registry.orders.length,
							matchedCount: 0,
							unmatchedCount: registry.orders.length,
						})
						.returning();

					if (!insertedStatement) {
						throw new Error("Не удалось сохранить заголовок банковской выписки в базе данных");
					}

					const expenseCashOps = await tx
						.select({
							id: cashOperations.id,
							amountRub: cashOperations.amountRub,
							amountKopecks: cashOperations.amountKopecks,
							reasonText: cashOperations.reasonText,
							createdAt: cashOperations.createdAt,
						})
						.from(cashOperations)
						.where(
							and(
								eq(cashOperations.organizationId, organizationId),
								inArray(cashOperations.operationType, ["expense", "supplier_payment", "withdrawal", "payout"]),
							),
						);

					const clinicExpenses: BankMatcherExpenseItem[] = expenseCashOps.map((op) => {
						const kop = op.amountKopecks != null ? Number(op.amountKopecks) : 0;
						const resolvedKop = kop !== 0 ? kop : Math.abs(rublesToKopecks(Number(op.amountRub) || 0));
						return {
							id: op.id,
							amountKopecks: Math.abs(resolvedKop),
							supplierName: op.reasonText,
							date: formatDateIsoInTimeZone(op.createdAt, clinicTz),
						};
					});

					const matchResult = matchClinicExpensesWithBankOrders(registry.orders, clinicExpenses);
					const matchedCashOpByOrderId = new Map(
						matchResult.matched.map((m) => [m.bankOrderId, m.clinicExpenseId]),
					);

					const valuesToInsert = registry.orders.map((order) => {
						const direction = order.operationType === "receipt" ? "income" : "expense";
						const matchedCashOpId = matchedCashOpByOrderId.get(order.id) ?? null;
						const matchStatus = matchedCashOpId ? "matched" : "unmatched";
						const txFingerprint = sha256Hex(
							[
								order.number,
								order.date,
								direction,
								order.amountKopecks,
								order.payerAccount,
								order.recipientAccount,
								order.paymentPurpose,
							].join("|"),
						);
						return {
							organizationId,
							statementId: insertedStatement.id,
							txFingerprint,
							documentNumber: order.number,
							documentDate: order.date,
							direction,
							amountKopecks: BigInt(order.amountKopecks),
							payerName: order.payerName || "",
							payerInn: order.payerInn ?? null,
							receiverName: order.recipientName || "",
							receiverInn: order.recipientInn ?? null,
							paymentPurpose: order.paymentPurpose || "",
							matchStatus,
							matchedCashOperationId: matchedCashOpId,
						};
					});

					const insertedTxs: Array<typeof bankStatementTransactions.$inferSelect> = [];
					const BATCH_SIZE = 200;
					for (let i = 0; i < valuesToInsert.length; i += BATCH_SIZE) {
						const chunk = valuesToInsert.slice(i, i + BATCH_SIZE);
						const insertedChunk = await tx
							.insert(bankStatementTransactions)
							.values(chunk)
							.onConflictDoNothing({
								target: [bankStatementTransactions.organizationId, bankStatementTransactions.txFingerprint],
							})
							.returning();
						insertedTxs.push(...insertedChunk);
					}

					const insertedCount = insertedTxs.length;
					const matchedCount = insertedTxs.filter((t) => t.matchStatus === "matched").length;
					const unmatchedCount = Math.max(0, insertedCount - matchedCount);
					const [updatedStatement] = await tx
						.update(bankStatements)
						.set({
							transactionCount: insertedCount,
							matchedCount,
							unmatchedCount,
						})
						.where(
							and(
								eq(bankStatements.id, insertedStatement.id),
								eq(bankStatements.organizationId, organizationId),
							),
						)
						.returning();

					txResult = {
						deduplicated: false,
						statement: updatedStatement ?? insertedStatement,
						transactions: insertedTxs,
						registry,
						totalMatchedKopecks: matchResult.totalMatchedKopecks,
					};
				}

				const openingKop = Number(txResult.statement.openingBalanceKopecks);
				const closingKop = Number(txResult.statement.closingBalanceKopecks);
				const incomingKop = Number(txResult.statement.totalIncomingKopecks);
				const outgoingKop = Number(txResult.statement.totalOutgoingKopecks);

				return {
					success: true,
					statementId: txResult.statement.id,
					deduplicated: txResult.deduplicated,
					registry: txResult.registry,
					count: txResult.registry.orders.length,
					persistedCount: txResult.statement.transactionCount,
					accountNumber: txResult.statement.bankAccountNumber,
					dateFrom: txResult.statement.periodStart ?? txResult.registry.dateFrom,
					dateTo: txResult.statement.periodEnd ?? txResult.registry.dateTo,
					openingBalanceKopecks: openingKop,
					closingBalanceKopecks: closingKop,
					totalReceivedKopecks: incomingKop,
					totalDeductedKopecks: outgoingKop,
					openingBalanceRub: kopecksToRub(openingKop),
					closingBalanceRub: kopecksToRub(closingKop),
					totalReceivedRub: kopecksToRub(incomingKop),
					totalDeductedRub: kopecksToRub(outgoingKop),
					matching: {
						matchedCount: txResult.statement.matchedCount,
						unmatchedCount: txResult.statement.unmatchedCount,
						totalMatchedKopecks: txResult.totalMatchedKopecks,
					},
					transactions: txResult.transactions.map(serializeStatementTx),
				};
			},
		});
	};

	const registerList = (path: string) => {
		defineTenantQuery(server, {
			path,
			permission: "finance.read",
			authOptions: BANK_AUTH_OPTIONS,
			query: async ({ tx, principal }) => {
				const rows = await tx
					.select()
					.from(bankStatements)
					.where(eq(bankStatements.organizationId, principal.organizationId))
					.orderBy(desc(bankStatements.createdAt));

				return {
					success: true,
					statements: rows.map(serializeStatementHeader),
				};
			},
		});
	};

	const registerGetById = (path: string) => {
		defineTenantQuery(server, {
			path,
			permission: "finance.read",
			authOptions: BANK_AUTH_OPTIONS,
			query: async ({ tx, principal, request, reply }) => {
				const { statementId } = request.params as { statementId: string };
				if (!UUID_REGEX.test(statementId)) {
					return reply.status(400).send({
						error: "ValidationError",
						message: "Параметр statementId должен быть валидным UUID.",
					});
				}

				const [header] = await tx
					.select()
					.from(bankStatements)
					.where(
						and(
							eq(bankStatements.id, statementId),
							eq(bankStatements.organizationId, principal.organizationId),
						),
					)
					.limit(1);
				if (!header) {
					return reply.status(404).send({
						error: "StatementNotFound",
						message: "Банковская выписка не найдена в вашей клинике.",
					});
				}
				const txs = await tx
					.select()
					.from(bankStatementTransactions)
					.where(
						and(
							eq(bankStatementTransactions.statementId, statementId),
							eq(bankStatementTransactions.organizationId, principal.organizationId),
						),
					);

				return {
					success: true,
					statement: serializeStatementHeader(header),
					transactions: txs.map(serializeStatementTx),
				};
			},
		});
	};

	registerUpload("/api/finance/bank-statements/upload");
	registerUpload("/api/v1/finance/bank-statements/upload");
	registerList("/api/finance/bank-statements");
	registerList("/api/v1/finance/bank-statements");
	registerGetById("/api/finance/bank-statements/:statementId");
	registerGetById("/api/v1/finance/bank-statements/:statementId");
};
