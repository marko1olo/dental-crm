import type { AuditEvent } from "@dental/shared";
import { Search, ShieldCheck } from "lucide-react";
import React, { useMemo, useState } from "react";
import { formatDateTime } from "./AuditBrowserContinuityPanel";

export function AuditEventLogPanel({ auditEvents }: { auditEvents: any }) {
	const [auditSearch, setAuditSearch] = useState("");

	const filteredAuditEvents = useMemo(() => {
		let filtered = (auditEvents || []) as AuditEvent[];
		if (auditSearch.trim().length > 0) {
			const q = auditSearch.toLowerCase();
			filtered = filtered.filter(
				(e) =>
					e.action.toLowerCase().includes(q) ||
					e.entityId.toLowerCase().includes(q) ||
					e.reason?.toLowerCase().includes(q),
			);
		}
		return filtered.sort(
			(a, b) =>
				new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
		);
	}, [auditEvents, auditSearch]);

	return (
		<div className="panel audit-panel">
			<div
				className="panel-heading"
				style={{
					flexDirection: "column",
					alignItems: "flex-start",
					gap: "1rem",
				}}
			>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						width: "100%",
						alignItems: "center",
					}}
				>
					<h2>Аудит событий</h2>
					<ShieldCheck aria-hidden="true" />
				</div>
				<div
					className="search-bar"
					style={{
						display: "flex",
						width: "100%",
						alignItems: "center",
						gap: "0.5rem",
						background: "var(--color-bg-secondary)",
						padding: "0.5rem 1rem",
						borderRadius: "0.5rem",
					}}
				>
					<Search size={16} style={{ color: "var(--color-text-tertiary)" }} />
					<input
						type="text"
						placeholder="Поиск по действию, причине или ID сущности..."
						value={auditSearch}
						onChange={(e) => setAuditSearch(e.target.value)}
						style={{
							flex: 1,
							border: "none",
							background: "transparent",
							outline: "none",
							color: "var(--color-text-primary)",
						}}
					/>
				</div>
			</div>
			<div
				className="ops-list"
				style={{ maxHeight: "600px", overflowY: "auto" }}
			>
				{filteredAuditEvents.length > 0 ? (
					filteredAuditEvents.map((event: any) => (
						<article
							className="ops-row"
							key={event.id}
							style={{
								display: "flex",
								flexWrap: "wrap",
								gap: "1rem",
								alignItems: "flex-start",
								padding: "1rem",
								borderBottom: "1px solid var(--color-border-subtle)",
							}}
						>
							<div
								style={{
									display: "flex",
									flexDirection: "column",
									gap: "0.25rem",
									flex: 1,
								}}
							>
								<div
									style={{
										display: "flex",
										gap: "0.5rem",
										alignItems: "center",
									}}
								>
									<span
										style={{
											padding: "0.15rem 0.5rem",
											background:
												(event.action || "").includes("delete") ||
												(event.action || "").includes("remove")
													? "var(--color-danger-transparent)"
													: "var(--color-accent-transparent)",
											color:
												(event.action || "").includes("delete") ||
												(event.action || "").includes("remove")
													? "var(--color-danger)"
													: "var(--color-accent)",
											borderRadius: "1rem",
											fontSize: "0.75rem",
											fontWeight: 600,
											textTransform: "uppercase",
											letterSpacing: "0.02em",
										}}
									>
										{event.action}
									</span>
									<span
										style={{
											fontSize: "0.8rem",
											color: "var(--color-text-tertiary)",
											fontFamily: "monospace",
										}}
									>
										#{event.entityId}
									</span>
								</div>
								<p
									style={{
										margin: "0.5rem 0 0",
										color: "var(--color-text-secondary)",
										fontSize: "0.9rem",
										lineHeight: "1.4",
									}}
								>
									{event.reason ?? "Причина не задокументирована системой"}
								</p>
							</div>
							<span
								style={{
									fontSize: "0.85rem",
									color: "var(--color-text-tertiary)",
									whiteSpace: "nowrap",
								}}
							>
								{formatDateTime(event.createdAt)}
							</span>
						</article>
					))
				) : (
					<div
						style={{
							padding: "2rem",
							textAlign: "center",
							color: "var(--color-text-tertiary)",
						}}
					>
						События не найдены
					</div>
				)}
			</div>
		</div>
	);
}
