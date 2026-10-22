import React from "react";
import { TelephonyDrawer } from "./TelephonyDrawer";

export interface IncomingCallEmptyDrawerProps {
	isOpen: boolean;
	onClose: () => void;
	isConnected?: boolean;
	onOpenDialer?: () => void;
}

/**
 * IncomingCallEmptyDrawer — Consolidated SSOT Facade.
 * All empty/call log drawer states are canonically handled by TelephonyDrawer.tsx.
 */
export function IncomingCallEmptyDrawer({
	isOpen,
	onClose,
}: IncomingCallEmptyDrawerProps): React.JSX.Element | null {
	if (!isOpen) return null;

	return (
		<TelephonyDrawer
			isOpen={isOpen}
			onClose={onClose}
			call={null}
		/>
	);
}

export default IncomingCallEmptyDrawer;

