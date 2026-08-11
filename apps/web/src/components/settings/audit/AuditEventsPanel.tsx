import { formatDateTime } from "../../../AppHelpers";
import { ShieldCheck } from "lucide-react";

export function AuditEventsPanel({ typedAuditEvents }: any) {
    return (
        <div className="panel audit-panel">
						<div className="panel-heading">
							<h2>Аудит действий</h2>
							<ShieldCheck aria-hidden="true" />
						</div>
						<div className="ops-list">
							{typedAuditEvents.map((event) => (
								<article className="ops-row" key={event.id}>
									<ShieldCheck aria-hidden="true" />
									<div>
										<h3>
											{event.reason ? "Системное событие" : "Запись аудита"}
										</h3>
										<p>
											{event.reason ??
												"Служебная запись без публичного описания"}
										</p>
									</div>
									<span>{formatDateTime(event.createdAt)}</span>
								</article>
							))}
						</div>
					</div>
    );
}
