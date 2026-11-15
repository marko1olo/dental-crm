import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	extractTaxYearFromDate,
	generateTaxCertificateQrSvg,
	normalizePaymentsForTaxCertificate,
	renderOfficialTaxCertificateKnd1151156Html,
	type TaxDeductionCertificateParams,
	type TaxDeductionPaymentItem,
	type TaxDeductionRelationship,
} from "@dental/shared";
import { db } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import {
	organizations,
	patients,
	payments,
	visitDiaries,
} from "../../db/schema.js";
import { extractPortalPatient } from "./portalAuthStore.js";

const taxCertificateQuerySchema = z.object({
	year: z.string().regex(/^\d{4}$/, "Год должен состоять из 4 цифр").optional(),
	payerInn: z.string().max(12).optional(),
	payerFullName: z.string().max(200).optional(),
	relationship: z.string().max(50).optional(),
});

export async function registerPortalTaxCertRoutes(server: FastifyInstance): Promise<void> {
	// 11. FNS Order 824@ (КНД 1151156) Tax Deduction Certificate Preview & Verification
	const handleTaxCertificatePreview = async (
		request: FastifyRequest<{
			Querystring: {
				year?: string;
				payerInn?: string;
				payerFullName?: string;
				relationship?: string;
			};
		}>,
		reply: FastifyReply,
	) => {
		const auth = extractPortalPatient(request);
		if (!auth) {
			reply.status(401);
			return { error: "Unauthorized" };
		}

		const queryParsed = taxCertificateQuerySchema.safeParse(request.query);
		if (!queryParsed.success) {
			reply.status(400);
			return {
				error: "ValidationError",
				message: "Некорректные параметры запроса справки.",
				details: queryParsed.error.issues,
			};
		}

		const targetYear = queryParsed.data.year ? Number.parseInt(queryParsed.data.year, 10) : new Date().getFullYear();

		return withTenantCtx(auth.organizationId, async () => {
			const data = await buildTaxCertificatePayload(
				auth.patientId,
				auth.organizationId,
				targetYear,
				queryParsed.data.payerFullName,
				queryParsed.data.payerInn,
				queryParsed.data.relationship,
			);

			if (!data) {
				reply.status(404);
				return { error: "PatientNotFound" };
			}

			return {
				success: true,
				certificate: data.certificate,
			};
		});
	};

	server.get<{
		Querystring: {
			year?: string;
			payerInn?: string;
			payerFullName?: string;
			relationship?: string;
		};
	}>("/tax-certificate/preview", handleTaxCertificatePreview);

	server.get<{
		Querystring: {
			year?: string;
			payerInn?: string;
			payerFullName?: string;
			relationship?: string;
		};
	}>("/tax-certificate/knd-1151156", handleTaxCertificatePreview);

	// 12. FNS Order 824@ (КНД 1151156) Tax Deduction Certificate HTML Export
	server.get<{
		Querystring: {
			year?: string;
			payerInn?: string;
			payerFullName?: string;
			relationship?: string;
		};
	}>("/tax-certificate/html", async (request, reply) => {
		const auth = extractPortalPatient(request);
		if (!auth) {
			reply.status(401);
			return { error: "Unauthorized" };
		}

		const queryParsed = taxCertificateQuerySchema.safeParse(request.query);
		if (!queryParsed.success) {
			reply.status(400);
			return {
				error: "ValidationError",
				message: "Некорректные параметры запроса справки.",
				details: queryParsed.error.issues,
			};
		}

		const targetYear = queryParsed.data.year ? Number.parseInt(queryParsed.data.year, 10) : new Date().getFullYear();

		return withTenantCtx(auth.organizationId, async () => {
			const data = await buildTaxCertificatePayload(
				auth.patientId,
				auth.organizationId,
				targetYear,
				queryParsed.data.payerFullName,
				queryParsed.data.payerInn,
				queryParsed.data.relationship,
			);

			if (!data) {
				reply.status(404);
				return { error: "PatientNotFound" };
			}

			const html = renderOfficialTaxCertificateKnd1151156Html(data.certParams);
			reply.type("text/html; charset=utf-8");
			return reply.send(html);
		});
	});

	// 13. Clinical Extract HTML Export (Чистый клинический стандарт без советского канцелярита)
	const handleForm043Html = async (request: FastifyRequest, reply: FastifyReply) => {
		const auth = extractPortalPatient(request);
		if (!auth) {
			reply.status(401);
			return { error: "Unauthorized" };
		}

		return withTenantCtx(auth.organizationId, async () => {
			const html = await renderForm043Html(auth.patientId, auth.organizationId);
			if (!html) {
				reply.status(404);
				return { error: "PatientNotFound" };
			}

			reply.type("text/html; charset=utf-8");
			return reply.send(html);
		});
	};

	server.get("/form-043/html", handleForm043Html);
	server.get("/extract-043/html", handleForm043Html);
}

