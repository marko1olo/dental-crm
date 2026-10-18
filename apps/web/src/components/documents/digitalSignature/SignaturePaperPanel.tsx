import React from "react";
import { CheckSquare, FileText, Printer } from "lucide-react";

interface SignaturePaperPanelProps {
	readonly paperSigned: boolean;
	readonly setPaperSigned: (val: boolean) => void;
	readonly onPrintArchiveA4?: () => void;
	readonly patientName: string;
}

export const SignaturePaperPanel: React.FC<SignaturePaperPanelProps> = ({
	paperSigned,
	setPaperSigned,
	onPrintArchiveA4,
	patientName,
}) => (
	<div
		style={{
			display: "flex",
			flexDirection: "column",
			gap: "14px",
			maxWidth: "500px",
			margin: "0 auto",
			padding: "12px 0",
		}}
		data-testid="panel-signature-paper"
	>
		<div
			style={{
				padding: "14px",
				borderRadius: "10px",
				border: "1px solid var(--line, #e2e8f0)",
				background: "var(--paper-soft, #f8fafc)",
				display: "flex",
				alignItems: "center",
				gap: "12px",
			}}
		>
			<FileText size={24} color="var(--teal, #0d9488)" style={{ flexShrink: 0 }} />
			<div>
				<h4 style={{ margin: 0, fontSize: "13.5px", fontWeight: 700, color: "var(--ink, #0f172a)" }}>
					Традиционное бумажное подписание
				</h4>
				<p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "var(--muted, #64748b)" }}>
					Распечатайте бланк на принтере для личной физической подписи пациента ручкой
				</p>
			</div>
		</div>

		<label
			style={{
				display: "flex",
				alignItems: "center",
				gap: "10px",
				padding: "12px",
				borderRadius: "8px",
				border: "1px solid var(--teal, #0d9488)",
				background: "rgba(13, 148, 136, 0.06)",
				cursor: "pointer",
				fontSize: "13px",
				fontWeight: 600,
				color: "var(--ink, #0f172a)",
			}}
			data-testid="label-paper-signed-checkbox"
		>
			<input
				type="checkbox"
				checked={paperSigned}
				onChange={(e) => setPaperSigned(e.target.checked)}
				style={{ width: "18px", height: "18px", accentColor: "var(--teal, #0d9488)", cursor: "pointer" }}
				data-testid="checkbox-paper-signed"
			/>
			<span>✓ Подписано на бумаге: пациент {patientName} расписался на распечатанном бланке</span>
		</label>

		{onPrintArchiveA4 && (
			<button
				type="button"
				onClick={onPrintArchiveA4}
				className="secondary-button"
				style={{
					height: "38px",
					padding: "0 14px",
					borderRadius: "8px",
					fontSize: "12.5px",
					fontWeight: 600,
					display: "inline-flex",
					alignItems: "center",
					justifyContent: "center",
					gap: "8px",
					cursor: "pointer",
				}}
				data-testid="btn-paper-print-sheet"
			>
				<Printer size={15} color="var(--teal, #0d9488)" />
				<span>Распечатать бумажный бланк (А4)</span>
			</button>
		)}
	</div>
);
