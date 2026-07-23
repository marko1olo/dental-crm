import React, { useEffect, useState } from "react";
import { MessageSquare, PhoneCall, Volume2, Calendar, FileText } from "lucide-react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";

export interface CommunicationTimelineEvent {
	id: string;
	organizationId: string;
	patientName: string;
	eventType: string;
	statusColor: string;
	audioRecordingUrl?: string | null;
	comment: string;
	createdAt: string;
}

export const PatientCommunicationTimelineWidget: React.FC<{ patientId: string }> = ({ patientId }) => {
	const { auth } = useAppLogicContext();
	const [events, setEvents] = useState<CommunicationTimelineEvent[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		if (!patientId) return;
		fetch(`/api/patients/${patientId}/communication-timelines`, {
			headers: auth ? auth.denteClinicalReadHeaders() : { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
		})
			.then((res) => res.json())
			.then((data) => {
				setEvents(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch((err) => {
				console.error("[PatientCommunicationTimelineWidget fetch error]:", err);
				setLoading(false);
			});
	}, [patientId, auth]);

	return (
		<div
			data-testid="patient-communication-timeline-widget"
			style={{
				padding: "16px",
				background: "var(--paper)",
				border: "1px solid var(--line)",
				borderRadius: "12px",
				marginTop: "16px"
			}}
		>
			<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", borderBottom: "1px solid var(--line)", paddingBottom: "8px" }}>
				<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<MessageSquare size={18} style={{ color: "var(--brand-500)" }} />
					<h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--ink)", margin: 0 }}>
						Хронологическая история коммуникаций
					</h3>
				</div>
				<span style={{ fontSize: "11px", background: "var(--brand-50)", color: "var(--brand-700)", padding: "2px 8px", borderRadius: "6px", fontWeight: 600 }}>
					IDENT Parity #4
				</span>
			</div>

			{loading ? (
				<div style={{ fontSize: "13px", color: "var(--muted)", padding: "12px 0" }}>Загрузка истории коммуникаций...</div>
			) : events.length === 0 ? (
				<div style={{ padding: "16px", textAlign: "center", background: "var(--surface-50)", borderRadius: "8px", border: "1px dashed var(--line)", fontSize: "13px", color: "var(--muted)" }}>
					История звонков и чатов с пациентом пока пуста
				</div>
			) : (
				<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
					{events.map((ev) => (
						<div
							key={ev.id}
							style={{
								padding: "12px",
								background: "var(--surface-50)",
								border: "1px solid var(--line)",
								borderRadius: "8px",
								display: "flex",
								flexDirection: "column",
								gap: "6px"
							}}
						>
							<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
								<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
									<span style={{
										width: "10px",
										height: "10px",
										borderRadius: "50%",
										background: ev.statusColor === "emerald" || ev.statusColor === "green" ? "var(--emerald)" : "var(--brand-500)"
									}} />
									<strong style={{ fontSize: "13px", color: "var(--ink)" }}>{ev.eventType}</strong>
								</div>
								<span style={{ fontSize: "11px", color: "var(--muted)", display: "flex", alignItems: "center", gap: "4px" }}>
									<Calendar size={12} />
									{new Date(ev.createdAt).toLocaleString("ru-RU")}
								</span>
							</div>

							<div style={{ fontSize: "13px", color: "var(--ink)", background: "var(--paper)", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--line)" }}>
								{ev.comment}
							</div>

							{ev.audioRecordingUrl && (
								<div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
									<Volume2 size={14} style={{ color: "var(--brand-600)" }} />
									<audio controls src={ev.audioRecordingUrl} style={{ height: "28px", width: "100%", maxWidth: "320px" }} />
								</div>
							)}
						</div>
					))}
				</div>
			)}
		</div>
	);
};
