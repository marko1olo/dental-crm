import React from "react";
import { FileText, Printer } from "lucide-react";

interface SignaturePaperPanelProps {
	readonly paperSigned: boolean;
	readonly setPaperSigned: (val: boolean) => void;
	readonly onPrintArchiveA4?: (() => void) | undefined;
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
			maxWidth: "520px",
			margin: "0 auto",
			padding: "10px 0",
		}}
		data-testid="panel-signature-paper"
	>
		<div
			style={{
				padding: "16px",
				borderRadius: "12px",
				border: "1px solid var(--line, #e2e8f0)",
				background: "var(--paper-soft, #f8fafc)",
				display: "flex",
				alignItems: "center",
				gap: "14px",
			}}
		>
			<div
				style={{
					width: "44px",
					height: "44px",
					borderRadius: "10px",
					background: "rgba(13, 148, 136, 0.12)",
					color: "var(--teal, #0d9488)",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					flexShrink: 0,
				}}
			>
				<FileText size={22} />
			</div>
			<div>
				<h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--ink, #0f172a)" }}>
					Традиционное подписание оригинала А4
				</h4>
				<p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "var(--muted, #64748b)", lineHeight: 1.4 }}>
					Распечатайте официальный бланк документа для личной физической подписи пациента ручкой.
				</p>
			</div>
		</div>

		{onPrintArchiveA4 && (
			<button
				type="button"
				onClick={() => {
					setPaperSigned(true);
					onPrintArchiveA4();
				}}
				className="primary-button"
				style={{
					minHeight: "44px",
					padding: "0 18px",
					borderRadius: "8px",
					border: "1px solid var(--teal, #0d9488)",
					background: "var(--teal, #0d9488)",
					color: "#ffffff",
					fontSize: "13.5px",
					fontWeight: 700,
					display: "inline-flex",
					alignItems: "center",
					justifyContent: "center",
					gap: "8px",
					cursor: "pointer",
					boxShadow: "0 2px 4px rgba(13, 148, 136, 0.2)",
				}}
				data-testid="btn-paper-print-sheet"
			>
				<Printer size={17} />
				<span>Печать оригинала А4 для подписи пациентом</span>
			</button>
		)}

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
	</div>
);
