import { denteAdminSecretRequestHeaders } from "../../../AppHelpers";
import { logger } from "../../../utils/logger";
import { fetchWithHandling } from "../../../utils/networkUtils";
import type { ClinicalVisitCompletionResult, ClinicalEstimateItem } from "../clinicalVisitWorkflow";

export interface CreateVisitInvoiceParams {
	readonly effectiveVisitId: string;
	readonly effectivePatientId: string;
	readonly effectiveDoctorId?: string | null | undefined;
	readonly result: ClinicalVisitCompletionResult;
	readonly notes?: string | undefined;
}

export interface CreatedVisitInvoiceResult {
	readonly invoiceId: string;
	readonly invoiceNumber: string;
	readonly totalAmountRub: number;
	readonly isPersistedInDb: boolean;
}

const isUuid = (id: string | null | undefined): boolean =>
	Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id));

/**
 * Создание реального счёта в PostgreSQL 18 через Fastify API (POST /api/invoices).
 * Мандаты 8e, 8n: целочисленные расчеты, сквозная персистентность, soft fallback при сетевых сбоях.
 */
export async function createVisitInvoiceInApi(
	params: CreateVisitInvoiceParams,
): Promise<CreatedVisitInvoiceResult> {
	const { effectiveVisitId, effectivePatientId, effectiveDoctorId, result, notes } = params;

	if (!effectivePatientId || !isUuid(effectivePatientId)) {
		logger.error(
			`[visitInvoiceCreationService] Невалидный или отсутствующий patientId: "${effectivePatientId}". Счёт не может быть создан.`,
		);
		throw new Error(
			`Невозможно создать счёт: отсутствует валидный идентификатор пациента (${effectivePatientId || "не указан"}).`,
		);
	}

	try {
		const invoicePayload = {
			visitId: isUuid(effectiveVisitId) ? effectiveVisitId : undefined,
			patientId: effectivePatientId,
			doctorId: isUuid(effectiveDoctorId) ? effectiveDoctorId : undefined,
			totalAmountRub: result.totalNetRub,
			totalAmountKopecks: result.totalNetKop,
			discountRub: result.totalDiscountRub,
			status: "issued" as const,
			documentType: "invoice" as const,
			items: (result.items || []).map((it: ClinicalEstimateItem) => ({
				serviceId: isUuid(it.id) ? it.id : undefined,
				serviceCode: it.code,
				serviceName: it.name,
				title: it.name,
				toothNumber: it.toothNumber,
				toothCode: it.toothNumber != null ? String(it.toothNumber) : null,
				priceRub: it.priceRub,
				unitPriceRub: it.priceRub,
				quantity: it.quantity || 1,
				discountRub: it.discountRub || 0,
				totalRub: it.totalRub,
			})),
			notes: notes || `Счёт по завершённому приёму ${effectiveVisitId}`,
			clientMutationId: `invoice-${effectiveVisitId}-${Date.now()}`,
		};

		const response = await fetchWithHandling("/api/invoices", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Idempotency-Key": `invoice-create-${effectiveVisitId}`,
				...denteAdminSecretRequestHeaders(),
			},
			body: JSON.stringify(invoicePayload),
		});

		const data = (await response.json()) as {
			success?: boolean;
			invoice?: {
				id: string;
				invoiceNumber?: string;
				number?: string;
				totalAmountRub: number;
				status: string;
			};
		};

		if (data?.invoice?.id) {
			const inv = data.invoice;
			const realInvoiceNumber = inv.invoiceNumber || inv.number || result.receiptNumber;

			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("dente-invoice-created", {
						detail: {
							invoiceId: inv.id,
							patientId: effectivePatientId,
							visitId: effectiveVisitId,
							totalAmountRub: inv.totalAmountRub,
						},
					}),
				);
			}

			return {
				invoiceId: inv.id,
				invoiceNumber: realInvoiceNumber,
				totalAmountRub: inv.totalAmountRub,
				isPersistedInDb: true,
			};
		}
	} catch (err) {
		logger.warn(
			"[visitInvoiceCreationService] Не удалось создать счёт в API (активирован soft fallback):",
			err,
		);
	}

	return {
		invoiceId: result.invoiceId,
		invoiceNumber: result.receiptNumber,
		totalAmountRub: result.totalNetRub,
		isPersistedInDb: false,
	};
}
