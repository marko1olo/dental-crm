import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import {
	implantIsqMeasurements,
	organizations,
	patientImplantInstallations,
	patients,
	users,
} from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import { auditMedicalAccessFromRequest } from "../../security/medicalAuditTrail.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";

const paramsSchema = z.object({
	installationId: z.string().uuid(),
});

export function registerPassportRoute(app: FastifyInstance) {
	const handlePassport = async (request: FastifyRequest<{ Params: { installationId: string } }>, reply: FastifyReply) => {
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
				message: `Отказ в доступе к паспорту имплантата (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
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
		const [installation] = await db
			.select()
			.from(patientImplantInstallations)
			.where(and(eq(patientImplantInstallations.id, installationId), eq(patientImplantInstallations.organizationId, orgId)))
			.limit(1);

		if (!installation) {
			return reply.code(404).send({ error: "ImplantInstallationNotFound", message: "Паспорт имплантата не найден." });
		}

		const [patient] = await db
			.select()
			.from(patients)
			.where(and(eq(patients.id, installation.patientId), eq(patients.organizationId, orgId)))
			.limit(1);

		let doctorName = "Хирург-имплантолог";
		if (installation.surgeonDoctorId) {
			const [doc] = await db
				.select()
				.from(users)
				.where(and(eq(users.id, installation.surgeonDoctorId), eq(users.organizationId, orgId)))
				.limit(1);
			if (doc) doctorName = doc.fullName;
		}

		const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
		const isqHistory = await db
			.select()
			.from(implantIsqMeasurements)
			.where(and(eq(implantIsqMeasurements.installationId, installationId), eq(implantIsqMeasurements.organizationId, orgId)))
			.orderBy(implantIsqMeasurements.daysPostOp);

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
		} catch {
			// fallback
		}

		const passportData = {
			passportId: `IMP-PASSPORT-${installation.toothNumberFdi}-${installation.id.slice(0, 8).toUpperCase()}`,
			installationId: installation.id,
			toothFdi: installation.toothNumberFdi,
			installedAt: installation.installedAt,
			implantBrand: installation.implantBrand,
			diameterMm: Number(installation.implantDiameterMm),
			lengthMm: Number(installation.implantLengthMm),
			lotNumber: installation.lotNumber,
			serialNumber: installation.serialNumber,
			boneDensityClass: installation.boneDensityClass,
			torqueNcm: Number(installation.finalInsertionTorqueNcm),
			baselineIsq: installation.baselineIsq,
			protocol: installation.initialProtocol,
			graftMaterial: installation.boneGraftMaterial,
			membraneUsed: installation.membraneUsed,
			clinicName: org?.name ?? "Стоматологическая клиника DENTE",
			patientName: patient?.fullName ?? "Пациент",
			patientCardNumber: patient?.id?.slice(0, 8) ?? "CARD-01",
			doctorName,
			qrVerificationUrl: `https://dente.clinic/passport/${installation.id}`,
			isqHistory,
			financials: parsedNotes.financials ?? null,
			deductedMaterials: parsedNotes.deductedMaterials ?? [],
		};

		return reply.send({ success: true, passport: passportData });
	};

	app.get("/api/clinical/implants/:installationId/passport", handlePassport);
	app.get("/api/v1/surgery/implants/:installationId/passport", handlePassport);
	app.get("/api/surgery/implants/:installationId/passport", handlePassport);
}
