/**
 * ============================================================================
 * WARRANTY PASSPORT STUDIO — LAYER 2: PREVIEW & PRINT BLANK
 * Предпросмотр печатной формы гарантийного паспорта A4/A5
 * ============================================================================
 */

import type React from "react";

export interface WarrantyPreviewPrintProps {
	certificateHtml: string;
}

export const WarrantyPreviewPrint: React.FC<WarrantyPreviewPrintProps> = ({
	certificateHtml,
}) => {
	return (
		<div className="warranty-preview-container">
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
