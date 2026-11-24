import { and, eq, inArray } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	classifyNdflServiceCode,
	classifyTaxDeduction804n,
	extractTaxYearFromDate,
	generateTaxCertificateQrSvg,
	kopecksToRubles,
	normalizePaymentsForTaxCertificate,
	parseKopecks,
	renderOfficialTaxCertificateKnd1151156Html,
	type TaxDeductionCertificateParams,
	type TaxDeductionPaymentItem,
	type TaxDeductionRelationship,
} from "@dental/shared";
import type { TenantDb } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import {
	generatedDocuments,
	organizations,
	patientRelationships,
	patients,
	payments,
	users,
	visitDiaries,
} from "../../db/schema.js";
import { escapeHtml } from "../../documents/renderDocument.js";
import { TaxPayerRequisitesRequiredError } from "../../services/documents/ndflTaxService.js";
import { buildPdfContentDispositionHeader } from "../documents/pdf.js";
import { renderIssuedHtmlToPdf } from "../documents/shared.js";
import { extractPortalPatient } from "./portalAuthStore.js";

const taxCertificateQuerySchema = z
	.object({
		year: z.string().regex(/^\d{4}$/, "Год должен состоять из 4 цифр").optional(),
		payerInn: z
			.string()
			.trim()
			.regex(/^(\d{10}|\d{12})?$/, "ИНН должен содержать 10 или 12 цифр")
			.optional(),
		payerFullName: z.string().trim().max(200).optional(),
		relationship: z
			.enum(["patient", "patient_self", "spouse", "parent", "child"])
			.optional(),
	})
	.strict();

