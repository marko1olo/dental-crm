import type { OpgToothSlot } from "../opgTopologicalEngine";

export interface SmartOpgViewerModalProps {
	isOpen: boolean;
	onClose: () => void;
	imageUrl?: string | undefined;
	onApplyOdontogram?: ((teethMap: Record<number, OpgToothSlot>) => void) | undefined;
	patientName?: string | undefined;
	patientId?: string | undefined;
}
