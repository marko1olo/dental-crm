import React from "react";
/**
 * DENTE Dental CRM — Funnel Leak Audit Card
 * Mandate 8b (<= 120 lines)
 */

import { Clock } from "lucide-react";

export interface FunnelLeakAuditCardProps {
	readonly onOpenLeakDetector?: (() => void) | undefined;
}

export function FunnelLeakAuditCard({
	onOpenLeakDetector,
}: FunnelLeakAuditCardProps) {
	return (
		<div
			style={{
				background: "var(--paper)",
				border: "1px solid var(--line)",
				borderRadius: 14,
				padding: "16px 20px",
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				flexWrap: "wrap",
				gap: 12,
			}}
		>
			<div style={{ display: "flex", alignItems: "center", gap: 12 }}>
				<div
					style={{
						width: 36,
						height: 36,
						borderRadius: 10,
						background: "rgba(245, 158, 11, 0.15)",
						color: "var(--warn-fg, #d97706)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					<Clock size={20} />
				</div>
				<div>
					<div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>
						Клиническое удержание & Детектор утечек (210+ дней)
					</div>
					<div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
						Контроль пациентов без визитов более 7 месяцев, брошенных планов
						лечения и реактивация оттока
					</div>
				</div>
			</div>
			{onOpenLeakDetector && (
				<button
					type="button"
					onClick={onOpenLeakDetector}
					className="secondary-button"
					data-testid="funnel-open-leak-detector-btn"
					style={{
						height: 34,
						padding: "0 14px",
						fontSize: 12,
						fontWeight: 600,
						display: "flex",
						alignItems: "center",
						gap: 6,
						color: "var(--warn-fg, #d97706)",
						borderColor: "var(--line)",
					}}
					title="Перейти к реестру спящих пациентов и брошенных планов"
				>
					<Clock size={14} /> Открыть детектор утечек
				</button>
			)}
		</div>
	);
}