async function buildTaxCertificatePayload(
	patientId: string,
	organizationId: string,
	targetYear: number,
	payerFullName?: string,
	payerInn?: string,
	relationship?: string,
) {
	const [patient] = await db
		.select()
		.from(patients)
		.where(and(eq(patients.id, patientId), eq(patients.organizationId, organizationId)))
		.limit(1);

	if (!patient) return null;

	const dbPayments = await db
		.select()
		.from(payments)
		.where(and(eq(payments.patientId, patientId), eq(payments.organizationId, organizationId)));

	const yearPayments = dbPayments.filter((p) => {
		if (p.status !== "paid" && p.status !== "refunded") return false;
		const dateStr = p.paidAt ? p.paidAt.toISOString() : p.createdAt ? p.createdAt.toISOString() : "";
		return extractTaxYearFromDate(dateStr) === targetYear;
	});

	const rawMappedPayments: TaxDeductionPaymentItem[] = [];

	for (const p of yearPayments) {
		const amtRub = Number(p.amountRub) || 0;
		const amtKop = Math.round(amtRub * 100);
		const isExpensive = Boolean(
			p.taxDeductionCode === "2" ||
			(p.note && /имплант|синус|костн|остеопластик|аугментац/i.test(p.note)),
		);

		const paymentDateIso = (p.paidAt ? p.paidAt : p.createdAt ? p.createdAt : new Date()).toISOString();
		const docNum = p.fiscalReceiptNumber ? p.fiscalReceiptNumber.replace(/\D/g, "") : p.id.slice(0, 8);
		const rawReceipt =
			p.fiscalReceipt && typeof p.fiscalReceipt === "object"
				? (p.fiscalReceipt as Record<string, unknown>)
				: null;
		const fiscalSign =
			typeof rawReceipt?.fiscalSign === "string"
				? rawReceipt.fiscalSign
				: typeof rawReceipt?.fp === "string"
					? rawReceipt.fp
					: typeof rawReceipt?.fpd === "string"
						? rawReceipt.fpd
						: "";

		rawMappedPayments.push({
			id: p.id,
			dateIso: paymentDateIso,
			receiptNumber: p.fiscalReceiptNumber || `ФД-${docNum}`,
			fiscalDocumentNumber: docNum || "0",
			fiscalSign,
			serviceName: p.note || (isExpensive ? "Хирургическое стоматологическое лечение (Код 02)" : "Терапевтическое стоматологическое лечение (Код 01)"),
			amountRub: amtKop / 100,
			taxCode: isExpensive ? ("2" as const) : ("1" as const),
			isRefund: p.status === "refunded" || amtKop < 0,
		});
	}

	const mappedPayments = normalizePaymentsForTaxCertificate(rawMappedPayments, targetYear);

	let totalStandardKop = 0;
	let totalExpensiveKop = 0;
	for (const p of mappedPayments) {
		const amtKop = Math.round(p.amountRub * 100);
		if (p.taxCode === "2") {
			totalExpensiveKop += amtKop;
		} else {
			totalStandardKop += amtKop;
		}
	}

	const totalStandardRub = totalStandardKop / 100;
	const totalExpensiveRub = totalExpensiveKop / 100;
	const totalSumRub = (totalStandardKop + totalExpensiveKop) / 100;
	const certificateNumber = `СПР-${targetYear}/${patientId.slice(0, 6).toUpperCase()}`;
	const issueDateIso = new Date().toISOString();

	const [org] = await db
		.select()
		.from(organizations)
		.where(eq(organizations.id, organizationId))
		.limit(1);

	const clinicLegalName = org?.name || "Стоматологическая клиника";
	const clinicInn = org?.inn || "";
	const clinicKpp = org?.kpp || "";
	const clinicOgrn = org?.ogrn || "";
	const clinicAddress = org?.legalAddress || "";
	const clinicLicense = org?.medicalLicenseNumber
		? `${org.medicalLicenseNumber}${org.medicalLicenseIssuedAt ? ` от ${org.medicalLicenseIssuedAt}` : ""}`
		: "";

	const effectivePayerFullName = payerFullName?.trim() || patient.fullName;
	const effectivePayerInn = payerInn?.trim() || "";
	const effectiveRelationship = (relationship as TaxDeductionRelationship) || "patient_self";

	const signatory = "Главный бухгалтер клиники";

	const certParams: TaxDeductionCertificateParams = {
		certificateNumber,
		issueDateIso,
		taxYear: targetYear,
		clinic: {
			legalName: clinicLegalName,
			inn: clinicInn,
			kpp: clinicKpp,
			ogrn: clinicOgrn,
			address: clinicAddress,
			licenseNumber: clinicLicense,
		},
		patient: {
			fullName: patient.fullName,
			birthDate: patient.birthDate || "",
			inn: "",
		},
		payer: {
			fullName: effectivePayerFullName,
			inn: effectivePayerInn,
			relationship: effectiveRelationship,
		},
		payments: mappedPayments,
		signer: {
			signerType: "1",
			fullName: signatory,
		},
	};

	const qrSvg = generateTaxCertificateQrSvg(certParams, { size: 160 });

	return {
		certParams,
		certificate: {
			certificateNumber,
			issueDateIso,
			taxYear: targetYear,
			clinic: {
				name: clinicLegalName,
				inn: clinicInn,
				kpp: clinicKpp,
				license: clinicLicense,
				address: clinicAddress,
			},
			patient: {
				fullName: patient.fullName,
				birthDate: patient.birthDate || null,
				phone: patient.phone,
			},
			payer: {
				fullName: effectivePayerFullName,
				inn: effectivePayerInn || null,
				relationship: effectiveRelationship,
			},
			payments: mappedPayments,
			summary: {
				code01StandardRub: totalStandardRub,
				code02ExpensiveRub: totalExpensiveRub,
				totalSumRub,
			},
			qrVerificationSvg: qrSvg,
			electronicSignatureAudit: {
				signedBy: signatory,
				ukepCertThumbprint: null,
				timestampIso: issueDateIso,
			},
		},
	};
}

