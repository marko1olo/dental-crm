/**
 * DENTE Dental CRM — Leads Mobile Bottom Sheet Clinical Info Card
 * Source Channel, Speed-to-Lead SLA, Clinical Tags, Call Audio Player
 * Mandate 8b (<= 120 lines)
 */

import { AlertTriangle, Clock, UserCheck } from "lucide-react";
import type React from "react";
import type { Lead } from "../../../store/leadsStore";
import { LeadAudioPlayerWidget } from "../LeadAudioPlayerWidget";
import type { LeadSlaInfo } from "../leadsKanbanSla";

interface LeadMobileSheetClinicalCardProps {
	lead: Lead;
	sla: LeadSlaInfo;
	channelBadge: { bg: string; color: string; border: string };
	channelLabel: string;
	onOpenPatientCard?: ((id: string) => void) | undefined;
}

export const LeadMobileSheetClinicalCard: React.FC<
	LeadMobileSheetClinicalCardProps
> = ({ lead, sla, channelBadge, channelLabel, onOpenPatientCard }) => {
	return (
		<>
			<div className="rounded-[16px] bg-[var(--paper-soft)] border border-[var(--line)] p-3.5 space-y-2.5">
				<div className="text-[12px] font-semibold uppercase tracking-wider text-[var(--muted)]">
					Источник и регламент ответа (SLA)
				</div>

				<div className="flex flex-wrap items-center gap-2">
					<span
						className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] text-[12px] font-semibold"
						style={{
							background: channelBadge.bg,
							color: channelBadge.color,
							border: `1px solid ${channelBadge.border}`,
						}}
					>
						<span>{channelLabel}</span>
					</span>

					<span
						className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] text-[12px] font-semibold ${sla.isBreached ? "lead-sla-breached-pulse" : ""}`}
						style={{
							background: sla.badgeBg,
							color: sla.badgeColor,
							border: `1px solid ${sla.badgeBorder}`,
						}}
					>
						{sla.isBreached ? <AlertTriangle size={13} /> : <Clock size={13} />}
						<span>{sla.label}</span>
					</span>
				</div>

				{lead.existingPatient && (
					<div
						onClick={() => onOpenPatientCard?.(lead.existingPatient!.id)}
						className="flex items-center justify-between p-2.5 rounded-[10px] bg-[var(--teal-soft)] border border-[var(--teal)] text-[var(--teal-dark,var(--teal))] cursor-pointer active:opacity-80 transition-opacity"
					>
						<div className="flex items-center gap-2 min-w-0">
							<UserCheck size={16} className="shrink-0" />
							<span className="text-[13px] font-semibold truncate">
								Постоянный пациент: {lead.existingPatient.fullName}
							</span>
						</div>
						<span className="text-[12px] underline shrink-0">В карту →</span>
					</div>
				)}
			</div>

			<div className="rounded-[16px] bg-[var(--paper-soft)] border border-[var(--line)] p-3.5 space-y-2.5">
				<div className="text-[12px] font-semibold uppercase tracking-wider text-[var(--muted)]">
					Повод обращения и клинические теги
				</div>

				{Array.isArray(lead.clinicalTags) && lead.clinicalTags.length > 0 ? (
					<div className="flex flex-wrap gap-1.5">
						{lead.clinicalTags.map((tag) => (
							<span
								key={tag}
								className="inline-flex items-center px-2.5 py-1 rounded-[8px] text-[12px] font-semibold bg-[var(--teal-soft)] text-[var(--teal-dark,var(--teal))] border border-[var(--teal)]"
							>
								{tag}
							</span>
						))}
					</div>
				) : (
					<p className="text-[13px] text-[var(--muted)] italic m-0">
						Теги не указаны
					</p>
				)}

				{(lead.audioRecordUrl || lead.transcriptionSnippet) && (
					<div className="pt-2 border-t border-[var(--line-subtle)] space-y-2">
						<div className="flex items-center justify-between">
							<span className="text-[12px] font-medium text-[var(--muted)]">
								Аудиозапись звонка:
							</span>
							<LeadAudioPlayerWidget
								audioUrl={lead.audioRecordUrl}
								durationSeconds={lead.audioDurationSeconds}
							/>
						</div>
						{lead.transcriptionSnippet && (
							<div className="p-2.5 rounded-[10px] bg-[var(--paper)] border border-[var(--line)] text-[12.5px] leading-relaxed text-[var(--ink)] italic">
								{lead.transcriptionSnippet}
							</div>
						)}
					</div>
				)}
			</div>
		</>
	);
};
