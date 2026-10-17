/**
 * DENTE Dental CRM — Leads Kanban SLA Calculation & Status Engine
 * Mandate 8n (Speed-to-Lead Workstation Specification)
 */

import type { LeadStatus } from "../../store/leadsStore";

export type LeadSlaUrgency = "fresh" | "warning" | "breached";

export interface LeadSlaInfo {
	urgency: LeadSlaUrgency;
	minutesElapsed: number;
	label: string;
	badgeColor: string;
	badgeBg: string;
	badgeBorder: string;
	isBreached: boolean;
	formattedDuration: string;
}

function formatHoursMins(mins: number): string {
	const hours = Math.floor(mins / 60);
	const rem = mins % 60;
	return hours > 0 ? (rem > 0 ? `${hours}ч ${rem}м` : `${hours}ч`) : `${mins}м`;
}

export function getLeadSlaStatus(
	lead: { status?: LeadStatus | string | null | undefined; createdAt?: string | Date | null | undefined; stageEnteredAt?: string | Date | null | undefined },
	now?: Date,
): LeadSlaInfo {
	const rawDate = lead.stageEnteredAt || lead.createdAt;
	const refTime = rawDate ? new Date(rawDate).getTime() : NaN;
	const currentTime = now ? now.getTime() : Date.now();

	if (Number.isNaN(refTime) || refTime <= 0) {
		return {
			urgency: "fresh", minutesElapsed: 0, label: "Свежий (< 15м)", badgeColor: "var(--ok-fg)",
			badgeBg: "var(--ok-bg)", badgeBorder: "var(--line)", isBreached: false, formattedDuration: "< 1м",
		};
	}

	const minutesElapsed = Math.floor(Math.max(0, currentTime - refTime) / 60000);
	const isNew = lead.status === "new";
	const warnThreshold = isNew ? 5 : 15;
	const breachThreshold = isNew ? 15 : 60;

	if (minutesElapsed < warnThreshold) {
		const dur = minutesElapsed > 0 ? `${minutesElapsed}м` : "< 1м";
		return {
			urgency: "fresh", minutesElapsed, label: `Свежий (${dur})`, badgeColor: "var(--ok-fg)",
			badgeBg: "var(--ok-bg)", badgeBorder: "var(--line)", isBreached: false, formattedDuration: dur,
		};
	}

	if (minutesElapsed < breachThreshold) {
		const dur = `${minutesElapsed}м`;
		return {
			urgency: "warning", minutesElapsed, label: `Внимание (${dur})`, badgeColor: "var(--amber-dark, var(--amber))",
			badgeBg: "var(--amber-soft)", badgeBorder: "var(--amber)", isBreached: false, formattedDuration: dur,
		};
	}

	const timeStr = formatHoursMins(minutesElapsed);
	const label = isNew ? `SLA просрочен (> 15м: +${timeStr})` : `SLA просрочен (+${timeStr})`;

	return {
		urgency: "breached", minutesElapsed, label, badgeColor: "var(--rust)", badgeBg: "var(--rust-soft)",
		badgeBorder: "var(--rust)", isBreached: true, formattedDuration: `+${timeStr}`,
	};
}
