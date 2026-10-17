import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import {
	implantIsqMeasurements,
	organizations,
	patientImplantInstallations,
	patients,
	users,
} from "../../db/schema.js";

export function registerPassportRoute(app: FastifyInstance) {
	app.get("/api/clinical/implants/:installationId/passport", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

		const { installationId } = request.params as { installationId: string };
		const [installation] = await db
			.select()
			.from(patientImplantInstallations)
			.where(and(eq(patientImplantInstallations.id, installationId), eq(patientImplantInstallations.organizationId, orgId)))
			.limit(1);

		if (!installation) {
			return reply.code(404).send({ error: "ImplantInstallationNotFound", message: "Паспорт имплантата не найден." });
		}

		const [patient] = await db.select().from(patients).where(eq(patients.id, installation.patientId)).limit(1);
		let doctorName = "Хирург-имплантолог";
		if (installation.surgeonDoctorId) {
			const [doc] = await db.select().from(users).where(eq(users.id, installation.surgeonDoctorId)).limit(1);
			if (doc) doctorName = doc.fullName;
		}

		const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
		const isqHistory = await db
			.select()
			.from(implantIsqMeasurements)
			.where(eq(implantIsqMeasurements.installationId, installationId))
			.orderBy(implantIsqMeasurements.daysPostOp);

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
	});
}
