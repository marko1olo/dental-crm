/**
 * PhotoProtocolDropzone.tsx — Consolidated Canonical Photo Protocol Intake Delegate.
 *
 * Consolidates duplicate photo dropzone logic into canonical ClinicalPhotoProtocolModal.
 * Mandate 8d, 8e, 8n Best-of-Breed consolidation.
 */

import React, { useState } from "react";
import { UploadCloud, Camera } from "lucide-react";
import type { DentalPhotoSlotType } from "@dental/shared";
import type { ClinicalPhotoIntakeResult } from "../../services/imaging/medicalImageIntake";
import { ClinicalPhotoProtocolModal } from "../photography/ClinicalPhotoProtocolModal";

export interface PhotoProtocolDropzoneProps {
	patientId: string;
	visitId?: string | undefined;
	toothNumber?: number | undefined;
	activeSlotType?: DentalPhotoSlotType | undefined;
	initialStage?: ("before" | "during" | "after" | "followup") | undefined;
	onPhotoSaved?: ((result: ClinicalPhotoIntakeResult) => void) | undefined;
	onClose?: (() => void) | undefined;
	onPhotoProcessed?: ((result: ClinicalPhotoIntakeResult) => void) | undefined;
	onBatchCompleted?: ((results: ClinicalPhotoIntakeResult[]) => void) | undefined;
	className?: string | undefined;
}

export const PhotoProtocolDropzone: React.FC<PhotoProtocolDropzoneProps> = ({
	patientId,
	initialStage = "before",
	onPhotoSaved,
	onClose,
	onPhotoProcessed,
	onBatchCompleted,
	className = "",
}) => {
	const [isModalOpen, setIsModalOpen] = useState(false);

	return (
		<div className={`photo-protocol-dropzone-container ${className}`} style={{ padding: "12px" }}>
			<div
				role="button"
				tabIndex={0}
				onClick={() => setIsModalOpen(true)}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") setIsModalOpen(true);
				}}
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					gap: "8px",
					padding: "24px 16px",
					borderRadius: "12px",
					border: "2px dashed var(--line, #cbd5e1)",
					background: "var(--paper, #ffffff)",
					cursor: "pointer",
					minHeight: "100px",
					textAlign: "center",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--brand-primary, #2563eb)" }}>
					<UploadCloud size={24} />
					<Camera size={20} />
				</div>
				<span style={{ fontSize: "14px", fontWeight: 700, color: "var(--ink, #0f172a)" }}>
					Открыть фотопротокол клиники
				</span>
				<span style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>
					Загрузка снимков (HEIC, JPG, PNG), калибровка и сравнение До/После
				</span>
			</div>

			{isModalOpen && (
				<ClinicalPhotoProtocolModal
					isOpen={isModalOpen}
					onClose={() => {
						setIsModalOpen(false);
						onClose?.();
					}}
					patientId={patientId}
					initialStage={initialStage}
					onPhotoSaved={onPhotoSaved}
					onPhotoProcessed={onPhotoProcessed}
					onBatchCompleted={onBatchCompleted}
				/>
			)}
		</div>
	);
};

export default PhotoProtocolDropzone;
