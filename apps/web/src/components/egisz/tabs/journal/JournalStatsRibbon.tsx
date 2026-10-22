/**
 * JournalStatsRibbon.tsx — Stats counters ribbon and status filter buttons
 */

import React from "react";
import type { RemdDocumentRecord, RemdDocumentStatus } from "../../egiszJournalData";

export interface JournalStatsRibbonProps {
	readonly records: readonly RemdDocumentRecord[];
	readonly journalFilter: RemdDocumentStatus | "all";
	readonly onJournalFilterChange: (status: RemdDocumentStatus | "all") => void;
}

const FILTER_ITEMS = [
	{ id: "all", label: "Все" },
	{ id: "registered", label: "Зарегистрировано" },
	{ id: "accepted_by_egisz", label: "Принято в Минздраве" },
	{ id: "signed", label: "Подписан" },
	{ id: "sent", label: "Отправлен" },
	{ id: "rejected_by_egisz", label: "Отклонено" },
	{ id: "error", label: "Ошибка валидации" },
	{ id: "draft", label: "Черновик" },
] as const;

export const JournalStatsRibbon: React.FC<JournalStatsRibbonProps> = ({
	records,
	journalFilter,
	onJournalFilterChange,
}) => {
	const registeredCount = records.filter((r) => r.status === "registered" || r.status === "accepted_by_egisz").length;
	const errorCount = records.filter((r) => r.status === "error" || r.status === "rejected_by_egisz").length;
	const draftCount = records.filter((r) => r.status === "draft").length;

	return (
		<>
			<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
				<div style={{ padding: "0.875rem", borderRadius: "8px", background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.25)" }}>
					<div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--success)", textTransform: "uppercase" }}>
						Зарегистрировано в РЭМД
					</div>
					<div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--success)", marginTop: "0.25rem" }}>
						{registeredCount}
					</div>
				</div>
				<div style={{ padding: "0.875rem", borderRadius: "8px", background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.25)" }}>
					<div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--danger)", textTransform: "uppercase" }}>
						Ошибки валидации
					</div>
					<div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--danger)", marginTop: "0.25rem" }}>
						{errorCount}
					</div>
				</div>
				<div style={{ padding: "0.875rem", borderRadius: "8px", background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.25)" }}>
					<div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--warning)", textTransform: "uppercase" }}>
						Черновики
					</div>
					<div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--warning)", marginTop: "0.25rem" }}>
						{draftCount}
					</div>
				</div>
			</div>

			<div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
				<span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
					Фильтр статуса:
				</span>
				{FILTER_ITEMS.map(({ id, label }) => (
					<button
						key={id}
						type="button"
						onClick={() => onJournalFilterChange(id)}
						style={{
							padding: "0.3rem 0.65rem", fontSize: "0.75rem", fontWeight: 600, borderRadius: "6px",
							border: "1px solid var(--line)", background: journalFilter === id ? "var(--primary)" : "var(--paper)",
							color: journalFilter === id ? "var(--ink-inverse)" : "var(--ink)", cursor: "pointer",
						}}
					>
						{label}
					</button>
				))}
			</div>
		</>
	);
};
