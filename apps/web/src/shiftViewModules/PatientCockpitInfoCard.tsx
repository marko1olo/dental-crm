import React from "react";
import { Calendar, Info, Phone } from "lucide-react";
import { formatBirthDate, formatPhoneDisplay } from "../AppHelpers";
import { PatientAvatar } from "../components/PatientAvatar";

export interface PatientCockpitInfoCardProps {
	// biome-ignore lint/suspicious/noExplicitAny: patient
	readonly activePatient: any;
}

export const PatientCockpitInfoCard: React.FC<PatientCockpitInfoCardProps> = ({ activePatient }) => (
	<>
		<div className="patient-hero min-w-0">
			<PatientAvatar fullName={activePatient.fullName} size={44} />
			<div className="hero-info min-w-0">
				<h2 style={{ fontSize: "16px", wordBreak: "break-word", lineHeight: 1.25 }}>{activePatient.fullName}</h2>
				<p style={{ margin: "1px 0 0", fontSize: "12px", color: "var(--muted)", wordBreak: "break-word" }}>
					{activePatient.id ? `карта № ${activePatient.id.slice(0, 6)}` : "номер карты не присвоен"}
				</p>
			</div>
		</div>

		<div className="patient-info-list" style={{ display: "flex", flexDirection: "column", gap: "9px", fontSize: "13px", color: "var(--ink-2)", minWidth: 0 }}>
			<div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
				<Calendar size={14} style={{ color: "var(--muted)", flexShrink: 0 }} />
				<span className="min-w-0 break-words">
					Дата рождения: <strong style={{ color: "var(--ink)", fontWeight: 600 }}>{formatBirthDate(activePatient.birthDate as string) || "не указана"}</strong>
				</span>
			</div>
			<div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
				<Phone size={14} style={{ color: "var(--muted)", flexShrink: 0 }} />
				<span className="min-w-0 break-words">
					Телефон: <strong style={{ color: "var(--ink)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{activePatient.phone ? formatPhoneDisplay(activePatient.phone) : "не указан"}</strong>
				</span>
			</div>
			{activePatient.notes && (
				<div style={{ display: "flex", alignItems: "flex-start", gap: "8px", minWidth: 0 }}>
					<Info size={14} style={{ color: "var(--muted)", flexShrink: 0, marginTop: "2px" }} />
					<span className="min-w-0 break-words leading-tight">
						Заметки: <strong style={{ color: "var(--ink)", fontWeight: 600 }}>{activePatient.notes}</strong>
					</span>
				</div>
			)}
		</div>
	</>
);
