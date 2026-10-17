/**
 * DENTE Dental CRM — Lead Form Header & Badges
 * Mandate 8b (<= 120 lines)
 */

import React from "react";
import { Edit2, MessageSquare, PhoneCall, UserCheck, X } from "lucide-react";
import type { Lead } from "../../../store/leadsStore";
import { formatWhatsAppUrl } from "../../messaging/omnichannelEngine";
import { LeadAudioPlayerWidget } from "../LeadAudioPlayerWidget";

interface LeadFormHeaderProps {
	isNew: boolean;
	currentLead: Lead | null;
	borderColor: string;
	onClose: () => void;
	onOpenPatient: (patientId: string) => void;
}

export const LeadFormHeader: React.FC<LeadFormHeaderProps> = ({
	isNew,
	currentLead,
	borderColor,
	onClose,
	onOpenPatient,
}) => {
	return (
		<>
			<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
				<h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "var(--ink)", display: "flex", alignItems: "center", gap: 8 }}>
					<Edit2 size={20} color="var(--teal)" />
					{isNew ? "Добавить обращение" : "Редактировать обращение"}
				</h3>
				<button
					type="button"
					onClick={onClose}
					style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer" }}
					aria-label="Закрыть модальное окно"
				>
					<X size={20} />
				</button>
			</div>

			{currentLead?.phone && (
				<div
					style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--paper-soft)", border: `1px solid ${borderColor}`, borderRadius: 8, padding: "6px 12px", marginBottom: 12, gap: 8 }}
					data-testid="drawer-lead-contact-bar"
				>
					<span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{currentLead.phone}</span>
					<div style={{ display: "flex", alignItems: "center", gap: 6 }}>
						<a
							href={`tel:${currentLead.phone.replace(/[^\d+]/g, "")}`}
							className="secondary-button"
							style={{ display: "inline-flex", alignItems: "center", gap: 4, height: 30, padding: "0 8px", fontSize: 12, borderRadius: 6, textDecoration: "none" }}
							title="Позвонить"
						>
							<PhoneCall size={12} color="var(--teal)" />
							<span>Звонок</span>
						</a>
						<a
							href={formatWhatsAppUrl(currentLead.phone, `Здравствуйте, ${currentLead.name}! Вас беспокоит стоматология DENTE.`)}
							target="_blank"
							rel="noopener noreferrer"
							className="secondary-button"
							style={{ display: "inline-flex", alignItems: "center", gap: 4, height: 30, padding: "0 8px", fontSize: 12, borderRadius: 6, textDecoration: "none", color: "var(--teal-dark, var(--teal))", background: "var(--teal-soft)", borderColor: "var(--teal)" }}
							title="WhatsApp"
						>
							<MessageSquare size={12} />
							<span>WhatsApp</span>
						</a>
					</div>
				</div>
			)}

			{(currentLead?.existingPatient || (currentLead as any)?.patientId) && (
				<div
					style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--teal-soft)", color: "var(--teal-dark, var(--teal))", border: "1px solid var(--teal)", borderRadius: 6, padding: "4px 8px", fontSize: 12, fontWeight: 600, marginBottom: 14, cursor: "pointer" }}
					onClick={() => onOpenPatient(currentLead?.existingPatient?.id || (currentLead as any)?.patientId)}
					title={currentLead?.existingPatient ? `Открыть карту: ${currentLead.existingPatient.fullName}` : "Перейти в карточку пациента"}
					data-testid={currentLead?.existingPatient ? "modal-existing-patient-badge" : "modal-patient-id-badge"}
				>
					<UserCheck size={13} className="shrink-0" />
					<span>{currentLead?.existingPatient ? `Постоянный пациент клиники: ${currentLead.existingPatient.fullName}` : "Открыть в рабочей области пациента"}</span>
				</div>
			)}

			{currentLead?.audioRecordUrl && (
				<div
					style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--paper-soft)", border: `1px solid ${borderColor}`, borderRadius: 8, padding: "8px 12px", marginBottom: 14, gap: 10 }}
					data-testid="modal-audio-player-section"
				>
					<div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
						<span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink)" }}>Запись входящего звонка АТС</span>
						{currentLead.transcriptionSnippet && (
							<span style={{ fontSize: 10.5, color: "var(--muted)", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={currentLead.transcriptionSnippet}>
								«{currentLead.transcriptionSnippet}»
							</span>
						)}
					</div>
					<LeadAudioPlayerWidget audioUrl={currentLead.audioRecordUrl} transcriptionSnippet={currentLead.transcriptionSnippet} durationSeconds={currentLead.audioDurationSeconds} />
				</div>
			)}
		</>
	);
};
