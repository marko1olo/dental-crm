/**
 * DENTE Dental CRM — Lead Instant Preview Panel
 * Mandate 8b: Subcomponent decomposition to keep files <= 800 lines
 * Mandate 8d: Zero dev jargon and professional clinical density
 */

import React from "react";
import { Calendar, UserCheck } from "lucide-react";
import type { Lead } from "../../store/leadsStore";

export interface LeadInstantPreviewProps {
	lead: Lead;
	borderColor: string;
	channelBadge: {
		bg: string;
		color: string;
		border: string;
	};
	channelLabel: string | null | undefined;
	onOpenPatient: (e: React.MouseEvent, patientId: string) => void;
	onQuickSchedule?: ((leadId: string) => Promise<void> | void) | undefined;
}

export const LeadInstantPreview: React.FC<LeadInstantPreviewProps> = ({
	lead,
	borderColor,
	channelBadge,
	channelLabel,
	onOpenPatient,
	onQuickSchedule,
}) => {
	return (
		<div
			style={{
				marginBottom: 8,
				padding: "8px 10px",
				background: "var(--paper-soft)",
				borderRadius: 8,
				border: `1px solid ${borderColor}`,
				fontSize: 12,
				display: "flex",
				flexDirection: "column",
				gap: 5,
			}}
			onClick={(e) => e.stopPropagation()}
			data-testid={`lead-instant-preview-${lead.id}`}
		>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
				<span style={{ fontWeight: 600, color: "var(--ink)", fontSize: 11 }}>
					Карточка обращения
				</span>
				<span style={{ fontSize: 10, color: "var(--muted)" }}>
					№ {lead.id.slice(0, 6)}
				</span>
			</div>
			{lead.notes && (
				<div style={{ fontSize: 11.5 }}>
					<span style={{ color: "var(--muted)" }}>Запрос: </span>
					<span style={{ color: "var(--ink)", fontStyle: "italic" }}>{lead.notes}</span>
				</div>
			)}
			{lead.source && (
				<div style={{ fontSize: 11.5 }}>
					<span style={{ color: "var(--muted)" }}>Канал: </span>
					<span style={{ color: channelBadge.color, fontWeight: 500 }}>{channelLabel}</span>
				</div>
			)}
			{lead.createdAt && (
				<div style={{ fontSize: 10.5, color: "var(--muted)" }}>
					Дата: {new Date(lead.createdAt).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
				</div>
			)}
			{lead.existingPatient && (
				<div
					style={{
						fontSize: 11.5,
						display: "flex",
						alignItems: "center",
						gap: 5,
						padding: "3px 6px",
						background: "var(--teal-soft)",
						borderRadius: 5,
						border: "1px solid var(--teal)",
					}}
				>
					<UserCheck size={12} style={{ color: "var(--teal-dark, var(--teal))" }} />
					<span style={{ color: "var(--muted)" }}>В базе клиники:</span>
					<button
						type="button"
						onClick={(e) => onOpenPatient(e, lead.existingPatient!.id)}
						style={{
							background: "none",
							border: "none",
							padding: 0,
							color: "var(--teal-dark, var(--teal))",
							fontWeight: 600,
							textDecoration: "underline",
							cursor: "pointer",
							fontSize: 11.5,
						}}
						title="Открыть амбулаторную карту"
						data-testid={`instant-preview-patient-link-${lead.id}`}
					>
						{lead.existingPatient.fullName} →
					</button>
				</div>
			)}
			{onQuickSchedule && lead.status !== "trash" && (
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						void onQuickSchedule(lead.id);
					}}
					style={{
						marginTop: 4,
						padding: "4px 8px",
						borderRadius: 6,
						fontSize: 11,
						fontWeight: 600,
						background: "var(--teal-soft)",
						color: "var(--teal-dark, var(--teal))",
						border: "1px solid var(--teal)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						gap: 5,
						cursor: "pointer",
					}}
					title="Записать на ближайшее время в расписании"
					data-testid={`instant-quick-schedule-btn-${lead.id}`}
				>
					<Calendar size={12} />
					<span>Быстрая запись (дежурный слот)</span>
				</button>
			)}
		</div>
	);
};
