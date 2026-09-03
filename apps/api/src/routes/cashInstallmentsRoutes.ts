/**
 * cashInstallmentsRoutes.ts — 0% Clinic Internal Installments & Stage Tranches API.
 *
 * Provides statutory, kopeck-exact 0% installment contracts, tranche generation,
 * cash box payment execution, and patient installment registers.
 */

import {
	generate0PercentInstallmentSchedule,
	kopecksToRubles,
	nonNegativeMoneyRubSchema,
	positiveMoneyRubSchema,
	rublesToKopecks,
} from "@dental/shared";
import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../accessGuard.js";
import { withTenantCtx } from "../db/rls.js";
import {
	cashBoxes,
	cashOperations,
	installmentContracts,
	installmentTranches,
	patients,
} from "../db/schema.js";
import { ensureOrganizationCashBoxes } from "../db/seeds/seed_cash_and_reasons.js";

export async function registerCashInstallmentsRoutes(app: FastifyInstance) {
	/**
	 * 1. POST /api/installments
	 * Создание договора внутренней рассрочки клиники (0% переплат) с расчетом траншей.
	 */
	app.post("/api/installments", async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"create installment contract",
		);
		if (!orgId) return;

		const bodySchema = z.object({
			patientId: z.string().uuid(),
			treatmentPlanId: z.string().uuid().optional().nullable(),
			totalAmountRub: positiveMoneyRubSchema,
			downPaymentRub: nonNegativeMoneyRubSchema.default(0),
			monthsCount: z.union([z.literal(3), z.literal(6), z.literal(12), z.literal(24)]).default(6),
			notes: z.string().trim().max(1000).optional().nullable(),
			startDateIso: z.string().optional(),
		});

		const parsed = bodySchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры договора рассрочки.",
				details: parsed.error.issues,
			});
		}

		const { patientId, treatmentPlanId, totalAmountRub, downPaymentRub, monthsCount, notes, startDateIso } = parsed.data;

		if (downPaymentRub >= totalAmountRub) {
			return reply.code(400).send({
				error: "InvalidDownPayment",
				message: "Первоначальный взнос не может быть равен или превышать полную стоимость рассрочки.",
			});
		}

		const remainingKop = rublesToKopecks(totalAmountRub) - rublesToKopecks(downPaymentRub);

		// Расчет графика траншей без потери ни одной копейки
		const schedule = generate0PercentInstallmentSchedule(
			remainingKop,
			monthsCount,
			startDateIso ?? new Date().toISOString(),
		);

		const result = await withTenantCtx(orgId, async (tx) => {
			// Проверяем пациента
			const [patient] = await tx
				.select()
				.from(patients)
				.where(and(eq(patients.id, patientId), eq(patients.organizationId, orgId)))
				.limit(1);

			if (!patient) {
				return { kind: "patient_not_found" as const };
			}

			const now = new Date();
			const contractNumber = `РАСС-${now.getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

			// Создаем договор
			const [contract] = await tx
				.insert(installmentContracts)
				.values({
					organizationId: orgId,
					patientId,
					treatmentPlanId: treatmentPlanId ?? null,
					contractNumber,
					totalAmountRub,
					downPaymentRub,
					monthsCount,
					paidAmountRub: 0,
					remainingAmountRub: totalAmountRub,
					status: "active",
					signedAt: now,
					notes: notes ?? null,
				})
				.returning();

			// Создаем записи траншей
			const tranchesToInsert = schedule.map((item) => ({
				contractId: contract!.id,
				organizationId: orgId,
				trancheNumber: item.monthIndex,
				amountRub: kopecksToRubles(item.amountKopecks),
				dueDate: new Date(item.paymentDateIso),
				isPaid: false,
				status: "pending",
			}));

			const createdTranches = await tx
				.insert(installmentTranches)
				.values(tranchesToInsert)
				.returning();

			return { kind: "ok" as const, contract: contract!, tranches: createdTranches };
		});

		if (result.kind === "patient_not_found") {
			return reply.code(404).send({
				error: "PatientNotFound",
				message: "Пациент для оформления рассрочки не найден.",
			});
		}

		return reply.code(201).send({
			success: true,
			message: `Договор рассрочки ${result.contract.contractNumber} на ${monthsCount} мес. успешно оформлен.`,
			contract: result.contract,
			tranches: result.tranches,
		});
	});

	/**
	 * 2. POST /api/installments/tranches/:id/pay & POST /api/installment-payments/:id/pay
	 * Проведение оплаты транша рассрочки через кассу.
	 */
	const handlePayTranche = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"pay installment tranche",
		);
		if (!orgId) return;

		const { id } = request.params;

		const bodySchema = z.object({
			cashBoxId: z.string().uuid().optional(),
			operatorId: z.string().uuid().optional(),
		});
		const parsed = bodySchema.safeParse(request.body || {});
		const payData = parsed.success ? parsed.data : {};

		const result = await withTenantCtx(orgId, async (tx) => {
			const [tranche] = await tx
				.select()
				.from(installmentTranches)
				.where(and(eq(installmentTranches.id, id), eq(installmentTranches.organizationId, orgId)))
				.limit(1);

			if (!tranche) {
				return { kind: "tranche_not_found" as const };
			}

			if (tranche.isPaid) {
				return { kind: "already_paid" as const };
			}

			const [contract] = await tx
				.select()
				.from(installmentContracts)
				.where(eq(installmentContracts.id, tranche.contractId))
				.limit(1);

			if (!contract) {
				return { kind: "contract_not_found" as const };
			}

			// Находим кассу (по умолчанию безналичная "cashless" или "main")
			await ensureOrganizationCashBoxes(tx, orgId);
			let targetBox: typeof cashBoxes.$inferSelect | undefined;

			if (payData.cashBoxId) {
				const [b] = await tx
					.select()
					.from(cashBoxes)
					.where(and(eq(cashBoxes.id, payData.cashBoxId), eq(cashBoxes.organizationId, orgId)))
					.limit(1);
				targetBox = b;
			} else {
				const [b] = await tx
					.select()
					.from(cashBoxes)
					.where(and(eq(cashBoxes.organizationId, orgId), eq(cashBoxes.type, "cashless")))
					.limit(1);
				targetBox = b;
			}

			if (!targetBox) {
				const [fallback] = await tx
					.select()
					.from(cashBoxes)
					.where(eq(cashBoxes.organizationId, orgId))
					.limit(1);
				targetBox = fallback;
			}

			if (!targetBox) {
				return { kind: "no_cash_box" as const };
			}

			const balanceBefore = targetBox.balanceRub;
			const balanceAfter = kopecksToRubles(rublesToKopecks(balanceBefore) + rublesToKopecks(tranche.amountRub));

			// Обновляем кассу
			await tx
				.update(cashBoxes)
				.set({
					balanceRub: balanceAfter,
					updatedAt: new Date(),
				})
				.where(eq(cashBoxes.id, targetBox.id));

			// Проводим кассовую операцию прихода
			const [operation] = await tx
				.insert(cashOperations)
				.values({
					organizationId: orgId,
					cashBoxId: targetBox.id,
					operationType: "income",
					amountRub: tranche.amountRub,
					balanceBeforeRub: balanceBefore,
					balanceAfterRub: balanceAfter,
					reasonText: `Оплата взноса №${tranche.trancheNumber} по договору рассрочки ${contract.contractNumber}`,
					patientId: contract.patientId,
					installmentTrancheId: tranche.id,
					operatorId: payData.operatorId ?? null,
				})
				.returning();

			const now = new Date();

			// Обновляем транш
			const [updatedTranche] = await tx
				.update(installmentTranches)
				.set({
					isPaid: true,
					paidAt: now,
					status: "paid",
					cashOperationId: operation!.id,
				})
				.where(eq(installmentTranches.id, tranche.id))
				.returning();

			// Обновляем баланс договора рассрочки
			const newPaidAmount = kopecksToRubles(rublesToKopecks(contract.paidAmountRub) + rublesToKopecks(tranche.amountRub));
			const newRemaining = Math.max(0, kopecksToRubles(rublesToKopecks(contract.remainingAmountRub) - rublesToKopecks(tranche.amountRub)));
			const isFullyPaid = newRemaining <= 0;

			const [updatedContract] = await tx
				.update(installmentContracts)
				.set({
					paidAmountRub: newPaidAmount,
					remainingAmountRub: newRemaining,
					status: isFullyPaid ? "completed" : contract.status,
					completedAt: isFullyPaid ? now : null,
					updatedAt: now,
				})
				.where(eq(installmentContracts.id, contract.id))
				.returning();

			return {
				kind: "ok" as const,
				tranche: updatedTranche!,
				contract: updatedContract!,
				cashOperation: operation!,
			};
		});

		if (result.kind === "tranche_not_found") {
			return reply.code(404).send({
				error: "TrancheNotFound",
				message: "Транш рассрочки не найден.",
			});
		}
		if (result.kind === "already_paid") {
			return reply.code(400).send({
				error: "AlreadyPaid",
				message: "Данный взнос рассрочки уже оплачен.",
			});
		}
		if (result.kind === "contract_not_found") {
			return reply.code(404).send({
				error: "ContractNotFound",
				message: "Договор рассрочки не найден.",
			});
		}
		if (result.kind === "no_cash_box") {
			return reply.code(400).send({
				error: "NoCashBox",
				message: "Кассовые счета организации не найдены.",
			});
		}

		return reply.send({
			success: true,
			message: `Платеж по рассрочке на сумму ${result.tranche.amountRub} ₽ успешно проведен.`,
			tranche: result.tranche,
			contract: result.contract,
			cashOperation: result.cashOperation,
		});
	};

	app.post("/api/installments/tranches/:id/pay", handlePayTranche);
	app.post("/api/installment-payments/:id/pay", handlePayTranche);

	/**
	 * 3. GET /api/installments
	 * Реестр договоров рассрочки.
	 */
	app.get("/api/installments", async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(request, reply, "installments list");
		if (!orgId) return;

		const querySchema = z.object({
			patientId: z.string().uuid().optional(),
			status: z.string().optional(),
		});
		const parsed = querySchema.safeParse(request.query || {});
		const filter = parsed.success ? parsed.data : {};

		const contractsList = await withTenantCtx(orgId, async (tx) => {
			const conditions = [eq(installmentContracts.organizationId, orgId)];
			if (filter.patientId) {
				conditions.push(eq(installmentContracts.patientId, filter.patientId));
			}
			if (filter.status) {
				conditions.push(eq(installmentContracts.status, filter.status));
			}

			const list = await tx
				.select({
					contract: installmentContracts,
					patientName: patients.fullName,
					patientPhone: patients.phone,
				})
				.from(installmentContracts)
				.innerJoin(patients, eq(patients.id, installmentContracts.patientId))
				.where(and(...conditions))
				.orderBy(desc(installmentContracts.createdAt));

			return list;
		});

		return reply.send({ data: contractsList, total: contractsList.length });
	});

	/**
	 * 4. GET /api/installments/:id
	 * Детальная карточка договора рассрочки с графиком траншей.
	 */
	app.get("/api/installments/:id", async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(request, reply, "installment contract read");
		if (!orgId) return;

		const { id } = request.params;

		const result = await withTenantCtx(orgId, async (tx) => {
			const [contract] = await tx
				.select({
					contract: installmentContracts,
					patientName: patients.fullName,
					patientPhone: patients.phone,
				})
				.from(installmentContracts)
				.innerJoin(patients, eq(patients.id, installmentContracts.patientId))
				.where(and(eq(installmentContracts.id, id), eq(installmentContracts.organizationId, orgId)))
				.limit(1);

			if (!contract) return null;

			const tranches = await tx
				.select()
				.from(installmentTranches)
				.where(eq(installmentTranches.contractId, contract.contract.id))
				.orderBy(installmentTranches.trancheNumber);

			return {
				...contract,
				tranches,
			};
		});

		if (!result) {
			return reply.code(404).send({
				error: "InstallmentNotFound",
				message: "Договор рассрочки не найден.",
			});
		}

		return reply.send({ data: result });
	});
}
