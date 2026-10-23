import { and, eq, inArray, isNotNull } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { db as dbType } from "../../../db/client.js";
import { users } from "../../../db/schema/auth.js";
import {
	generatedDocuments,
	treatmentPlanItemsNew,
	treatmentPlans,
} from "../../../db/schema/clinical.js";
import { patients } from "../../../db/schema/patients.js";
import { verifyCredential } from "../../../utils/cryptoHelper.js";
import {
	evaluateOmsCompliance,
	isServiceApprovedInPlanItems,
} from "../invoiceCalculationHelpers.js";
import type {
	GenerateInvoiceFromPlanBody,
	PatientRow,
} from "../types.js";

export interface ComplianceGateContext {
	patient: PatientRow;
	approvedPlanIds: string[];
	isAdminOverrideVerified: boolean;
	adminStaffName: string;
}

export async function verifyGenerateInvoiceCompliance(params: {
	db: typeof dbType;
	orgId: string;
	data: GenerateInvoiceFromPlanBody;
	request: FastifyRequest;
	reply: FastifyReply;
}): Promise<ComplianceGateContext | null> {
	const { db, orgId, data, request, reply } = params;

	const [patient] = await db
		.select()
		.from(patients)
		.where(and(eq(patients.id, data.patientId), eq(patients.organizationId, orgId)))
		.limit(1);

	if (!patient) {
		reply.code(404).send({ error: "PatientNotFound", message: "Пациент не найден в базе данных." });
		return null;
	}

	const { isOmsInvoice, isAnonPatient, hasValidOmsIdentity } = evaluateOmsCompliance(data, patient);
	if (isOmsInvoice && (isAnonPatient || !hasValidOmsIdentity)) {
		reply.code(422).send({
			error: "Decree659OmsForbiddenError",
			message: "Для формирования счетов по программе обязательного страхования (ОМС) требуется идентификация пациента (паспортные данные, СНИЛС и номер полиса).",
		});
		return null;
	}

	const approvedPlans = await db
		.select({ id: treatmentPlans.id })
		.from(treatmentPlans)
		.where(and(eq(treatmentPlans.organizationId, orgId), eq(treatmentPlans.patientId, data.patientId), eq(treatmentPlans.status, "Approved")));
	const approvedPlanIds = approvedPlans.map((p) => p.id);

	const planItems =
		approvedPlanIds.length > 0
			? await db
					.select({ priceId: treatmentPlanItemsNew.priceId })
					.from(treatmentPlanItemsNew)
					.where(and(eq(treatmentPlanItemsNew.organizationId, orgId), inArray(treatmentPlanItemsNew.planId, approvedPlanIds)))
			: [];

	const [addendumDoc] = await db
		.select({ id: generatedDocuments.id, totalAmountRub: generatedDocuments.totalAmountRub })
		.from(generatedDocuments)
		.where(and(eq(generatedDocuments.organizationId, orgId), eq(generatedDocuments.patientId, data.patientId), eq(generatedDocuments.kind, "treatment_plan_acceptance"), eq(generatedDocuments.status, "issued")))
		.limit(1);

	for (const item of data.items) {
		const isApproved = isServiceApprovedInPlanItems(item, planItems);
		if (!isApproved) {
			if (!addendumDoc && data.allowUnplannedServices === false) {
				reply.code(422).send({
					error: "UpsellConsentShieldViolationError",
					message: `Блокировка по Постановлению Правительства РФ №659 от 30.05.2026 и ст. 16 Закона РФ «О защите прав потребителей» (Защита от навязывания услуг): услуга «${item.nameRu}» не входит в утвержденный план лечения пациента. Формирование наряда/счета заблокировано до подписания Дополнительного соглашения.`,
				});
				return null;
			}
			request.log.info({ item: item.nameRu }, "[Invoices] Unplanned service added by doctor/staff at chairside without blocking (Mandates 8e/8n)");
		}
	}

	let isAdminOverrideVerified = true;
	let adminStaffName = "Лечащий врач / Администратор";
	if (data.adminOverridePin) {
		const staffList = await db
			.select({ id: users.id, fullName: users.fullName, pinCodeHash: users.pinCodeHash, role: users.role })
			.from(users)
			.where(and(eq(users.organizationId, orgId), eq(users.isActive, true), isNotNull(users.pinCodeHash)));

		for (const staff of staffList) {
			if (staff.pinCodeHash && (await verifyCredential(data.adminOverridePin, staff.pinCodeHash))) {
				adminStaffName = staff.fullName || "Администратор";
				break;
			}
		}
	}

	return { patient, approvedPlanIds, isAdminOverrideVerified, adminStaffName };
}
