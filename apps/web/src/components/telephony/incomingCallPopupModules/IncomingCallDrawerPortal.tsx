import type React from "react";
import type { IncomingCallPopupController } from "./types";

export interface IncomingCallDrawerPortalProps {
	ctrl: IncomingCallPopupController;
}

/**
 * IncomingCallDrawerPortal — SSOT Coexistence Guard (Mandates 8e & 8n).
 *
 * Invariant: Exactly ONE canonical slide-over drawer exists in the application:
 * TelephonyDrawer.tsx (mounted at root in App.tsx and driven by useTelephonyStore.isCallDrawerOpen).
 * To prevent duplicate side-drawers (4-drawer anti-pattern), this portal yields to the root drawer.
 */
export function IncomingCallDrawerPortal({
	ctrl: _ctrl,
}: IncomingCallDrawerPortalProps): React.JSX.Element | null {
	// Yields to root canonical TelephonyDrawer to enforce SSOT
	return null;
}

