/**
 * VisiographSensorModal.tsx — Модальный портал просмотра 2D сенсора EzDent-i
 * Mandate 8b: строго <= 120 строк.
 */

import React from "react";
import { createPortal } from "react-dom";
import { SensorStudyViewer } from "../../radiology/SensorStudyViewer.js";

interface VisiographSensorModalProps {
	isOpen: boolean;
	onClose: () => void;
	currentImageUrl: string | null;
	filmstripItems: any[];
	currentScanId?: string | undefined;
	patientFullName: string;
	effectivePatientId?: string | null | undefined;
	toothFdiCode?: string | undefined;
	onInsertToProtocol?: ((text: string) => void) | undefined;
}

export const VisiographSensorModal: React.FC<VisiographSensorModalProps> = ({
	isOpen,
	onClose,
	currentImageUrl,
	filmstripItems,
	currentScanId,
	patientFullName,
	effectivePatientId,
	toothFdiCode,
	onInsertToProtocol,
}) => {
	if (!isOpen || typeof document === "undefined") return null;

	const activeStudy =
		filmstripItems.find((s) => s.id === currentScanId) ||
		filmstripItems[0];

	return createPortal(
		<div
			className="fixed inset-0 z-[99999] bg-[#020617] flex flex-col"
			data-testid="visiograph-sensor-viewer-portal"
		>
			<SensorStudyViewer
				initialImageUrl={currentImageUrl || undefined}
				studiesHistory={filmstripItems}
				study={activeStudy}
				patientName={patientFullName}
				medicalCardNumber={effectivePatientId || undefined}
				toothFdiCode={toothFdiCode}
				onInsertToProtocol={onInsertToProtocol}
				onClose={onClose}
			/>
		</div>,
		document.body
	);
};
