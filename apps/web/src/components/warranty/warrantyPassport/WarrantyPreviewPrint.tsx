/**
 * ============================================================================
 * WARRANTY PASSPORT STUDIO — LAYER 2: PREVIEW & PRINT BLANK
 * Предпросмотр печатной формы гарантийного паспорта A4/A5
 * ============================================================================
 */

import { FileText, Printer } from "lucide-react";
import React, { useEffect } from "react";

export interface WarrantyPreviewPrintProps {
	certificateHtml: string;
	onPrint?: () => void;
}

export const WarrantyPreviewPrint: React.FC<WarrantyPreviewPrintProps> = ({
	certificateHtml,
	onPrint,
}) => {
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
				const activeTag = document.activeElement?.tagName?.toLowerCase();
				if (activeTag !== "input" && activeTag !== "textarea") {
					e.preventDefault();
					onPrint?.();
				}
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [onPrint]);

	return (
		<div className="warranty-preview-container">
			<div className="warranty-preview-toolbar">
				<div className="warranty-preview-toolbar-left">
					<FileText size={16} className="text-[var(--teal)]" />
					<span className="warranty-preview-format-pill">Формат: А4 / А5 (Печатный сертификат)</span>
				</div>
				{onPrint && (
					<button
						type="button"
						className="warranty-btn-secondary"
						onClick={onPrint}
						title="Распечатать сертификат (Enter)"
					>
						<Printer size={15} />
						Распечатать сертификат (Enter)
					</button>
				)}
			</div>

			<div className="warranty-preview-frame">
				<iframe
					title="Гарантийный паспорт предпросмотр"
					className="warranty-preview-iframe"
					srcDoc={certificateHtml}
				/>
			</div>
		</div>
	);
};
