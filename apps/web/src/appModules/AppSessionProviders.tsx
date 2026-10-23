/**
 * DENTE Dental CRM — Application Session Providers (Layer 4)
 * Mandate 8b (Layer 4 UI Subcomponents), Mandate 8e (Doctor Autonomy).
 */

import React from "react";
import { AppLogicProvider } from "../contexts/AppLogicContext";
import { AuthProvider } from "../contexts/AuthContext";
import { useChairsideErgonomics } from "../hooks/useChairsideErgonomics";
import { useTelephonyRealtime } from "../hooks/useTelephonyRealtime";

interface AppSessionProvidersProps {
	appLogic: any;
	children: React.ReactNode;
}

export function AppSessionProviders({ appLogic, children }: AppSessionProvidersProps) {
	useChairsideErgonomics();
	useTelephonyRealtime();

	return (
		<AppLogicProvider value={appLogic}>
			<AuthProvider>{children}</AuthProvider>
		</AppLogicProvider>
	);
}