function sendTaxPayerRequisitesError(reply: FastifyReply, err: unknown): boolean {
	const errCode = err !== null && typeof err === "object" ? Reflect.get(err, "code") : undefined;
	const isRequisitesErr =
		err instanceof TaxPayerRequisitesRequiredError ||
		errCode === "TaxPayerRequisitesRequiredError" ||
		errCode === "TaxDeductionIdentificationRequiredError";
	if (!isRequisitesErr) return false;
	reply.status(422).send({
		error: "TaxPayerRequisitesRequiredError",
		message:
			err instanceof Error
				? err.message
				: "Для оформления справки по форме КНД 1151156 в соответствии со ст. 219 НК РФ требуются паспортные данные и ИНН налогоплательщика.",
	});
	return true;
}

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

		return withTenantCtx(auth.organizationId, async (tx) => {
			try {
				const data = await buildTaxCertificatePayload(
					tx,
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
			} catch (err) {
				if (sendTaxPayerRequisitesError(reply, err)) return;
				throw err;
			}
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

	// Канонический медицинский эндпоинт скачивания справки для налогового вычета
	const handleTaxCertificateExport = async (
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

		return withTenantCtx(auth.organizationId, async (tx) => {
			try {
				const data = await buildTaxCertificatePayload(
					tx,
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
			} catch (err) {
				if (sendTaxPayerRequisitesError(reply, err)) return;
				throw err;
			}
		});
	};

	server.get<{
		Querystring: {
			year?: string;
			payerInn?: string;
			payerFullName?: string;
			relationship?: string;
		};
	}>("/tax-certificate/download", handleTaxCertificateExport);

	server.get<{
		Querystring: {
			year?: string;
			payerInn?: string;
			payerFullName?: string;
			relationship?: string;
		};
	}>("/tax-certificate/html", handleTaxCertificateExport);

	// Канонический медицинский эндпоинт генерации и скачивания PDF справки для ЛК Налогоплательщика (ФНС)
	const handleTaxCertificatePdf = async (
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

		let data: Awaited<ReturnType<typeof buildTaxCertificatePayload>> = null;
		try {
			data = await withTenantCtx(auth.organizationId, async (tx) => {
				return buildTaxCertificatePayload(
					tx,
					auth.patientId,
					auth.organizationId,
					targetYear,
					queryParsed.data.payerFullName,
					queryParsed.data.payerInn,
					queryParsed.data.relationship,
				);
			});
		} catch (err) {
			if (sendTaxPayerRequisitesError(reply, err)) return;
			throw err;
		}

		if (!data) {
			reply.status(404);
			return { error: "PatientNotFound" };
		}

		const html = renderOfficialTaxCertificateKnd1151156Html(data.certParams);
		const result = await renderIssuedHtmlToPdf(html);
		if (!result.ok) {
			reply.status(503);
			return { error: "PdfRenderFailed", message: result.error };
		}

		const filename = `tax-certificate-${targetYear}-${auth.patientId.slice(0, 8)}.pdf`;
		return reply
			.header("Content-Disposition", buildPdfContentDispositionHeader(filename, filename))
			.type("application/pdf")
			.send(result.pdf);
	};

	server.get<{
		Querystring: {
			year?: string;
			payerInn?: string;
			payerFullName?: string;
			relationship?: string;
		};
	}>("/tax-certificate/pdf", handleTaxCertificatePdf);

	// Алиас для обратной совместимости
	server.get<{
		Querystring: {
			year?: string;
			payerInn?: string;
			payerFullName?: string;
			relationship?: string;
		};
	}>("/tax-certificate/knd-1151156", handleTaxCertificatePreview);

	// 13. Clinical Extract HTML Export (Чистый клинический стандарт без советского канцелярита)
	const handleClinicalExtractHtml = async (request: FastifyRequest, reply: FastifyReply) => {
		const auth = extractPortalPatient(request);
		if (!auth) {
			reply.status(401);
			return { error: "Unauthorized" };
		}

		return withTenantCtx(auth.organizationId, async (tx) => {
			const html = await renderClinicalExtractHtml(tx, auth.patientId, auth.organizationId);
			if (!html) {
				reply.status(404);
				return { error: "PatientNotFound" };
			}

			reply.type("text/html; charset=utf-8");
			return reply.send(html);
		});
	};

	// Канонический медицинский роут
	server.get("/clinical-extract/html", handleClinicalExtractHtml);
	server.get("/clinical-extract/download", handleClinicalExtractHtml);
	server.get("/medical-card/html", handleClinicalExtractHtml);
	// Алиасы для обратной совместимости
	server.get("/form-043/html", handleClinicalExtractHtml);
	server.get("/extract-043/html", handleClinicalExtractHtml);
}

async function buildTaxCertificatePayload(
	tx: TenantDb,
	patientId: string,
	organizationId: string,
	targetYear: number,
	payerFullName?: string,
	payerInn?: string,
	relationship?: string,
) {
	const [patient] = await tx
		.select()
		.from(patients)
		.where(and(eq(patients.id, patientId), eq(patients.organizationId, organizationId)))
		.limit(1);

	if (!patient) return null;

	const adminProfile =
		patient.administrativeProfile && typeof patient.administrativeProfile === "object"
			? (patient.administrativeProfile as Record<string, unknown>)
			: null;
	const isAnonymousPatient =
		Boolean((patient as { isAnonymous?: unknown }).isAnonymous) ||
		Boolean(adminProfile?.isAnonymous) ||
		Boolean(patient.fullName?.startsWith("UUID_ANON")) ||
		Boolean(patient.fullName?.toLowerCase().includes("аноним"));
	if (isAnonymousPatient) {
		throw new TaxPayerRequisitesRequiredError(
			"Для оформления справки по форме КНД 1151156 в соответствии со ст. 219 НК РФ требуются паспортные данные и ИНН налогоплательщика.",
		);
	}

	// Поддержка семейных справок для налогового вычета (Приказ ФНС РФ № ЕА-7-11/824@):
	// Только подтверждённый плательщик или законный представитель может включать платежи подопечного.
	let targetPatientIds = [patientId];
	if (relationship && relationship !== "patient" && relationship !== "patient_self") {
		const relRows = await tx
			.select({
				relatedPatientId: patientRelationships.relatedPatientId,
				isLegalRepresentative: patientRelationships.isLegalRepresentative,
				isPrimaryPayer: patientRelationships.isPrimaryPayer,
			})
			.from(patientRelationships)
			.where(
				and(
					eq(patientRelationships.organizationId, organizationId),
					eq(patientRelationships.patientId, patientId),
				),
			);

		const authorizedRelatedIds = relRows
			.filter((r) => r.isPrimaryPayer || r.isLegalRepresentative)
			.map((r) => r.relatedPatientId);
		if (authorizedRelatedIds.length > 0) {
			targetPatientIds = Array.from(new Set([patientId, ...authorizedRelatedIds]));
		}
	}

	const dbPayments = await tx
		.select()
		.from(payments)
		.where(
			and(
				targetPatientIds.length === 1
					? eq(payments.patientId, patientId)
					: inArray(payments.patientId, targetPatientIds),
				eq(payments.organizationId, organizationId),
			),
		);

	const yearPayments = dbPayments.filter((p) => {
		if (p.status !== "paid" && p.status !== "refunded") return false;
		const dateStr = p.paidAt ? p.paidAt.toISOString() : p.createdAt ? p.createdAt.toISOString() : "";
		return extractTaxYearFromDate(dateStr) === targetYear;
	});

	const rawMappedPayments: TaxDeductionPaymentItem[] = [];

	for (const p of yearPayments) {
		const rawAmountKopecks = "amountKopecks" in p ? (p as { amountKopecks?: unknown }).amountKopecks : undefined;
		const nonZeroKopecks =
			typeof rawAmountKopecks === "bigint" && rawAmountKopecks !== 0n
				? Number(rawAmountKopecks)
				: typeof rawAmountKopecks === "number" && rawAmountKopecks !== 0
					? Math.round(rawAmountKopecks)
					: null;
		const parsedKop = nonZeroKopecks ?? parseKopecks(p.amountRub);

		const isRefundRecord =
			p.status === "refunded" ||
			("paymentMethod" in p && (p as { paymentMethod?: unknown }).paymentMethod === "refund") ||
			("type" in p && (p as { type?: unknown }).type === "refund") ||
			parsedKop < 0;

		const amtKop = isRefundRecord ? -Math.abs(parsedKop) : Math.abs(parsedKop);

		const rawNote = p.note?.trim() || undefined;
		const code804nCandidate = rawNote && /^[A-B]\d{2}\.\d{2}\.\d{3}/i.test(rawNote) ? rawNote : undefined;
		const isExpensive = Boolean(
			p.taxDeductionCode === "2" ||
			classifyTaxDeduction804n(code804nCandidate, rawNote).categoryCode === "2" ||
			classifyNdflServiceCode(rawNote, code804nCandidate) === "2",
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
			amountRub: kopecksToRubles(amtKop),
			amountKopecks: amtKop,
			taxCode: isExpensive ? ("2" as const) : ("1" as const),
			status: isRefundRecord ? ("refunded" as const) : ("paid" as const),
			isRefund: isRefundRecord,
		});
	}

	const mappedPayments = normalizePaymentsForTaxCertificate(rawMappedPayments, targetYear);

	let totalStandardKopBi = 0n;
	let totalExpensiveKopBi = 0n;
	for (const p of mappedPayments) {
		const amtKop = BigInt(p.amountKopecks ?? parseKopecks(p.amountRub));
		if (p.taxCode === "2") {
			totalExpensiveKopBi += amtKop;
		} else {
			totalStandardKopBi += amtKop;
		}
	}

	const totalStandardRub = kopecksToRubles(totalStandardKopBi);
	const totalExpensiveRub = kopecksToRubles(totalExpensiveKopBi);
	const totalSumRub = kopecksToRubles(totalStandardKopBi + totalExpensiveKopBi);
	const certificateNumber = `СПР-${targetYear}/${patientId.slice(0, 6).toUpperCase()}`;
	const issueDateIso = new Date().toISOString();

	const [org] = await tx
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
	const effectiveRelationship: TaxDeductionRelationship =
		relationship === "spouse" || relationship === "parent" || relationship === "child"
			? relationship
			: "patient";

	let signatory = org?.signatoryName?.trim() || "";
	if (!signatory) {
		const [adminOrDoctor] = await tx
			.select({ fullName: users.fullName })
			.from(users)
			.where(
				and(
					eq(users.organizationId, organizationId),
					inArray(users.role, ["admin", "chief_doctor", "doctor"]),
				),
			)
			.limit(1);
		signatory = adminOrDoctor?.fullName?.trim() || org?.signatoryTitle?.trim() || "Руководитель клиники";
	}

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

	// HTTP GET-эндпоинты обязаны оставаться строго read-only без мутации БД и записи файлов на диск
	const [existingDoc] = await tx
		.select({ id: generatedDocuments.id })
		.from(generatedDocuments)
		.where(
			and(
				eq(generatedDocuments.organizationId, organizationId),
				eq(generatedDocuments.patientId, patientId),
				eq(generatedDocuments.kind, "tax_deduction_certificate"),
				eq(generatedDocuments.taxYear, targetYear),
			),
		)
		.limit(1);

	const documentId = existingDoc?.id ?? null;

	return {
		certParams,
		certificate: {
			documentId,
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

async function renderClinicalExtractHtml(tx: TenantDb, patientId: string, organizationId: string) {
	const [patient] = await tx
		.select()
		.from(patients)
		.where(and(eq(patients.id, patientId), eq(patients.organizationId, organizationId)))
		.limit(1);

	if (!patient) return null;

	const diaries = await tx
		.select()
		.from(visitDiaries)
		.where(
			and(
				eq(visitDiaries.patientId, patientId),
				eq(visitDiaries.organizationId, organizationId),
			),
		);

	const [org] = await tx
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

	const safeClinicInfo = escapeHtml(clinicInfoStr);
	const safePatientName = escapeHtml(patient.fullName);
	const safeBirthDate = escapeHtml(patient.birthDate || "Не указана");
	const safePhone = escapeHtml(patient.phone);
	const safeCardNum = escapeHtml(patient.id.slice(0, 6).toUpperCase());
	const safeDiagnoses = escapeHtml(diagnoses || "Санация полости рта");
	const safeInterventions = escapeHtml(
		clinicalInterventions || "Санация полости рта, лечение согласно клиническому протоколу.",
	);

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
    <div class="clinic-info">${safeClinicInfo}</div>
    <div class="doc-title">ВЫПИСКА ИЗ МЕДИЦИНСКОЙ КАРТЫ СТОМАТОЛОГИЧЕСКОГО ПАЦИЕНТА</div>
    <div style="font-size: 12px; color: #64748b;">Медицинская выписка амбулаторного приёма DENTE CRM</div>
  </div>

  <div class="section-title">1. Паспортная часть</div>
  <div class="data-row"><div class="data-label">ФИО пациента:</div><div class="data-val">${safePatientName}</div></div>
  <div class="data-row"><div class="data-label">Дата рождения:</div><div class="data-val">${safeBirthDate}</div></div>
  <div class="data-row"><div class="data-label">Телефон:</div><div class="data-val">${safePhone}</div></div>
  <div class="data-row"><div class="data-label">Номер медицинской карты:</div><div class="data-val">№ К-${safeCardNum}</div></div>

  <div class="section-title">2. Клинический диагноз и проведенное лечение</div>
  <div class="data-row"><div class="data-label">Основной диагноз (МКБ-10):</div><div class="data-val">${safeDiagnoses}</div></div>
  <div class="data-row"><div class="data-label">Количество посещений:</div><div class="data-val">${diaries.length} визит(ов)</div></div>
  <div class="data-row"><div class="data-label">Проведенные вмешательства:</div><div class="data-val">${safeInterventions}</div></div>

  <div class="section-title">3. Рекомендации и контрольный осмотр</div>
  <div class="data-row"><div class="data-label">Назначения:</div><div class="data-val">Индивидуальная гигиена полости рта, ирригатор, профилактический осмотр через 6 месяцев.</div></div>

  <div class="stamp-box">
    <div><strong>Лечащий врач:</strong> ___________________ / Лечащий врач-стоматолог /</div>
    <div><strong>М.П. Клиники</strong> • Подписано УКЭП</div>
  </div>
</body>
</html>`;
}
