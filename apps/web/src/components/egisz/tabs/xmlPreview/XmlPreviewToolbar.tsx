/**
 * XmlPreviewToolbar.tsx — Top toolbar for validating, exporting, copying and submitting CDA XML
 */

import React from "react";
import { CheckCircle2, Copy, Download, FileArchive, Send } from "lucide-react";

export interface XmlPreviewToolbarProps {
	readonly tagCount: number;
	readonly onValidateCdaXml: () => void;
	readonly onDownloadXml: () => void;
	readonly onExportCurrentPackageZip: () => void;
	readonly onSendToRegistry: () => void;
	readonly onCopyXml: () => void;
	readonly isSending: boolean;
}

export const XmlPreviewToolbar: React.FC<XmlPreviewToolbarProps> = ({
	tagCount,
	onValidateCdaXml,
	onDownloadXml,
	onExportCurrentPackageZip,
	onSendToRegistry,
	onCopyXml,
	isSending,
}) => {
	return (
		<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
			<div style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>
				Структура данных документа (XML, тегов: {tagCount})
			</div>
			<div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
				<button
					type="button"
					onClick={onValidateCdaXml}
					className="egisz-btn sm"
					style={{
						display: "flex", alignItems: "center", gap: "0.35rem", padding: "0.4rem 0.75rem",
						fontSize: "0.8125rem", fontWeight: 600, borderRadius: "6px",
						border: "1px solid var(--line)", background: "var(--paper)", color: "var(--teal)", cursor: "pointer",
					}}
				>
					<CheckCircle2 size={14} />
					<span>Проверить XML</span>
				</button>
				<button
					type="button"
					onClick={onDownloadXml}
					data-testid="btn-export-cda-xml"
					className="egisz-btn sm"
					style={{
						display: "flex", alignItems: "center", gap: "0.35rem", padding: "0.4rem 0.75rem",
						fontSize: "0.8125rem", fontWeight: 600, borderRadius: "6px",
						border: "1px solid var(--line)", background: "var(--paper)", color: "var(--ink)", cursor: "pointer",
					}}
				>
					<Download size={14} />
					<span>Скачать XML</span>
				</button>
				<button
					type="button"
					onClick={onExportCurrentPackageZip}
					data-testid="btn-export-current-zip"
					className="egisz-btn sm"
					style={{
						display: "flex", alignItems: "center", gap: "0.35rem", padding: "0.4rem 0.75rem",
						fontSize: "0.8125rem", fontWeight: 600, borderRadius: "6px",
						border: "1px solid var(--line)", background: "var(--paper)", color: "var(--ink)", cursor: "pointer",
					}}
				>
					<FileArchive size={14} />
					<span>Скачать архив (XML + подпись)</span>
				</button>
				<button
					type="button"
					onClick={onSendToRegistry}
					data-testid="btn-submit-egisz-remd"
					className="egisz-btn egisz-btn-primary sm"
					style={{
						display: "flex", alignItems: "center", gap: "0.35rem", padding: "0.4rem 0.75rem",
						fontSize: "0.8125rem", fontWeight: 700, borderRadius: "6px",
						background: "var(--primary)", color: "var(--ink-inverse)", border: "none",
						cursor: isSending ? "wait" : "pointer",
					}}
				>
					<Send size={14} />
					<span>Отправить в Минздрав</span>
				</button>
				<button
					type="button"
					onClick={onCopyXml}
					className="egisz-btn sm"
					style={{
						display: "flex", alignItems: "center", gap: "0.35rem", padding: "0.4rem 0.75rem",
						fontSize: "0.8125rem", fontWeight: 600, borderRadius: "6px",
						border: "1px solid var(--line)", background: "var(--paper)", color: "var(--ink)", cursor: "pointer",
					}}
				>
					<Copy size={14} /> Копировать
				</button>
			</div>
		</div>
	);
};
