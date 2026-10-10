import { sql } from "drizzle-orm";
import { index } from "drizzle-orm/pg-core";

/**
 * Индексы базовой таблицы patients (PostgreSQL 18).
 * Оптимизированы для строгой мультитенантности (tenant_id / organization_id),
 * фильтрации по статусу, быстрого поиска по номеру телефона
 * и полнотекстового/триграммного GIN поиска по ФИО и контактам.
 */
export function getPatientTableIndexes(table: any) {
	return {
		idxPatientsOrgCreated: index("idx_patients_org_created").on(
			table.organizationId,
			table.createdAt,
		),
		idxPatientsOrgCreatedDesc: index("idx_patients_org_created_desc").on(
			table.organizationId,
			table.createdAt.desc(),
		),
		idxPatientsSearchTsvGin: index("idx_patients_search_tsv_gin").using(
			"gin",
			sql`to_tsvector('russian', coalesce(${table.fullName}, '') || ' ' || coalesce(${table.phone}, ''))`,
		),
		idxPatientsOrgPhone: index("idx_patients_org_phone").on(
			table.organizationId,
			table.phone,
		),
		idxPatientsOrgStatus: index("idx_patients_org_status").on(
			table.organizationId,
			table.status,
		),
		idxPatientsFamilyGroup: index("idx_patients_family_group_id").on(
			table.familyGroupId,
		),
	};
}
