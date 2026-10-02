/**
 * DENTE CRM — Clinical CBCT MPR Cockpit Component
 * Mandate 8s: Canonically delegates 3D MPR to CbctMprImplantStudioModal.
 * Eliminates duplicate mock screens with hardcoded SVG slices.
 */

import React from "react";
import { CbctMprImplantStudioModal } from "../radiology/CbctMprImplantStudioModal.js";

export interface DicomMprCockpitProps {
	readonly patientName?: string | undefined;
	readonly patientId?: string | undefined;
	readonly studyDate?: string | undefined;
	readonly sliceCount?: number | undefined;
	readonly dimensions?: string | undefined;
	readonly voxelSpacing?: string | undefined;
	readonly onBackTo2D?: (() => void) | undefined;
	readonly onSwitchToSectioning?: (() => void) | undefined;
	readonly onClose?: (() => void) | undefined;
	readonly onInsertToProtocol?: ((text: string) => void) | undefined;
}

export const DicomMprCockpit: React.FC<DicomMprCockpitProps> = ({
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
			initialViewLayout="quad_view"
			initialStudioMode="diagnostic"
			onApplyToDiary043={onInsertToProtocol}
		/>
	);
};

export const Ez3dMprCockpit = DicomMprCockpit;
export type Ez3dMprCockpitProps = DicomMprCockpitProps;
export default DicomMprCockpit;
