import type { IncomingCallPayload } from "../../../store/telephonyStore";

export interface TelephonyToastProps {
	call?: IncomingCallPayload | null | undefined;
	onOpenCard?: ((patientId?: string | undefined) => void) | undefined;
	onQuickBook?: ((patientId?: string | undefined, patientName?: string | undefined, phone?: string | undefined) => void) | undefined;
	onReject?: (() => void) | undefined;
	onAnswer?: (() => void) | undefined;
	onClose?: (() => void) | undefined;
	className?: string | undefined;
	suppressInSterileZone?: boolean | undefined;
}
