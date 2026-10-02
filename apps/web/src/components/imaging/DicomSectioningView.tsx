/**
 * DENTE CRM — Clinical CBCT Dental Arch Sectioning & Multi-Tile Cross-Sections
 * Mandate 8s: Canonically delegates Sectioning to CbctMprImplantStudioModal.
 * Eliminates duplicate mock screens with hardcoded SVG slices.
 */

import React from "react";
import { CbctMprImplantStudioModal } from "../radiology/CbctMprImplantStudioModal.js";

export interface DicomSectioningViewProps {
	readonly patientName?: string | undefined;
	readonly patientId?: string | undefined;
	readonly studyDate?: string | undefined;
	readonly toothFdiCode?: string | undefined;
	readonly onClose?: (() => void) | undefined;
	readonly onBackTo2D?: (() => void) | undefined;
	readonly onSwitchToMpr?: (() => void) | undefined;
	readonly onInsertToProtocol?: ((text: string) => void) | undefined;
}

export const DicomSectioningView: React.FC<DicomSectioningViewProps> = ({
	patientName,
	patientId,
	studyDate,
	onClose,
	onInsertToProtocol,
}) => {
	return (
		<CbctMprImplantStudioModal
			isOpen={true}
			onClose={onClose ?? (() => {})}
			patientName={patientName}
			patientId={patientId}
			initialViewLayout="layout_1_plus_3"
			initialStudioMode="implant"
			onApplyToDiary043={onInsertToProtocol}
		/>
	);
};

export const Ez3dSectioningView = DicomSectioningView;
export type Ez3dSectioningViewProps = DicomSectioningViewProps;
export default DicomSectioningView;
