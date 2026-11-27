import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { defineStreamRoute } from "../../core/routeFactories.js";
import { withTenantReadCtx } from "../../db/rls.js";
import {
	implantIsqMeasurements,
	organizations,
	patientImplantInstallations,
	patients,
	users,
	warrantyCertificates,
} from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import { auditMedicalAccessFromRequest } from "../../security/medicalAuditTrail.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";

const paramsSchema = z
	.object({
		installationId: z.string().uuid(),
	})
	.strict();

const SAFE_HOST_RE = /^[a-zA-Z0-9.-]+(?::\d{1,5})?$/;

function resolveSafePublicOrigin(request: FastifyRequest, orgWebsite?: string | null): string {
	if (orgWebsite) {
		try {
			const parsed = new URL(orgWebsite.trim());
			if (parsed.protocol === "http:" || parsed.protocol === "https:") {
				return parsed.origin;
			}
		} catch {
			// Invalid org.website falls through to configured PUBLIC_APP_URL or sanitized request host
		}
	}

	const configuredOrigin = process.env.PUBLIC_APP_URL?.trim();
	if (configuredOrigin) {
		try {
			const parsed = new URL(configuredOrigin);
			if (parsed.protocol === "http:" || parsed.protocol === "https:") {
				return parsed.origin;
			}
		} catch {
			// Invalid PUBLIC_APP_URL falls through to sanitized request host
		}
	}

	const trustProxy = process.env.TRUST_PROXY === "1" || process.env.TRUST_PROXY === "true";
	const rawProto = trustProxy
		? (request.headers["x-forwarded-proto"] as string | undefined)?.split(",")[0]?.trim()
		: request.protocol;
	const proto = rawProto === "https" ? "https" : "http";

	const forwardedHost = trustProxy
		? (request.headers["x-forwarded-host"] as string | undefined)?.split(",")[0]?.trim()
		: undefined;
	const rawHost = forwardedHost && SAFE_HOST_RE.test(forwardedHost) ? forwardedHost : request.headers.host?.trim();
	const safeHost = rawHost && SAFE_HOST_RE.test(rawHost) ? rawHost : "localhost:3000";

	return `${proto}://${safeHost}`;
}

