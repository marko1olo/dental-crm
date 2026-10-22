/**
 * TelephonyDialpadModal.tsx — Canonical Receptionist & Doctor Softphone Dialpad Modal
 * 
 * Mandate 8e: Doctor & chairside autonomy (non-blocking, buttons never disabled).
 * Mandate 8n: Solo doctor & small clinic 1-click outgoing calls.
 * Apple HIG: Touch targets >= 44x44px, bottom-sheet adaptivity on mobile.
 */

import React from "react";
import {
	TelephonyDialerModal,
	type TelephonyDialerModalProps,
} from "./TelephonyDialerModal";

export type TelephonyDialpadModalProps = TelephonyDialerModalProps;

export function TelephonyDialpadModal(props: TelephonyDialpadModalProps): React.JSX.Element | null {
	return <TelephonyDialerModal {...props} />;
}

export default TelephonyDialpadModal;
