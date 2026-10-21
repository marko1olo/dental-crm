/**
 * useTelephonyState.ts — Canonical Telephony State & Autonomy Facade Hook
 * 
 * Mandate 8e: Chairside sterile zone immunity (suppressCallModal).
 * Mandate 8n: Solo doctor & receptionist 1-click workflows.
 */

import { useEffect, useState } from "react";
import { useAppStore } from "../../store/appStore";
import { useTelephonyStore } from "../../store/telephonyStore";
import { useTelephonyFloatingState } from "./telephonyFloatingWidget/useTelephonyFloatingState";
import type { TelephonyFloatingWidgetProps } from "./telephonyFloatingWidget/types";

export interface UseTelephonyStateOptions extends TelephonyFloatingWidgetProps {
	suppressCallModal?: boolean;
}

export function useTelephonyState(options: UseTelephonyStateOptions = {}) {
	const floatingState = useTelephonyFloatingState(options);
	const currentView = useAppStore((s) => s.currentView);
	const selectedWorkspaceRole = useAppStore((s) => s.selectedWorkspaceRole);

	const [hash, setHash] = useState(() => (typeof window !== "undefined" ? window.location.hash : ""));

	useEffect(() => {
		const handleHashChange = () => {
			setHash(window.location.hash);
		};
		window.addEventListener("hashchange", handleHashChange);
		return () => window.removeEventListener("hashchange", handleHashChange);
	}, []);

	const isSterileZone =
		Boolean(options.suppressCallModal) ||
		selectedWorkspaceRole === "doctor" ||
		(currentView as string) === "visit" ||
		(currentView as string) === "odontogram" ||
		(currentView as string) === "periodontics" ||
		hash.includes("#visit") ||
		hash.includes("#odontogram") ||
		hash.includes("#periodontics");

	return {
		...floatingState,
		isSterileZone,
		suppressCallModal: isSterileZone,
		currentView,
		selectedWorkspaceRole,
	};
}

export default useTelephonyState;
