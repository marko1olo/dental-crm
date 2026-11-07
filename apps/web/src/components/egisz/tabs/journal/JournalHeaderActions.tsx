/**
 * JournalHeaderActions.tsx — Header title and batch action buttons for EgiszJournalTab
 */

import React from "react";
import { FileArchive, RefreshCw, Send } from "lucide-react";

export interface JournalHeaderActionsProps {
	readonly onBatchSendShift?: (() => void) | undefined;
	readonly onRefreshOutbox?: (() => void) | undefined;
	readonly onBatchZipExport: () => void;
}

export const JournalHeaderActions: React.FC<JournalHeaderActionsProps> = ({
	onBatchSendShift,
	onRefreshOutbox,
	onBatchZipExport,
}) => {
	return (
		<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
			<div>
				<h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700, color: "var(--ink)" }}>
					Журнал медицинских документов РЭМД ЕГИСЗ
				</h3>
				<p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--muted)", marginTop: "0.2rem" }}>
					Журнал электронных медицинских карт (протоколы консультаций и вмешательств)
				</p>
			</div>
			<div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
				{onBatchSendShift && (
					<button
						type="button"
						onClick={onBatchSendShift}
						className="egisz-btn sm"
						data-testid="journal-batch-send-shift-btn"
						style={{
							display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 0.9rem",
							fontSize: "0.8125rem", fontWeight: 700, borderRadius: "6px",
							background: "var(--teal)", color: "var(--ink-inverse)", border: "none", cursor: "pointer",
							whiteSpace: "nowrap", flexShrink: 0,
						}}
					>
						<Send size={15} />
						<span className="hidden sm:inline">✓ Отправить пакет смены в РЭМД</span>
						<span className="sm:hidden">✓ Отправить смену</span>
					</button>
				)}
				{onRefreshOutbox && (
					<button
						type="button"
						onClick={onRefreshOutbox}
						className="egisz-btn sm"
						style={{
							display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 0.75rem",
							fontSize: "0.8125rem", fontWeight: 600, borderRadius: "6px",
							border: "1px solid var(--line)", background: "var(--paper)", color: "var(--ink)", cursor: "pointer",
							whiteSpace: "nowrap", flexShrink: 0,
						}}
					>
						<RefreshCw size={14} />
						Обновить
					</button>
				)}
				<button
					type="button"
					onClick={onBatchZipExport}
					style={{
						display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 1rem",
						fontSize: "0.8125rem", fontWeight: 700, borderRadius: "6px",
						background: "var(--primary)", color: "var(--ink-inverse)", border: "none", cursor: "pointer",
						whiteSpace: "nowrap", flexShrink: 0,
					}}
				>
					<FileArchive size={16} />
					<span className="hidden sm:inline">Пакетный ZIP (.xml + .p7s)</span>
					<span className="sm:hidden">ZIP архив</span>
				</button>
			</div>
		</div>
	);
};
