/**
 * MedicalPhotoViewer.tsx — Consolidated Canonical Medical Photo Viewer.
 *
 * Consolidates duplicate photo viewer logic into canonical BeforeAfterComparisonView
 * and ClinicalPhotoProtocolModal.
 * Mandate 8d, 8e, 8n Best-of-Breed consolidation.
 */

import React from "react";
import { X, Camera } from "lucide-react";
import type { VitaShadeReference } from "@dental/shared";
import type { ClinicalPhotoIntakeResult } from "../../services/imaging/medicalImageIntake";
import { BeforeAfterComparisonView } from "../photography/BeforeAfterComparisonView";
import { STANDARD_12_SLOT_PROTOCOL } from "../photography/photoGridPresets";

export interface MedicalPhotoViewerProps {
	photo: ClinicalPhotoIntakeResult | {
		imageUrl: string;
		title?: string;
		slotType?: string;
		colorSpace?: string;
		exif?: {
			make?: string;
			model?: string;
			iso?: number;
			captureTimestampIso?: string;
			hasWideGamutP3?: boolean;
		};
	};
	comparisonPhotoUrl?: string;
	onClose?: () => void;
	onVitaShadeMatched?: (shade: VitaShadeReference, deltaE: number) => void;
}

export const MedicalPhotoViewer: React.FC<MedicalPhotoViewerProps> = ({
	photo,
	comparisonPhotoUrl,
	onClose,
}) => {
	const currentImageUrl = "fullImageUrl" in photo ? photo.fullImageUrl : photo.imageUrl;
	const title = "title" in photo && photo.title ? photo.title : "Клинический снимок";

	const slotsData: Record<string, any> = {
		before: { slotId: "before", imageUrl: currentImageUrl },
		after: { slotId: "after", imageUrl: comparisonPhotoUrl || currentImageUrl },
	};

	return (
		<div
			className="photo-protocol-modal-backdrop"
			role="dialog"
			aria-modal="true"
			aria-label="Просмотр клинической фотографии"
			style={{
				position: "fixed",
				inset: 0,
				background: "rgba(15, 23, 42, 0.75)",
				backdropFilter: "blur(4px)",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				zIndex: 9999,
				padding: "16px",
			}}
		>
			<div
				style={{
					background: "var(--paper, #ffffff)",
					borderRadius: "16px",
					width: "100%",
					maxWidth: "1100px",
					height: "90vh",
					display: "flex",
					flexDirection: "column",
					overflow: "hidden",
					boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
				}}
			>
				{/* Top Bar */}
				<div
					style={{
						padding: "14px 20px",
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						borderBottom: "1px solid var(--line, #e2e8f0)",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
						<Camera size={20} color="var(--brand-primary, #2563eb)" />
						<h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--ink, #0f172a)" }}>
							{title}
						</h3>
					</div>
					{onClose && (
						<button
							type="button"
							onClick={onClose}
							aria-label="Закрыть"
							style={{
								border: "none",
								background: "none",
								cursor: "pointer",
								padding: "8px",
								borderRadius: "8px",
								minHeight: "44px",
								minWidth: "44px",
								display: "inline-flex",
								alignItems: "center",
								justifyContent: "center",
							}}
						>
							<X size={20} />
						</button>
					)}
				</div>

				{/* Body: Before/After slider & zoom viewer */}
				<div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
					<BeforeAfterComparisonView
						preset={STANDARD_12_SLOT_PROTOCOL}
						slotsData={slotsData}
						beforeSlotId="before"
						afterSlotId="after"
						beforePhotoUrl={currentImageUrl}
						afterPhotoUrl={comparisonPhotoUrl || currentImageUrl}
					/>
				</div>
			</div>
		</div>
	);
};

export default MedicalPhotoViewer;
