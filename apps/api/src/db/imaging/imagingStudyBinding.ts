import type { ImagingStudy } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import { db } from "../client.js";
import * as schema from "../schema.js";
import { mapImagingStudy, mapXrayScanToImagingStudy } from "./imagingMappers.js";

export async function bindPatientToStudyInDb(
	organizationId: string,
	studyId: string,
	patientId: string,
): Promise<ImagingStudy | null> {
	const [patient] = await db
		.select({ id: schema.patients.id, fullName: schema.patients.fullName })
		.from(schema.patients)
		.where(
			and(
				eq(schema.patients.organizationId, organizationId),
				eq(schema.patients.id, patientId),
			),
		)
		.limit(1);

	if (!patient) {
		throw new Error("Пациент не найден в базе организации");
	}

	const [updated] = await db
		.update(schema.imagingStudies)
		.set({
			patientId: patient.id,
			bindingStatus: "manual_bound",
			bindingConfidence: 100,
			aiSummary: `Вручную привязано врачом к пациенту: ${patient.fullName}`,
		})
		.where(
			and(
				eq(schema.imagingStudies.organizationId, organizationId),
				eq(schema.imagingStudies.id, studyId),
			),
		)
		.returning();

	return updated ? mapImagingStudy(updated, patient.fullName) : null;
}

export async function unbindPatientFromStudyInDb(
	organizationId: string,
	studyId: string,
): Promise<ImagingStudy | null> {
	const [updated] = await db
		.update(schema.imagingStudies)
		.set({
			patientId: null,
			bindingStatus: "unassigned",
			bindingConfidence: 0,
			aiSummary: "Исследование отвязано от пациента врачом",
		})
		.where(
			and(
				eq(schema.imagingStudies.organizationId, organizationId),
				eq(schema.imagingStudies.id, studyId),
			),
		)
		.returning();

	return updated ? mapImagingStudy(updated, null) : null;
}

export async function getImagingStudyById(
	organizationId: string,
	id: string,
	targetDb: typeof db = db,
): Promise<ImagingStudy | null> {
	const [record] = await targetDb
		.select()
		.from(schema.imagingStudies)
		.where(
			and(
				eq(schema.imagingStudies.organizationId, organizationId),
				eq(schema.imagingStudies.id, id),
			),
		)
		.limit(1);
	if (record) return mapImagingStudy(record);

	const [xray] = await targetDb
		.select()
		.from(schema.xrayScans)
		.where(
			and(
				eq(schema.xrayScans.organizationId, organizationId),
				eq(schema.xrayScans.id, id),
			),
		)
		.limit(1);
	return xray ? mapXrayScanToImagingStudy(xray) : null;
}
