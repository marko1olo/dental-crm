import React from "react";
/**
 * DENTE Dental CRM — Funnel Modal Header Actions Toolbar
 * Mandate 8b (<= 120 lines)
 */

import { Clock, Copy, Download, X } from "lucide-react";

export interface FunnelModalHeaderActionsProps {
	readonly onOpenLeakDetector?: (() => void) | undefined;
	readonly onCopySummary: () => void;
	readonly onExportCsv: () => void;
	readonly onClose: () => void;
}

export function FunnelModalHeaderActions({
	onOpenLeakDetector,
	onCopySummary,
	onExportCsv,
	onClose,
}: FunnelModalHeaderActionsProps) {
	return (
		<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
			{onOpenLeakDetector && (
				<button
					type="button"
					onClick={onOpenLeakDetector}
					className="secondary-button"
					data-testid="btn-analytics-open-leak-detector"
					style={{
						height: 34,
						padding: "0 12px",
						fontSize: 12,
						display: "flex",
						alignItems: "center",
						gap: 6,
						color: "var(--teal)",
						borderColor: "var(--teal)",
					}}
					title="Детектор клинических утечек CRM (210+ дней)"
					aria-label="Детектор утечек"
				>
					<Clock size={14} /> Детектор утечек
				</button>
			)}

			<button
				type="button"
				onClick={onCopySummary}
				className="secondary-button"
				style={{
					height: 34,
					padding: "0 12px",
					fontSize: 12,
					display: "flex",
					alignItems: "center",
					gap: 6,
				}}
				title="Скопировать текстовую сводку для руководителя / Telegram"
				aria-label="Скопировать сводку"
			>
				<Copy size={14} /> Скопировать дайджест
			</button>

			<button
				type="button"
				onClick={onExportCsv}
				className="secondary-button"
				style={{
					height: 34,
					padding: "0 12px",
					fontSize: 12,
					display: "flex",
					alignItems: "center",
					gap: 6,
				}}
				title="Выгрузить полный отчет в формате CSV (Excel)"
				aria-label="Экспорт в CSV"
			>
				<Download size={14} /> Экспорт CSV
			</button>

			<button
				type="button"
				onClick={onClose}
				style={{
					background: "none",
					border: "none",
					color: "var(--muted)",
					cursor: "pointer",
					padding: 6,
					borderRadius: 8,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}
				aria-label="Закрыть окно"
			>
				<X size={20} />
			</button>
		</div>
	);
}
