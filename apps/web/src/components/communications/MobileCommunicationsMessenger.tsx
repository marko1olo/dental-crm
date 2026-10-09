/**
 * MobileCommunicationsMessenger.tsx — Sovereign Mobile Patient Messenger & Communications Layer
 * Designed per Apple iOS Human Interface Guidelines (iPhone 390×844 & 412×915).
 * Canonical Facade (<150 lines) delegating to modularized subcomponents in ./mobileMessenger.
 */

import React from "react";
import "./mobileCommunicationsMessenger.css";
import {
	MobileMessengerView,
	useMobileMessengerLogic,
	type MobileCommunicationsMessengerProps,
	type MobilePatientDialogSummary,
	type MobileChatMessageItem,
} from "./mobileMessenger";

export type {
	MobilePatientDialogSummary,
	MobileChatMessageItem,
	MobileCommunicationsMessengerProps,
};

export const MobileCommunicationsMessenger: React.FC<MobileCommunicationsMessengerProps> = (
	props,
) => {
	const logic = useMobileMessengerLogic(props);
	return <MobileMessengerView props={props} logic={logic} />;
};
