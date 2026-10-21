/**
 * DENTE Dental CRM — Lead Form Patient and Audio Badges
 * Mandate 8b (<= 120 lines)
 */

import { UserCheck } from "lucide-react";
import React from "react";
import type { Lead } from "../../../store/leadsStore";
import { LeadAudioPlayerWidget } from "../LeadAudioPlayerWidget";

interface LeadFormPatientAndAudioBadgesProps {
	currentLead: Lead | null;
	borderColor: string;
	onOpenPatient: (patientId: string) => void;
}

export const LeadFormPatientAndAudioBadges: React.FC<LeadFormPatientAndAudioBadgesProps> = ({
	currentLead,
	borderColor,
	onOpenPatient,
}) => {
	return (
		<>
			{(currentLead?.existingPatient || (currentLead as any)?.patientId) && (
				<div
					style={{
						display: "inline-flex",
						alignItems: "center",
						gap: 6,
						background: "var(--teal-soft)",
						color: "var(--teal-dark, var(--teal))",
						border: "1px solid var(--teal)",
						borderRadius: 6,
						padding: "4px 8px",
						fontSize: 12,
						fontWeight: 600,
						marginBottom: 14,
						cursor: "pointer",
					}}
					onClick={() =>
						onOpenPatient(
							currentLead?.existingPatient?.id ||
								(currentLead as any)?.patientId,
						)
					}
					title={
						currentLead?.existingPatient
							? `Открыть карту: ${currentLead.existingPatient.fullName}`
							: "Перейти в карточку пациента"
					}
					data-testid={
						currentLead?.existingPatient
							? "modal-existing-patient-badge"
							: "modal-patient-id-badge"
					}
				>
					<UserCheck size={13} className="shrink-0" />
					<span>
						{currentLead?.existingPatient
							? `Постоянный пациент клиники: ${currentLead.existingPatient.fullName}`
							: "Открыть в рабочей области пациента"}
					</span>
				</div>
			)}

			{currentLead?.audioRecordUrl && (
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						background: "var(--paper-soft)",
						border: `1px solid ${borderColor}`,
						borderRadius: 8,
						padding: "8px 12px",
						marginBottom: 14,
						gap: 10,
					}}
					data-testid="modal-audio-player-section"
				>
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							gap: 2,
							minWidth: 0,
						}}
					>
						<span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink)" }}>
							Запись входящего звонка АТС
						</span>
						{currentLead.transcriptionSnippet && (
							<span
								style={{
									fontSize: 10.5,
									color: "var(--muted)",
									fontStyle: "italic",
									overflow: "hidden",
									textOverflow: "ellipsis",
									whiteSpace: "nowrap",
								}}
								title={currentLead.transcriptionSnippet}
							>
								«{currentLead.transcriptionSnippet}»
							</span>
						)}
					</div>
					<LeadAudioPlayerWidget
						audioUrl={currentLead.audioRecordUrl}
						transcriptionSnippet={currentLead.transcriptionSnippet}
						durationSeconds={currentLead.audioDurationSeconds}
					/>
				</div>
			)}
		</>
	);
};
