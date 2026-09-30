import { AlertTriangle, Printer, ScanLine, UploadCloud, X } from "lucide-react";
import React from "react";

export interface VisiographHeaderBarProps {
	readonly scanHistoryCount: number;
	readonly isLoadingHistory: boolean;
	readonly criticalCount: number;
	readonly historyFailure: string | null;
	readonly hasAiReport: boolean;
	readonly onUploadClick: () => void;
	readonly onPrintClick: () => void;
	readonly onClearClick: () => void;
}

export function VisiographHeaderBar({
	scanHistoryCount,
	isLoadingHistory,
	criticalCount,
	historyFailure,
	hasAiReport,
	onUploadClick,
	onPrintClick,
	onClearClick,
}: VisiographHeaderBarProps) {
	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				padding: "8px 12px",
				borderBottom: "1px solid var(--line)",
				background: "var(--paper-soft)",
				flexWrap: "wrap",
				gap: "8px",
			}}
		>
			<div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
				<ScanLine size={15} style={{ color: "var(--teal)" }} />
				<span style={{ fontWeight: 600, fontSize: "0.86rem", color: "var(--ink)" }}>
					Рентген-анализ снимка (ИИ) · Dental AI
				</span>
				{(scanHistoryCount > 0 || isLoadingHistory) && (
					<span
						style={{
							fontSize: "0.75rem",
							background: "var(--teal)",
							color: "var(--on-teal, white)",
							borderRadius: "999px",
							padding: "1px 7px",
							fontWeight: 600,
						}}
						title="Снимков в архиве пациента"
					>
						{isLoadingHistory ? "…" : `${scanHistoryCount} в архиве`}
					</span>
				)}
				{criticalCount > 0 && (
					<span
						style={{
							background: "#e53935",
							color: "white",
							fontSize: "0.75rem",
							padding: "2px 8px",
							borderRadius: "999px",
							fontWeight: 700,
						}}
					>
						{criticalCount} проблем
					</span>
				)}
				{historyFailure && (
					<span
						style={{
							display: "inline-flex",
							alignItems: "center",
							gap: "4px",
							fontSize: "0.78rem",
							color: "var(--warn-fg)",
							fontWeight: 600,
						}}
					>
						<AlertTriangle size={13} /> Ожидание снимка для анализа
					</span>
				)}
			</div>
			<div style={{ display: "flex", gap: "6px" }}>
				<button
					type="button"
					onClick={onUploadClick}
					title="Загрузить снимок с диска (JPG / PNG / DICOM)"
					aria-label="Загрузить свой снимок"
					style={{
						background: "transparent",
						color: "var(--ink)",
						border: "1px solid var(--line)",
						borderRadius: "8px",
						padding: "4px 10px",
						height: "30px",
						minHeight: "30px",
						cursor: "pointer",
						display: "flex",
						alignItems: "center",
						gap: "6px",
						fontSize: "0.78rem",
						transition: "all 0.2s",
					}}
				>
					<UploadCloud size={14} style={{ color: "var(--teal)" }} />
					<span>Загрузить снимок</span>
				</button>
				{hasAiReport && (
					<>
						<button
							type="button"
							onClick={onPrintClick}
							title="Печать"
							aria-label="Печать отчёта снимка"
							style={{
								background: "transparent",
								color: "var(--muted)",
								border: "1px solid var(--line)",
								borderRadius: "8px",
								padding: "4px 8px",
								height: "30px",
								minHeight: "30px",
								minWidth: "30px",
								cursor: "pointer",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								fontSize: "0.8rem",
							}}
						>
							<Printer size={14} />
						</button>
						<button
							type="button"
							onClick={onClearClick}
							title="Закрыть результат"
							style={{
								background: "transparent",
								color: "var(--muted)",
								border: "1px solid var(--line)",
								borderRadius: "8px",
								padding: "4px 6px",
								height: "30px",
								minHeight: "30px",
								width: "30px",
								cursor: "pointer",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								fontSize: "0.8rem",
							}}
						>
							<X size={14} />
						</button>
					</>
				)}
			</div>
		</div>
	);
}
