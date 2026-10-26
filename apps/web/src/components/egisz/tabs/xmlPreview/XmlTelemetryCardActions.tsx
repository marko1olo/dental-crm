/**
 * XmlTelemetryCardActions.tsx
 * Quick action buttons for quiet telemetry card.
 */

import React from "react";
import { Download, FileArchive } from "lucide-react";

export interface XmlTelemetryCardActionsProps {
	readonly onExportCurrentPackageZip: () => void;
	readonly onDownloadXml: () => void;
}

export const XmlTelemetryCardActions: React.FC<XmlTelemetryCardActionsProps> = ({
	onExportCurrentPackageZip,
	onDownloadXml,
}) => {
	const btnStyle: React.CSSProperties = {
		display: "flex",
		alignItems: "center",
		gap: "0.4rem",
		padding: "0.45rem 0.9rem",
		fontSize: "0.8125rem",
		fontWeight: 600,
		borderRadius: "8px",
		border: "1px solid var(--line)",
		background: "var(--paper)",
		color: "var(--ink)",
		cursor: "pointer",
	};

	return (
		<div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
			<button
				type="button"
				onClick={onExportCurrentPackageZip}
				data-testid="btn-export-current-zip"
				className="egisz-btn sm"
				style={btnStyle}
			>
				<FileArchive size={15} />
				<span>Скачать пакет (ZIP)</span>
			</button>
			<button
				type="button"
				onClick={onDownloadXml}
				data-testid="btn-export-cda-xml"
				className="egisz-btn sm"
				style={btnStyle}
			>
				<Download size={15} />
				<span>Экспорт файла</span>
			</button>
		</div>
	);
};
