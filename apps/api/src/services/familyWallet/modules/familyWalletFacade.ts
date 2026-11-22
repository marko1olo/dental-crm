import { kopecksToRub, parseKopecks } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import { withTenantCtx } from "../../../db/rls.js";
import { familyGroups, payments } from "../../../db/schema.js";
import { processCashboxPayment } from "../../../routes/cashbox/cashboxPaymentProcessor.js";
import type { FnsClinicInfo, FnsTaxPayload } from "@dental/shared";
import { generateFnsTaxCertificatesForFamilyLogic } from "../familyFnsTaxService.js";
import {
	FamilyWalletError,
	type FamilyDebitParams,
	type FamilyDebitResult,
	type FamilyRefundParams,
	type FamilyRefundResult,
	type FamilyTopupParams,
	type FamilyTopupResult,
	type FnsTaxCertificateSummary,
} from "../familyWalletTypes.js";
import { verifyServicePriceIntegrity } from "./familyPriceGuard.js";
import { processFamilyRefund } from "./familyRefundOperation.js";

export class FamilyWalletService {
	public async topup(params: FamilyTopupParams): Promise<FamilyTopupResult> {
		const targetPatientId = params.payerPatientId || params.patientId;
		if (!params.organizationId) throw new FamilyWalletError("Не указан ID организации клиники", 400, "MISSING_ORG_ID");
		if (!params.familyGroupId) throw new FamilyWalletError("Не указан ID семейной группы", 400, "MISSING_FAMILY_ID");
		if (!targetPatientId) throw new FamilyWalletError("Не указан ID плательщика", 400, "MISSING_PATIENT_ID");
		if (!params.clientMutationId?.trim()) {
			throw new FamilyWalletError("Ключ операции (clientMutationId) обязателен для защиты от повторных зачислений", 400, "MISSING_IDEMPOTENCY_KEY");
		}

		const outcome = await processCashboxPayment(
			params.organizationId,
			{
				patientId: targetPatientId,
				familyGroupId: params.familyGroupId,
				amountRub: params.amountRub,
				amountKopecks: params.amountKopecks !== undefined ? Number(params.amountKopecks) : undefined,
				method: params.method === "bank_transfer" || params.method === "online" ? "online" : (params.method || "cash"),
				isAdvanceDeposit: true,
				advanceDepositTarget: "family",
				clientMutationId: params.clientMutationId.trim(),
				note: params.notes?.trim() || `Внесение семейного депозита (${params.method || "cash"})`,
			},
			params.clientMutationId.trim(),
		);

		if (outcome.statusCode !== 200) {
			const errCode = "error" in outcome.body ? outcome.body.error : "TOPUP_FAILED";
			const errMsg = "message" in outcome.body ? outcome.body.message : "Не удалось пополнить семейный счёт";
			throw new FamilyWalletError(errMsg, outcome.statusCode, errCode);
		}

		const data = outcome.body.data;
		const paymentId = data.id as string;
		const [payment] = await withTenantCtx(params.organizationId, async (tx) =>
			tx.select().from(payments).where(and(eq(payments.id, paymentId), eq(payments.organizationId, params.organizationId))).limit(1),
		);

		if (!payment) {
			throw new FamilyWalletError("Платёж пополнения не найден в базе данных", 500, "PAYMENT_NOT_FOUND");
		}

		const prevBalKop = (data.previousFamilyBalanceKopecks as number | undefined) ?? 0;
		const newBalKop = (data.newFamilyBalanceKopecks as number | undefined) ?? 0;
		const creditedKop = (data.amountKopecks as number | undefined) ?? (params.amountKopecks !== undefined ? Number(params.amountKopecks) : parseKopecks(params.amountRub));

		return {
			success: true,
			payment,
			previousBalanceRub: kopecksToRub(prevBalKop),
			newBalanceRub: kopecksToRub(newBalKop),
			creditedRub: kopecksToRub(creditedKop),
			previousBalanceKopecks: prevBalKop,
			newBalanceKopecks: newBalKop,
			creditedKopecks: creditedKop,
			duplicate: Boolean(data.isReplay),
		};
	}

