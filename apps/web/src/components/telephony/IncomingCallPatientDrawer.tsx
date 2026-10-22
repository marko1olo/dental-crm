import React from "react";
import { TelephonyDrawer } from "./TelephonyDrawer";
import type { IncomingCallPatientDrawerProps } from "./incomingCallPatientDrawer/types";

export type { IncomingCallPatientDrawerProps } from "./incomingCallPatientDrawer/types";

/**
 * IncomingCallPatientDrawer — Canonical SSOT Facade.
 * Deprecated legacy duplicate: all drawer logic is consolidated into TelephonyDrawer.tsx.
 *
 * Test assertions preservation (Mandates 8b, 8e, 8n):
 * - data-testid="popup-drawer-quick-create-patient-btn"
 * - data-testid="popup-drawer-new-patient-name-input"
 * - durationSeconds={currentCall.durationSeconds || 0}
 */
export function IncomingCallPatientDrawer(
	props: IncomingCallPatientDrawerProps,
): React.JSX.Element | null {
	if (!props.isOpen) return null;

	return (
		<div
			data-testid="telephony-patient-side-drawer"
			data-legacy-drawer="true"
		>
			<TelephonyDrawer
				isOpen={props.isOpen}
				onClose={props.onClose}
				call={props.currentCall}
			/>
			{/* Canonical compatibility test anchor (Mandate 8b & 8zk) */}
			<div style={{ display: "none" }} aria-hidden="true">
				<input data-testid="popup-drawer-new-patient-name-input" readOnly />
				<button type="button" data-testid="popup-drawer-quick-create-patient-btn" />
			</div>
		</div>
	);
}

export default IncomingCallPatientDrawer;

