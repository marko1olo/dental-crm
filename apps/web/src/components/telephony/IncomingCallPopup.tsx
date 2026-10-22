import React from "react";
import { createPortal } from "react-dom";
import {
	IncomingCallCapsuleBar,
	IncomingCallHeaderBar,
	IncomingCallPatientContextCard,
	IncomingCallQuickBookingSection,
	IncomingCallActionFooter,
	IncomingCallDrawerPortal,
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
export * from "./initiateOutboundCall";
export * from "./incomingCallPopupModules";
export { resolveTelephonyWsUrl } from "../../store/telephonyStore";

export interface IncomingCallPopupProps {
	defaultExpanded?: boolean;
	suppressCallModal?: boolean;
}

export function IncomingCallPopup(props?: IncomingCallPopupProps): React.JSX.Element | null {
	const ctrl = useIncomingCallPopupController(props?.defaultExpanded, props?.suppressCallModal);
	const {
		activeCall,
		currentCall,
		isDoctorMode,
		isDndActive,
		isFullScreenStudioActive,
		isPopupExpanded,
	} = ctrl;

	// Doctor sterile zone & chairside chart immunity (Mandates 8e, 8n):
	// if (!activeCall || isDoctorMode || isDndActive) return null; — full blocking popups are suppressed
	// Вместо перекрытия экрана вызов деликатно сворачивается в компактную капсулу Dynamic Island
	if (!activeCall || isDndActive || isFullScreenStudioActive || !currentCall) return null;
	if (typeof document === "undefined") return null;

	const shouldShowCapsule = isDoctorMode || !isPopupExpanded;

	return createPortal(
		<>
			<div
				className="dnt-incoming-call-badge-container z-[9990] flex flex-col pointer-events-none"
				style={{ zIndex: 9990 }}
				data-testid="incoming-call-badge-container"
			>
				{shouldShowCapsule ? (
					<IncomingCallCapsuleBar ctrl={ctrl} />
				) : (
					<section
						className="dnt-incoming-call-badge pointer-events-auto flex flex-col gap-2 p-3 sm:p-3.5 rounded-2xl border border-[var(--line-strong,var(--line,#e2e8f0))] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] shadow-2xl backdrop-blur-xl animate-badge-drop w-full max-w-[480px] box-border"
						aria-label="Входящий звонок телефонии"
						data-testid="incoming-call-popup"
					>
						<IncomingCallHeaderBar ctrl={ctrl} />
						<IncomingCallPatientContextCard ctrl={ctrl} />
						<IncomingCallQuickBookingSection ctrl={ctrl} />
						<IncomingCallActionFooter ctrl={ctrl} />
					</section>
				)}
			</div>

			<IncomingCallDrawerPortal ctrl={ctrl} />
		</>,
		document.body,
	);
}

export default IncomingCallPopup;
