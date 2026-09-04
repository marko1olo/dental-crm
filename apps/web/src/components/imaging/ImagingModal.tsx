/**
 * DENTE CRM — Imaging Modal (RVG / DICOM / Radiography)
 * High-performance medical imaging modal with <50ms instant display,
 * independent on-demand AI trigger, and 1-click 043/u objective status protocol insertion.
 * Mandate 8e: No AI blocking on open, doctor approval required for chart changes.
 */

import React, { useEffect, useState } from "react";
import { DicomViewerModal, type DicomViewerModalProps } from "./DicomViewerModal.js";

export interface ImagingModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly scanId?: string | undefined;
	readonly imageSrc?: string | undefined;
	readonly modality?: "RVG" | "OPTG" | "CBCT" | "PHOTO" | undefined;
	readonly title?: string | undefined;
	readonly toothFdiCode?: string | undefined;
	readonly patientName?: string | undefined;
	readonly studyDate?: string | undefined;
	readonly onInsertToProtocol?: ((text: string) => void) | undefined;
}

export const ImagingModal: React.FC<ImagingModalProps> = ({
	isOpen,
	onClose,
	scanId,
	imageSrc,
	modality = "RVG",
	title,
	toothFdiCode,
	patientName,
	studyDate,
	onInsertToProtocol,
}) => {
	const [activeSrc, setActiveSrc] = useState<string>(imageSrc || "");

	useEffect(() => {
		if (imageSrc) {
			setActiveSrc(imageSrc);
			return;
		}

		if (isOpen && scanId && !imageSrc) {
			// Direct fast streaming URL without blocking AI
			setActiveSrc(`/api/xray/scans/${encodeURIComponent(scanId)}/file`);
		}
	}, [isOpen, scanId, imageSrc]);

	if (!isOpen) return null;

	const modalTitle =
		title ||
		(modality === "RVG"
			? `Визиография (RVG)${toothFdiCode ? ` — зуб ${toothFdiCode}` : ""}`
			: modality === "OPTG"
				? "Ортопантомограмма (ОПТГ)"
				: modality === "CBCT"
					? "Конусно-лучевая КТ (КЛКТ)"
					: "Медицинское изображение");

	return (
		<DicomViewerModal
			isOpen={isOpen}
			onClose={onClose}
			imageSrc={activeSrc}
			title={modalTitle}
			toothFdiCode={toothFdiCode}
			patientName={patientName}
			studyDate={studyDate}
			onInsertToProtocol={onInsertToProtocol}
		/>
	);
};

export default ImagingModal;
