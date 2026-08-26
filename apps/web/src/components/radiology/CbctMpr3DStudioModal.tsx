/**
 * DENTE CRM — CBCT 3D MPR & Implant Studio Modal (Forwarding wrapper)
 */

import type React from "react";
import { CbctMprImplantStudioModal } from "./CbctMprImplantStudioModal";
import type { RadiologyStudy } from "./types";

export interface CbctMpr3DStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly study?: RadiologyStudy | null | undefined;
	readonly patientName?: string | undefined;
	readonly studyDate?: string | undefined;
	readonly onApplySurgeryProtocolToSoap?: ((soapText: string) => void) | undefined;
}

export const CbctMpr3DStudioModal: React.FC<CbctMpr3DStudioModalProps> = ({
	isOpen,
	onClose,
	study,
	onApplySurgeryProtocolToSoap,
}) => {
	return (
		<CbctMprImplantStudioModal
			isOpen={isOpen}
			onClose={onClose}
			study={study ?? undefined}
			onApplyToDiary043={onApplySurgeryProtocolToSoap}
		/>
	);
};

export default CbctMpr3DStudioModal;
