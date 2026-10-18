import React, { useState } from "react";
import { UserCheck } from "lucide-react";
import { countLabel } from "../../../lib/russianPlural";

export interface ShiftIntelligenceRoleQueuesGridProps {
	readonly roleQueues?: any[];
	readonly activeQueueRole?: any;
	readonly staffRoleLabels?: Record<string, string>;
}

export const ShiftIntelligenceRoleQueuesGrid: React.FC<ShiftIntelligenceRoleQueuesGridProps> = ({
	roleQueues = [],
	activeQueueRole,
	staffRoleLabels,
}) => {
	const [showOtherQueues, setShowOtherQueues] = useState<boolean>(false);

	return (
		<>
			<div className="role-queue-header-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
				<h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, letterSpacing: "0.02em", color: "var(--ink)" }}>
					Задачи по ролям
				</h3>
				{roleQueues.length > 1 && (
					<button
						className="secondary-button"
						type="button"
						onClick={() => setShowOtherQueues((v) => !v)}
						style={{ fontSize: "12px", height: "32px", padding: "0 12px", borderRadius: "8px", cursor: "pointer" }}
					>
						{showOtherQueues ? "Скрыть другие роли" : "Показать другие роли"}
					</button>
				)}
			</div>

			<div className="role-queue-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))", gap: "12px" }}>
				{roleQueues
					.filter((q: any) => q.role === activeQueueRole || showOtherQueues)
					.map((queue: any) => {
						const isActive = queue.role === activeQueueRole;
						return (
							<article
								className={`role-queue-card ${isActive ? "active" : ""}`}
								key={queue.role}
								style={{
									position: "relative",
									padding: "14px 16px",
									border: isActive ? "1px solid var(--teal-ring)" : "1px solid var(--line)",
									borderRadius: "12px",
									background: isActive ? "var(--teal-surface)" : "var(--paper)",
									boxShadow: "var(--shadow-1)",
									transition: "all 0.15s ease",
								}}
							>
								<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
									<span
										style={{
											display: "inline-flex",
											alignItems: "center",
											gap: "6px",
											fontSize: "11px",
											fontWeight: 700,
											textTransform: "uppercase",
											letterSpacing: "0.06em",
											color: isActive ? "var(--teal-dark)" : "var(--muted)",
										}}
									>
										<UserCheck size={14} aria-hidden="true" />
										{staffRoleLabels?.[queue.role] ?? "роль не подписана"}
									</span>
									<strong
										title={countLabel(queue.openItems ?? 0, "открытое дело", "открытых дела", "открытых дел")}
										style={{ fontSize: "22px", fontWeight: 800, color: isActive ? "var(--teal-dark)" : "var(--ink)", fontVariantNumeric: "tabular-nums" }}
									>
										<span>{queue.openItems}</span>
									</strong>
								</div>
								<h3 style={{ margin: "8px 0 0", fontSize: "14px", fontWeight: 700, color: "var(--ink)", wordBreak: "break-word", lineHeight: 1.25 }}>
									{queue.title}
								</h3>
								<p style={{ margin: "2px 0 0", fontSize: "12.5px", color: "var(--ink-2)", wordBreak: "break-word", lineHeight: 1.35 }}>
									{queue.nextAction}
								</p>
								<small style={{ display: "block", marginTop: "8px", fontSize: "11.5px", color: "var(--muted)", wordBreak: "break-word", lineHeight: 1.3 }}>
									{queue.blockedBy?.[0] ?? queue.automationHint}
								</small>
							</article>
						);
					})}
			</div>
		</>
	);
};
