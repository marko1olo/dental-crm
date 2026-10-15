import React from "react";
import { TelephonyDialpad } from "./telephonyFloatingWidget/TelephonyDialpad";
import type { TelephonyDialpadProps } from "./telephonyFloatingWidget/types";

export type TelephonyDialerPadProps = TelephonyDialpadProps;

/**
 * TelephonyDialerPad — SSOT Compatibility Facade
 * Delegates directly to canonical TelephonyDialpad to prevent code duplication.
 */
export function TelephonyDialerPad(props: TelephonyDialerPadProps) {
	return <TelephonyDialpad {...props} />;
}

