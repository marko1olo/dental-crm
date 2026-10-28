import React from "react";
import { Box, Download, ExternalLink, Image as ImageIcon } from "lucide-react";
import {
	getAttachmentExtension,
	getAttachmentFileName,
	getAttachmentFileSize,
	is3DScanFile,
	isImageFile,
} from "../guestLabPortalHelpers.js";

export interface GuestLabPortalAttachmentsProps {
	readonly attachedImageUrl?: string | null | undefined;
}

export function GuestLabPortalAttachments({ attachedImageUrl }: GuestLabPortalAttachmentsProps): React.JSX.Element {
	const is3D = attachedImageUrl ? is3DScanFile(attachedImageUrl) : false;
	const isImg = attachedImageUrl ? isImageFile(attachedImageUrl) : false;
	const fileName = attachedImageUrl ? getAttachmentFileName(attachedImageUrl) : "";

	const render3DScan = () => (
		<div className="guest-portal-scan-card" data-testid="guest-portal-3d-scan-card">
			<div className="guest-portal-scan-header">
				<div className="guest-portal-scan-icon-wrapper"><Box size={24} /></div>
				<div className="guest-portal-scan-meta">
					<div className="guest-portal-scan-filename" title={fileName} data-testid="guest-portal-scan-filename">{fileName}</div>
					<div className="guest-portal-scan-subtext">
						<span className="guest-portal-scan-badge" data-testid="guest-portal-scan-extension">.{getAttachmentExtension(attachedImageUrl!)}</span>
						<span className="guest-portal-scan-size" data-testid="guest-portal-scan-size" style={{ fontWeight: 600, color: "var(--text-primary)" }}>
							Размер: {getAttachmentFileSize(attachedImageUrl!)}
						</span>
						<span>·</span>
						<span>Цифровой оптический 3D-слепок челюсти (CAD/CAM)</span>
					</div>
				</div>
			</div>
			<div className="guest-portal-scan-actions">
				<a href={attachedImageUrl!} download={fileName} target="_blank" rel="noopener noreferrer" title="Скачать скан (STL/PLY)" className="guest-portal-download-btn" data-testid="guest-portal-scan-download-btn">
					<Download size={16} /> Скачать скан (STL/PLY)
				</a>
				<a href={attachedImageUrl!} target="_blank" rel="noopener noreferrer" title="Открыть ссылку" className="guest-portal-open-link-btn">
					<ExternalLink size={14} /> Открыть ссылку
				</a>
			</div>
		</div>
	);

	const renderImage = () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
			<img src={attachedImageUrl!} alt="Клинический снимок" loading="lazy" decoding="async" className="guest-portal-image" />
			<div style={{ display: "flex", justifyContent: "flex-end" }}>
				<a href={attachedImageUrl!} download={fileName} target="_blank" rel="noopener noreferrer" title="Скачать снимок" className="guest-portal-download-btn" style={{ padding: "7px 14px", fontSize: "12px" }}>
					<Download size={14} /> Скачать снимок
				</a>
			</div>
		</div>
	);

	return (
		<div style={{ textAlign: "left", marginBottom: "16px" }}>
			<h3 className="guest-portal-field-label" style={{ marginBottom: "12px" }}>
				{attachedImageUrl && is3D ? <><Box size={16} /> Приложенный 3D-скан (STL/PLY)</> : <><ImageIcon size={16} /> Приложенные материалы и снимки</>}
			</h3>
			{attachedImageUrl ? (
				is3D || !isImg ? render3DScan() : renderImage()
			) : (
				<div style={{ padding: "40px", border: "1px dashed var(--line)", borderRadius: "12px", textAlign: "center", color: "var(--text-secondary)" }}>
					<ImageIcon size={32} style={{ margin: "0 auto 8px", opacity: 0.5 }} />
					Нет приложенных снимков и 3D-сканов
				</div>
			)}
		</div>
	);
}
