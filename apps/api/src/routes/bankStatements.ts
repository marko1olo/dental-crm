/**
 * apps/api/src/routes/bankStatements.ts
 *
 * DENTE Dental CRM — 1C Bank Statement (1CClientBankExchange) Upload, Persistence & Reconciliation API.
 * Wave 130 & Mandates 8b, 8e, 8bm, 8bo: PG18 RLS persistence, dedup, cash_operations matching.
 */

import { and, desc, eq, inArray } from "drizzle-orm";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	kopecksToRub,
	matchClinicExpensesWithBankOrders,
	parse1CBankStatement,
	rublesToKopecks,
	sha256Hex,
	type BankMatcherExpenseItem,
} from "@dental/shared";
import { requireResolvedStaffOrAdminOrganizationId } from "../accessGuard.js";
import { withTenantCtx } from "../db/rls.js";
import {
	bankStatements,
	bankStatementTransactions,
	cashOperations,
	organizations,
	users,
} from "../db/schema.js";
import { getRequestIdentity } from "../security/identity.js";

const FORBIDDEN_FINANCE_ROLES = new Set(["marketer", "marketing", "receptionist", "patient"]);
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

async function requireBankAccess(
	request: FastifyRequest,
	reply: FastifyReply,
	area: string,
): Promise<{ organizationId: string; userId: string } | null> {
	const identity = getRequestIdentity(request);
	if (identity.role && FORBIDDEN_FINANCE_ROLES.has(identity.role)) {
		void reply.code(403).send({
			error: "PermissionDenied",
			permission: "finance.bank_statements",
			role: identity.role,
			message: "Операции с банковскими выписками для нефинансового персонала запрещены (152-ФЗ).",
		});
		return null;
	}
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(request, reply, area);
	if (!organizationId) return null;

	const postIdentity = getRequestIdentity(request);
	if (postIdentity.role && FORBIDDEN_FINANCE_ROLES.has(postIdentity.role)) {
		void reply.code(403).send({
			error: "PermissionDenied",
			permission: "finance.bank_statements",
			role: postIdentity.role,
			message: "Операции с банковскими выписками для нефинансового персонала запрещены (152-ФЗ).",
		});
		return null;
	}
	return { organizationId, userId: postIdentity.userId || "" };
}

export const registerBankStatementsRoutes: FastifyPluginAsync = async (server) => {
	const handleUploadBankStatement = async (request: FastifyRequest, reply: FastifyReply) => {
		const access = await requireBankAccess(request, reply, "upload 1C bank statement");
		if (!access) return;
		const { organizationId, userId } = access;

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

		const orgMeta = await withTenantCtx(organizationId, async (tx) => {
			const [org] = await tx
				.select({
					name: organizations.name,
					inn: organizations.inn,
					kpp: organizations.kpp,
				})
				.from(organizations)
				.where(eq(organizations.id, organizationId))
				.limit(1);
			return org ?? null;
		});

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

		const txResult = await withTenantCtx(organizationId, async (tx) => {
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
					return {
						deduplicated: true,
						statement: existingStatement,
						transactions: existingTxs,
						registry,
						totalMatchedKopecks: existingTxs
							.filter((t) => t.matchStatus === "matched")
							.reduce((acc, t) => acc + Number(t.amountKopecks), 0),
					};
				}

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
						date: op.createdAt.toISOString().slice(0, 10),
					};
				});

				const matchResult = matchClinicExpensesWithBankOrders(registry.orders, clinicExpenses);
				const matchedCashOpByOrderId = new Map(
					matchResult.matched.map((m) => [m.bankOrderId, m.clinicExpenseId]),
				);

				let insertedCount = 0;
				let matchedCount = 0;
				const insertedTxs: Array<typeof bankStatementTransactions.$inferSelect> = [];

				for (const order of registry.orders) {
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

					const [insertedTx] = await tx
						.insert(bankStatementTransactions)
						.values({
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
						})
						.onConflictDoNothing({
							target: [bankStatementTransactions.organizationId, bankStatementTransactions.txFingerprint],
						})
						.returning();

					if (insertedTx) {
						insertedTxs.push(insertedTx);
						insertedCount++;
						if (matchStatus === "matched") {
							matchedCount++;
						}
					}
				}

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

				return {
					deduplicated: false,
					statement: updatedStatement ?? insertedStatement,
					transactions: insertedTxs,
					registry,
					totalMatchedKopecks: matchResult.totalMatchedKopecks,
				};
			});

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
	};

	const handleListBankStatements = async (request: FastifyRequest, reply: FastifyReply) => {
		const access = await requireBankAccess(request, reply, "list 1C bank statements");
		if (!access) return;

		const rows = await withTenantCtx(access.organizationId, (tx) =>
			tx
				.select()
				.from(bankStatements)
				.where(eq(bankStatements.organizationId, access.organizationId))
				.orderBy(desc(bankStatements.createdAt)),
		);

		return {
			success: true,
			statements: rows.map(serializeStatementHeader),
		};
	};

	const handleGetBankStatementById = async (
		request: FastifyRequest<{ Params: { statementId: string } }>,
		reply: FastifyReply,
	) => {
		const access = await requireBankAccess(request, reply, "read 1C bank statement");
		if (!access) return;

		const { statementId } = request.params;
		if (!UUID_REGEX.test(statementId)) {
			return reply.status(400).send({
				error: "ValidationError",
				message: "Параметр statementId должен быть валидным UUID.",
			});
		}

		const data = await withTenantCtx(access.organizationId, async (tx) => {
			const [header] = await tx
				.select()
				.from(bankStatements)
				.where(
					and(
						eq(bankStatements.id, statementId),
						eq(bankStatements.organizationId, access.organizationId),
					),
				)
				.limit(1);
			if (!header) return null;
			const txs = await tx
				.select()
				.from(bankStatementTransactions)
				.where(
					and(
						eq(bankStatementTransactions.statementId, statementId),
						eq(bankStatementTransactions.organizationId, access.organizationId),
					),
				);
			return { header, txs };
		});

		if (!data) {
			return reply.status(404).send({
				error: "StatementNotFound",
				message: "Банковская выписка не найдена в вашей клинике.",
			});
		}

		return {
			success: true,
			statement: serializeStatementHeader(data.header),
			transactions: data.txs.map(serializeStatementTx),
		};
	};

	server.post("/api/finance/bank-statements/upload", handleUploadBankStatement);
	server.post("/api/v1/finance/bank-statements/upload", handleUploadBankStatement);
	server.get("/api/finance/bank-statements", handleListBankStatements);
	server.get("/api/v1/finance/bank-statements", handleListBankStatements);
	server.get<{ Params: { statementId: string } }>(
		"/api/finance/bank-statements/:statementId",
		handleGetBankStatementById,
	);
	server.get<{ Params: { statementId: string } }>(
		"/api/v1/finance/bank-statements/:statementId",
		handleGetBankStatementById,
	);
};