export function registerPassportRoute(app: FastifyInstance) {
	const handlePassport = async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

		const identity = getRequestIdentity(request);
		const staffRole = identity.role ?? request.user?.role ?? null;
		const evalAccess = evaluateClinicalAccess(staffRole);
		if (!evalAccess.hasClinicalAccess) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.implants.read",
				role: staffRole,
				message: `Отказ в доступе к паспорту имплантата: ${evalAccess.reason}`,
			});
		}

		const parsedParams = paramsSchema.safeParse(request.params);
		if (!parsedParams.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный идентификатор установки имплантата (ожидается UUID).",
				details: parsedParams.error.format(),
			});
		}

		const { installationId } = parsedParams.data;
		const passportDbResult = await withTenantReadCtx(orgId, async (tx) => {
			const [installation] = await tx
				.select()
				.from(patientImplantInstallations)
				.where(and(eq(patientImplantInstallations.id, installationId), eq(patientImplantInstallations.organizationId, orgId)))
				.limit(1);

			if (!installation) {
				return null;
			}

			const [patient] = await tx
				.select()
				.from(patients)
				.where(and(eq(patients.id, installation.patientId), eq(patients.organizationId, orgId)))
				.limit(1);

			let doctorName = "Хирург-имплантолог";
			if (installation.surgeonDoctorId) {
				const [doc] = await tx
					.select()
					.from(users)
					.where(and(eq(users.id, installation.surgeonDoctorId), eq(users.organizationId, orgId)))
					.limit(1);
				if (doc) doctorName = doc.fullName;
			}

			const [org] = await tx.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
			const isqHistory = await tx
				.select()
				.from(implantIsqMeasurements)
				.where(and(eq(implantIsqMeasurements.installationId, installationId), eq(implantIsqMeasurements.organizationId, orgId)))
				.orderBy(implantIsqMeasurements.daysPostOp);

			const canonicalPassportId = `IMP-PASSPORT-${installation.toothNumberFdi}-${installation.id.slice(0, 8).toUpperCase()}`;
			const [certificate] = await tx
				.select()
				.from(warrantyCertificates)
				.where(
					and(
						eq(warrantyCertificates.certificateNumber, canonicalPassportId),
						eq(warrantyCertificates.organizationId, orgId),
					),
				)
				.limit(1);

			return { installation, patient, doctorName, org, isqHistory, canonicalPassportId, certificate };
		});

		if (!passportDbResult) {
			return reply.code(404).send({ error: "ImplantInstallationNotFound", message: "Паспорт имплантата не найден." });
		}

		const { installation, patient, doctorName, org, isqHistory, canonicalPassportId, certificate } = passportDbResult;

		await auditMedicalAccessFromRequest(request, {
			organizationId: orgId,
			patientId: installation.patientId,
			action: "VIEW_IMPLANT_PASSPORT",
			diagnosis: "Имплантологический паспорт",
		});

		let parsedNotes: Record<string, unknown> = {};
		try {
			if (installation.notes && installation.notes.startsWith("{")) {
				parsedNotes = JSON.parse(installation.notes);
			}
		} catch (err) {
			request.log.warn({ err, installationId }, "[passportRoute] Failed to parse legacy JSON notes");
		}

		const rawFinancials = (installation.financialsJsonb as Record<string, unknown> | null) ?? null;
		const financialsObj =
			rawFinancials && "financials" in rawFinancials
				? rawFinancials.financials
				: (rawFinancials ?? parsedNotes.financials ?? null);
		const deductedMaterials =
			rawFinancials && "deductedMaterials" in rawFinancials && Array.isArray(rawFinancials.deductedMaterials)
				? rawFinancials.deductedMaterials
				: (Array.isArray(parsedNotes.deductedMaterials) ? parsedNotes.deductedMaterials : []);

		const baseSite = resolveSafePublicOrigin(request, org?.website);
		const qrVerificationUrl = `${baseSite}/#/portal/warranty?cert=${canonicalPassportId}`;

		const adminProf = patient?.administrativeProfile as Record<string, unknown> | null;
		const rawCardNumber = typeof adminProf?.cardNumber === "string" ? adminProf.cardNumber.trim() : "";
		const patientCardNumber = rawCardNumber || (patient?.id ? `ЭМК-${patient.id.slice(0, 8).toUpperCase()}` : "CARD-01");

		const passportData = {
			passportId: canonicalPassportId,
			installationId: installation.id,
			toothFdi: installation.toothNumberFdi,
			installedAt: installation.installedAt,
			implantBrand: installation.implantBrand,
			connectionType: installation.connectionType ?? parsedNotes.connectionType ?? "internal_hex",
			diameterMm: Number(installation.implantDiameterMm),
			lengthMm: Number(installation.implantLengthMm),
			lotNumber: installation.lotNumber,
			serialNumber: installation.serialNumber,
			catalogArticle: installation.catalogArticle ?? parsedNotes.sku ?? null,
			sku: installation.catalogArticle ?? parsedNotes.sku ?? null,
			expirationDate: installation.expirationDate ?? parsedNotes.expirationDate ?? null,
			boneDensityClass: installation.boneDensityClass,
			torqueNcm: Number(installation.finalInsertionTorqueNcm),
			baselineIsq: installation.baselineIsq,
			protocol: installation.initialProtocol,
			graftMaterial: installation.boneGraftMaterial,
			membraneUsed: installation.membraneUsed,
			isGuidedSurgery: installation.isGuidedSurgery,
			guidedSleeveDiameterMm: installation.guidedSleeveDiameterMm ? Number(installation.guidedSleeveDiameterMm) : null,
			guidedSleeveOffsetMm: installation.guidedSleeveOffsetMm ? Number(installation.guidedSleeveOffsetMm) : null,
			surgicalGuideTemplateId: installation.surgicalGuideTemplateId ?? null,
			clinicName: org?.name ?? "Стоматологическая клиника DENTE",
			patientName: patient?.fullName ?? "Пациент",
			patientCardNumber,
			doctorName,
			qrVerificationUrl,
			isqHistory,
			warrantyCertificate: certificate ?? null,
			financials: financialsObj,
			deductedMaterials,
			notes:
				installation.notes && !installation.notes.startsWith("{")
					? installation.notes
					: ((parsedNotes.userNotes as string | undefined) ?? null),
		};

		return reply.send({ success: true, passport: passportData });
	};

	defineStreamRoute(app, {
		method: "GET",
		path: "/api/clinical/implants/:installationId/passport",
		permission: "public",
		handler: async ({ request, reply }) =>
			handlePassport(request, reply),
	});
}
