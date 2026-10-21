/**
 * DENTE Dental CRM — Leads Kanban Sorting and CSV Helpers
 */

import type { Lead } from "../../store/leadsStore";
import { getLeadSlaStatus } from "./leadsKanbanSla";

export type LeadSortOption =
	| "sla_urgent"
	| "created_desc"
	| "created_asc"
	| "revenue_desc"
	| "name_asc";

export function sortLeads(
	leads: Lead[],
	sortOption: LeadSortOption,
	now?: Date,
): Lead[] {
	const cloned = [...leads];
	switch (sortOption) {
		case "sla_urgent":
			return cloned.sort((a, b) => {
				const slaA = getLeadSlaStatus(a, now);
				const slaB = getLeadSlaStatus(b, now);
				if (slaA.isBreached !== slaB.isBreached) {
					return slaA.isBreached ? -1 : 1;
				}
				return slaB.minutesElapsed - slaA.minutesElapsed;
			});
		case "created_desc":
			return cloned.sort((a, b) => {
				const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
				const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
				return tB - tA;
			});
		case "created_asc":
			return cloned.sort((a, b) => {
				const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
				const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
				return tA - tB;
			});
		case "revenue_desc":
			return cloned.sort(
				(a, b) =>
					(Number(b.expectedRevenue) || 0) - (Number(a.expectedRevenue) || 0),
			);
		case "name_asc":
			return cloned.sort((a, b) =>
				(a.name || "").localeCompare(b.name || "", "ru"),
			);
		default:
			return cloned;
	}
}

export function formatAudioDuration(seconds?: number | null): string {
	if (!seconds || Number.isNaN(seconds) || seconds <= 0) return "0:00";
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export function exportLeadsToCsv(leads: Lead[], columnTitle?: string): string {
	const BOM = "\uFEFF";
	const header = [
		"ID",
		"Имя пациента",
		"Телефон",
		"Источник рекламы",
		"Статус",
		"Выручка (₽)",
		"Время ожидания (SLA)",
		"Примечания / Жалобы",
		"Клинические теги",
		"Запись звонка (URL)",
	].join(";");

	const rows = leads.map((lead) => {
		const sla = getLeadSlaStatus(lead);
		const tags = Array.isArray(lead.clinicalTags)
			? lead.clinicalTags.join(", ")
			: "";
		const sanitize = (val: string | null | undefined) =>
			`"${(val || "").replace(/"/g, '""').replace(/[\r\n]+/g, " ")}"`;
		return [
			sanitize(lead.id),
			sanitize(lead.name),
			sanitize(lead.phone),
			sanitize(lead.source),
			sanitize(lead.status),
			lead.expectedRevenue ? Number(lead.expectedRevenue) : 0,
			sanitize(sla.label),
			sanitize(lead.notes),
			sanitize(tags),
			sanitize(lead.audioRecordUrl),
		].join(";");
	});

	const meta = columnTitle ? `# Выгрузка этапа: ${columnTitle}\n` : "";
	return `${BOM + meta + header}\n${rows.join("\n")}`;
}
