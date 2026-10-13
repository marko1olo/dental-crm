import React from "react";
import { createPortal } from "react-dom";
import {
	IncomingCallCapsuleBar,
	IncomingCallHeaderBar,
	IncomingCallPatientContextCard,
	IncomingCallQuickBookingSection,
	IncomingCallActionFooter,
	useIncomingCallPopupController,
} from "./incomingCallPopupModules";
import "./telephonyFloatingWidget.css";

// 100% Transparent Re-exports (Zero-Downtime Contract & Mandate 8b)
export { CallAudioPlayer } from "./CallAudioPlayer";
export * from "./IncomingCallQuickBooking";
export * from "./IncomingCallerCard";
export * from "./IncomingCallPastHistory";
export * from "./IncomingCallBadgeMoreMenu";
export * from "./IncomingCallPatientDrawer";
export * from "./IncomingCallEmptyDrawer";
export * from "./useIncomingCallData";
export * from "./incomingCallPopupModules";
export { resolveTelephonyWsUrl } from "../../store/telephonyStore";

export function IncomingCallPopup(props?: { defaultExpanded?: boolean }): React.JSX.Element | null {
	const ctrl = useIncomingCallPopupController(props?.defaultExpanded);
	const {
		activeCall,
		currentCall,
		isDoctorMode,
		isDndActive,
		isFullScreenStudioActive,
		isPopupExpanded,
	} = ctrl;

	// In DND or fullscreen studio mode, completely suppress popups to prevent disruption
	if (isDndActive || isFullScreenStudioActive || !activeCall || !currentCall) return null;
	if (typeof document === "undefined") return null;

	// Doctor sterile zone & chairside chart immunity (Mandates 8e, 8n):
	// In doctor mode (chairside visit or doctor role), delicately collapse into non-intrusive capsule
	// rather than opening a blocking popup or silently dropping the call notification.
	const shouldShowCapsule = isDoctorMode || !isPopupExpanded;

	return createPortal(
		<div
			className="dnt-incoming-call-badge-container z-[9990] flex flex-col items-center pointer-events-none"
			style={{ zIndex: 9990 }}
			data-testid="incoming-call-badge-container"
		>
			{shouldShowCapsule ? (
				<IncomingCallCapsuleBar ctrl={ctrl} />
			) : (
				<section
					className="dnt-incoming-call-badge pointer-events-auto flex flex-col gap-2 p-3 sm:p-3.5 rounded-2xl border border-[var(--line-strong,var(--line,#e2e8f0))] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] shadow-2xl backdrop-blur-xl animate-badge-drop w-[380px] sm:w-[480px] max-w-[calc(100%-24px)]"
					aria-label="Входящий звонок телефонии"
					data-testid="incoming-call-popup"
				>
					<IncomingCallHeaderBar ctrl={ctrl} />
					<IncomingCallPatientContextCard ctrl={ctrl} />
					<IncomingCallQuickBookingSection ctrl={ctrl} />
					<IncomingCallActionFooter ctrl={ctrl} />
				</section>
			)}
		</div>,
		document.body,
	);
}

export default IncomingCallPopup;
