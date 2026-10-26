/**
 * TelephonyDialpadModal.tsx — Canonical Softphone Dialpad Facade (Mandate 8b <= 20 lines)
 */
import React from "react";
import { TelephonyDialerModal, type TelephonyDialerModalProps } from "./TelephonyDialerModal";

export type TelephonyDialpadModalProps = TelephonyDialerModalProps;

export function TelephonyDialpadModal(props: TelephonyDialpadModalProps): React.JSX.Element | null {
	return <TelephonyDialerModal {...props} />;
}

export default TelephonyDialpadModal;