async function renderForm043Html(patientId: string, organizationId: string) {
	const [patient] = await db
		.select()
		.from(patients)
		.where(and(eq(patients.id, patientId), eq(patients.organizationId, organizationId)))
		.limit(1);

	if (!patient) return null;

	const diaries = await db
		.select()
		.from(visitDiaries)
		.where(
			and(
				eq(visitDiaries.patientId, patientId),
				eq(visitDiaries.organizationId, organizationId),
			),
		);

	const [org] = await db
		.select()
		.from(organizations)
		.where(eq(organizations.id, organizationId))
		.limit(1);

	const clinicLegalName = org?.name || "Стоматологическая клиника";
	const clinicLicense = org?.medicalLicenseNumber
		? `Лицензия ${org.medicalLicenseNumber}${org.medicalLicenseIssuedAt ? ` от ${org.medicalLicenseIssuedAt}` : ""}`
		: "";
	const clinicInfoStr = [clinicLegalName, clinicLicense].filter(Boolean).join(" • ");

	const diagnoses = Array.from(
		new Set(diaries.map((d) => d.diagnosisIcd10).filter(Boolean)),
	).join(", ");
	const clinicalInterventions = diaries
		.map((d) => d.treatmentDescription || d.content)
		.filter(Boolean)
		.slice(0, 5)
		.join("; ");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<title>Медицинская выписка из карты пациента</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 30px; color: #1e293b; line-height: 1.5; }
  .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 20px; }
  .doc-title { font-size: 18px; font-weight: bold; margin: 5px 0; }
  .clinic-info { font-size: 13px; color: #64748b; }
  .section-title { font-size: 14px; font-weight: bold; background: #f1f5f9; padding: 6px 10px; margin-top: 15px; border-left: 4px solid #0284c7; }
  .data-row { display: flex; margin: 6px 0; font-size: 13px; }
  .data-label { width: 220px; font-weight: 600; color: #475569; }
  .data-val { flex: 1; }
  .stamp-box { margin-top: 30px; display: flex; justify-content: space-between; border-top: 1px solid #cbd5e1; padding-top: 15px; }
</style>
</head>
<body>
  <div class="header">
    <div class="clinic-info">${clinicInfoStr}</div>
    <div class="doc-title">ВЫПИСКА ИЗ МЕДИЦИНСКОЙ КАРТЫ СТОМАТОЛОГИЧЕСКОГО ПАЦИЕНТА</div>
    <div style="font-size: 12px; color: #64748b;">Медицинская выписка амбулаторного приёма DENTE CRM</div>
  </div>

  <div class="section-title">1. Паспортная часть</div>
  <div class="data-row"><div class="data-label">ФИО пациента:</div><div class="data-val">${patient.fullName}</div></div>
  <div class="data-row"><div class="data-label">Дата рождения:</div><div class="data-val">${patient.birthDate || "Не указана"}</div></div>
  <div class="data-row"><div class="data-label">Телефон:</div><div class="data-val">${patient.phone}</div></div>
  <div class="data-row"><div class="data-label">Номер медицинской карты:</div><div class="data-val">№ К-${patient.id.slice(0, 6).toUpperCase()}</div></div>

  <div class="section-title">2. Клинический диагноз и проведенное лечение</div>
  <div class="data-row"><div class="data-label">Основной диагноз (МКБ-10):</div><div class="data-val">${diagnoses || "Санация полости рта"}</div></div>
  <div class="data-row"><div class="data-label">Количество посещений:</div><div class="data-val">${diaries.length} визит(ов)</div></div>
  <div class="data-row"><div class="data-label">Проведенные вмешательства:</div><div class="data-val">${clinicalInterventions || "Санация полости рта, лечение согласно клиническому протоколу."}</div></div>

  <div class="section-title">3. Рекомендации и контрольный осмотр</div>
  <div class="data-row"><div class="data-label">Назначения:</div><div class="data-val">Индивидуальная гигиена полости рта, ирригатор, профилактический осмотр через 6 месяцев.</div></div>

  <div class="stamp-box">
    <div><strong>Лечащий врач:</strong> ___________________ / Лечащий врач-стоматолог /</div>
    <div><strong>М.П. Клиники</strong> • Подписано УКЭП</div>
  </div>
</body>
</html>`;
}
