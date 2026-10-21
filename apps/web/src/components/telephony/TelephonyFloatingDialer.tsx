/**
 * TelephonyFloatingDialer.tsx — Canonical Floating Dialer & Softphone
 * 
 * Mandate 8e: Doctor & Reception Autonomy.
 * Mandate 8n: Solo Doctor Quiet Mode.
 */

import React from "react";
import { TelephonyFloatingWidget, type TelephonyFloatingWidgetProps } from "./TelephonyFloatingWidget";

export interface TelephonyFloatingDialerProps extends TelephonyFloatingWidgetProps {
	suppressCallModal?: boolean;
}

export function TelephonyFloatingDialer(props: TelephonyFloatingDialerProps): React.JSX.Element | null {
	return <TelephonyFloatingWidget {...props} />;
}

export default TelephonyFloatingDialer;
