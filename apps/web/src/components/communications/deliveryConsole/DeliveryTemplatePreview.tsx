import React from "react";
import { calculateSmsCostKopecks, formatSmsCostRu } from "../deliveryReportNotice.js";
import type { PreviewResult } from "./types";

export interface DeliveryTemplatePreviewProps {
	preview: PreviewResult | null;
	previewError: string | null;
}

export function DeliveryTemplatePreview({ preview, previewError }: DeliveryTemplatePreviewProps) {
	return (
		<>
			{previewError && (
				<p className="ops-notice ops-notice--error" role="alert">
					{previewError}
				</p>
			)}
			{preview && (
				<div className="ops-preview">
					<span className="ops-preview__title">Как увидит пациент</span>
					<p className="ops-preview__text">{preview.text}</p>
					<span className="ops-note">
						{preview.length} симв. из {preview.limit}
						{preview.sms && (
							` · ${preview.sms.encoding === "ucs2" ? "кириллица" : "латиница"}, сегментов ${preview.sms.segments}, свободно ${preview.sms.charactersLeftInSegment} · расчёт: ${formatSmsCostRu(calculateSmsCostKopecks(preview.sms.segments, 1))}`
						)}
					</span>
					{(preview?.problems ?? []).length > 0 && (
						<p className="ops-notice ops-notice--error" role="alert">
							{(preview?.problems ?? []).join(" ")}
						</p>
					)}
				</div>
			)}
		</>
	);
}