	public async debit(params: FamilyDebitParams): Promise<FamilyDebitResult> {
		if (!params.organizationId) throw new FamilyWalletError("Не указан ID организации клиники", 400, "MISSING_ORG_ID");
		if (!params.familyGroupId) throw new FamilyWalletError("Не указан ID семейной группы", 400, "MISSING_FAMILY_ID");
		if (!params.patientId) throw new FamilyWalletError("Не указан ID пациента", 400, "MISSING_PATIENT_ID");
		if (!params.clientMutationId?.trim()) {
			throw new FamilyWalletError("Ключ операции (clientMutationId) обязателен для защиты от двойных списаний", 400, "MISSING_IDEMPOTENCY_KEY");
		}

		const debitKop = params.amountKopecks !== undefined ? Number(params.amountKopecks) : parseKopecks(params.amountRub);
		if (debitKop <= 0) throw new FamilyWalletError("Сумма списания должна быть больше 0 ₽", 400, "INVALID_AMOUNT");

		await withTenantCtx(params.organizationId, async (tx) => {
			await verifyServicePriceIntegrity({ tx, organizationId: params.organizationId, debitParams: params, debitKopecks: debitKop });
		});

		const [familyBefore] = await withTenantCtx(params.organizationId, async (tx) =>
			tx.select({ balance: familyGroups.balance }).from(familyGroups).where(and(eq(familyGroups.id, params.familyGroupId), eq(familyGroups.organizationId, params.organizationId))).limit(1),
		);
		const prevBalKop = familyBefore ? parseKopecks(familyBefore.balance ?? 0) : 0;

		const outcome = await processCashboxPayment(
			params.organizationId,
			{
				patientId: params.patientId,
				familyGroupId: params.familyGroupId,
				amountRub: params.amountRub,
				amountKopecks: debitKop,
				method: "family_wallet",
				clientMutationId: params.clientMutationId.trim(),
				invoiceId: params.documentId,
				visitId: params.visitId,
				taxCategory: params.taxCategory,
				taxDeductionCode: params.taxCategory,
				note: params.notes?.trim() || "Оплата стоматологических услуг с семейного счета",
			},
			params.clientMutationId.trim(),
		);

		if (outcome.statusCode !== 200) {
			const errCode = "error" in outcome.body ? outcome.body.error : "DEBIT_FAILED";
			const errMsg = "message" in outcome.body ? outcome.body.message : "Не удалось списать средства с семейного баланса";
			const statusCode = outcome.statusCode === 402 || errCode.includes("Insufficient") ? 402 : outcome.statusCode;
			throw new FamilyWalletError(errMsg, statusCode, errCode);
		}

		const data = outcome.body.data;
		const paymentId = data.id as string;
		const [payment] = await withTenantCtx(params.organizationId, async (tx) =>
			tx.select().from(payments).where(and(eq(payments.id, paymentId), eq(payments.organizationId, params.organizationId))).limit(1),
		);

		if (!payment) {
			throw new FamilyWalletError("Запись платежа не найдена в базе данных", 500, "PAYMENT_NOT_FOUND");
		}

		const [familyAfter] = await withTenantCtx(params.organizationId, async (tx) =>
			tx.select({ balance: familyGroups.balance }).from(familyGroups).where(and(eq(familyGroups.id, params.familyGroupId), eq(familyGroups.organizationId, params.organizationId))).limit(1),
		);
		const newBalKop = familyAfter ? parseKopecks(familyAfter.balance ?? 0) : Math.max(0, prevBalKop - debitKop);

		return {
			success: true,
			payment,
			previousBalanceRub: kopecksToRub(prevBalKop),
			newBalanceRub: kopecksToRub(newBalKop),
			debitedRub: kopecksToRub(debitKop),
			previousBalanceKopecks: prevBalKop,
			newBalanceKopecks: newBalKop,
			debitedKopecks: debitKop,
			duplicate: Boolean(data.isReplay),
		};
	}

	public async refund(params: FamilyRefundParams): Promise<FamilyRefundResult> {
		return processFamilyRefund(params);
	}

	public async generateFnsTaxCertificatesForFamily(params: {
		readonly organizationId: string;
		readonly familyGroupId: string;
		readonly taxYear: string;
		readonly clinic: FnsClinicInfo;
		readonly signatory: FnsTaxPayload["signatory"];
		readonly customPayerPatientId?: string | undefined;
	}): Promise<readonly FnsTaxCertificateSummary[]> {
		return generateFnsTaxCertificatesForFamilyLogic(params);
	}
}

export const familyWalletService = new FamilyWalletService();
