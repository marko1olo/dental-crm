import type { ImagingStudy } from "@dental/shared";
import { and, desc, eq, or, sql } from "drizzle-orm";
import { db } from "../client.js";
import * as schema from "../schema.js";
import { mapImagingStudy, mapXrayScanToImagingStudy } from "./imagingMappers.js";

export interface ImagingStudiesQueryFilters {
	patientId?: string | null | undefined;
	modality?: string | null | undefined;
	bindingStatus?: string | null | undefined;
	search?: string | null | undefined;
	limit?: number | undefined;
	offset?: number | undefined;
}

export async function getImagingStudiesWithFilters(
	organizationId: string,
	filters: ImagingStudiesQueryFilters = {},
): Promise<ImagingStudy[]> {
	const conditions = [eq(schema.imagingStudies.organizationId, organizationId)];

	if (filters.patientId) {
		conditions.push(eq(schema.imagingStudies.patientId, filters.patientId));
	}
	if (filters.modality) {
		conditions.push(sql`lower(${schema.imagingStudies.modality}) = lower(${filters.modality})`);
	}
	if (filters.bindingStatus) {
		conditions.push(eq(schema.imagingStudies.bindingStatus, filters.bindingStatus));
	}
	if (filters.search && filters.search.trim().length > 0) {
		const searchPattern = `%${filters.search.trim().toLowerCase()}%`;
		conditions.push(
			or(
				sql`lower(${schema.imagingStudies.title}) LIKE ${searchPattern}`,
				sql`lower(${schema.imagingStudies.dicomPatientName}) LIKE ${searchPattern}`,
				sql`lower(${schema.patients.fullName}) LIKE ${searchPattern}`,
			)!,
		);
	}

	const baseQuery = db
		.select({
			study: schema.imagingStudies,
			patientFullName: schema.patients.fullName,
		})
		.from(schema.imagingStudies)
		.leftJoin(
			schema.patients,
			and(
				eq(schema.patients.organizationId, organizationId),
				eq(schema.patients.id, schema.imagingStudies.patientId),
			),
		)
		.where(and(...conditions))
		.orderBy(desc(schema.imagingStudies.capturedAt));

	const rows = await baseQuery;
	const studies = rows.map((r) => mapImagingStudy(r.study, r.patientFullName));
	const existingStudyIds = new Set(studies.map((s) => s.id));

	// Также объединяем снимки из xray_scans (если они ещё не продублированы в imaging_studies)
	const xrayConditions = [eq(schema.xrayScans.organizationId, organizationId)];
	if (filters.patientId) {
		xrayConditions.push(eq(schema.xrayScans.patientId, filters.patientId));
	}
	const legacyScans = await db
		.select({
			scan: schema.xrayScans,
			patientFullName: schema.patients.fullName,
		})
		.from(schema.xrayScans)
		.leftJoin(
			schema.patients,
			and(
				eq(schema.patients.organizationId, organizationId),
				eq(schema.patients.id, schema.xrayScans.patientId),
			),
		)
		.where(and(...xrayConditions))
		.orderBy(desc(schema.xrayScans.capturedAt));

	for (const item of legacyScans) {
		if (item?.scan?.id && !existingStudyIds.has(item.scan.id)) {
			const scanModality = item.scan.kind === "opg" ? "PX" : "IO";
			if (filters.modality && filters.modality.toUpperCase() !== scanModality) {
				continue;
			}
			studies.push(mapXrayScanToImagingStudy(item.scan, item.patientFullName));
			existingStudyIds.add(item.scan.id);
		}
	}

	studies.sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime());

	const limitVal = typeof filters.limit === "number" && filters.limit > 0 ? filters.limit : undefined;
	const offsetVal = typeof filters.offset === "number" && filters.offset > 0 ? filters.offset : 0;

	if (limitVal !== undefined) {
		return studies.slice(offsetVal, offsetVal + limitVal);
	}
	if (offsetVal > 0) {
		return studies.slice(offsetVal);
	}
	return studies;
}

export async function getImagingStudiesForPatient(
	organizationId: string,
	patientId: string,
): Promise<ImagingStudy[]> {
	return getImagingStudiesWithFilters(organizationId, { patientId });
}

export async function getAllImagingStudies(
	organizationId: string,
): Promise<ImagingStudy[]> {
	return getImagingStudiesWithFilters(organizationId);
}
