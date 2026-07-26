import React, { useEffect, useState } from "react";
import { AlertTriangle, Clock, User, ArrowRight } from "lucide-react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";

interface UrgentRequestItem {
	id: string;
	organizationId: string;
	patientName: string;
	requestType: string;
	urgencyLevel: string;
	doctorName: string;
	preferredSlotTime: string;
	isResolved: boolean;
	createdAt: string;
}

interface UrgentScheduleRequestsWidgetProps {
	headerExtra?: React.ReactNode;
}

function formatUrgentRequestsCount(count: number): string {
	if (count % 10 === 1 && count % 100 !== 11) {
		return `${count} активное обращение острой боли`;
	}
	if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) {
		return `${count} активных обращения острой боли`;
	}
	return `${count} активных обращений острой боли`;
}

export const UrgentScheduleRequestsWidget: React.FC<UrgentScheduleRequestsWidgetProps> = ({ headerExtra }) => {
	const { auth } = useAppLogicContext();
	const [requests, setRequests] = useState<UrgentRequestItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/schedule/urgent-schedule-requests", {
			headers: auth ? auth.denteClinicalReadHeaders() : { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
		})
			.then((res) => res.json())
			.then((data) => {
				setRequests(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch(() => setLoading(false));
	}, [auth]);

	return (
		<div
			data-testid="urgent-schedule-requests-widget"
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "12px"
			}}
		>
			<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
				<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
					<div style={{ width: "32px", height: "32px", borderRadius: "9px", background: "var(--bad-bg)", color: "var(--bad-fg)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
						<AlertTriangle size={16} />
					</div>
					<div>
						<h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--ink)" }}>
							Срочные обращения «Острая боль»
						</h4>
						<p style={{ margin: "1px 0 0", fontSize: "12px", color: "var(--ink-2)", fontWeight: 500 }}>
							{requests.length > 0 ? formatUrgentRequestsCount(requests.length) : "Срочных обращений нет. Окна резерва готовы"}
						</p>
					</div>
				</div>
				{headerExtra && <div style={{ flexShrink: 0 }}>{headerExtra}</div>}
			</div>

			{loading ? (
				<p style={{ fontSize: "12.5px", color: "var(--muted)", margin: "4px 0" }}>Загрузка срочных заявок...</p>
			) : requests.length === 0 ? (
				<div style={{ padding: "12px 14px", borderRadius: "10px", border: "1px dashed var(--line-strong)", background: "var(--paper-soft)", fontSize: "12.5px", color: "var(--muted)", display: "flex", alignItems: "center", gap: "8px" }}>
					<span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "var(--ok-fg)" }} />
					<span>Срочных обращений нет. Окна резерва готовы для планового приёма.</span>
				</div>
			) : (
				<div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "200px", overflowY: "auto" }}>
					{requests.map((req) => (
						<div
							key={req.id}
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								gap: "12px",
								padding: "10px 14px",
								borderRadius: "10px",
								background: "var(--paper-soft)",
								border: "1px solid var(--line)",
								borderLeft: "3px solid var(--bad-fg)",
								transition: "all 0.15s ease"
							}}
						>
							<div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
								<User size={15} style={{ color: "var(--bad-fg)", flexShrink: 0 }} />
								<div style={{ minWidth: 0 }}>
									<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
										<strong style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
											{req.patientName}
										</strong>
										<span className="status-pill status-cancelled" style={{ fontSize: "10px", padding: "2px 7px" }}>
											{req.urgencyLevel || "urgent"}
										</span>
									</div>
									<span style={{ fontSize: "12px", color: "var(--muted)" }}>
										{req.requestType}
									</span>
								</div>
							</div>
							<div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
								<span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11.5px", fontWeight: 600, color: "var(--ink-2)", fontVariantNumeric: "tabular-nums" }}>
									<Clock size={12} style={{ color: "var(--muted)" }} />
									{req.preferredSlotTime}
								</span>
								<button
									className="secondary-button"
									type="button"
									style={{ minHeight: "28px", height: "28px", padding: "0 10px", fontSize: "11.5px" }}
									onClick={() => { window.location.hash = "schedule"; }}
								>
									Записать <ArrowRight size={12} />
								</button>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
