/**
 * DENTE Dental CRM — Application Session & Auth State Hook (Layer 3)
 * Mandate 8b (Layer 3 Hooks), Mandate 8e (Doctor Autonomy).
 */

import { useCallback, useEffect, useState } from "react";
import type { AppSessionAuthState } from "./appStateTypes";
import { isDemoUrlActive } from "./appRoutingHelpers";
import { clearOfflineClinicCaches } from "../lib/offlineStorage";
import {
	DENTE_CLINIC_TOKEN_KEY,
	DENTE_PRIVACY_SHIELD_LOCKED_KEY,
	DENTE_STAFF_TOKEN_KEY,
	readDenteClinicToken,
	readDenteStaffToken,
	safeLocalStorageGetItem,
	safeLocalStorageRemoveItem,
	safeLocalStorageSetItem,
} from "../lib/safeLocalStorage";

export function useAppSessionAuth(setSelectedWorkspaceRole?: (r: any) => void): AppSessionAuthState {
	const isDemo = isDemoUrlActive();
	const [clinicAuthed, setClinicAuthed] = useState<boolean>(() => isDemo || Boolean(readDenteClinicToken()));
	const [staffAuthed, setStaffAuthed] = useState<boolean>(() => isDemo || Boolean(readDenteStaffToken()));
	const [activeStaffUser, setActiveStaffUser] = useState<any>(null);
	const [showStaffPinPad, setShowStaffPinPad] = useState<boolean>(false);
	const [isSessionLocked, setIsSessionLocked] = useState<boolean>(
		() => typeof window !== "undefined" && safeLocalStorageGetItem("dente_session_locked") === "true",
	);
	const [isPrivacyShieldActive, setIsPrivacyShieldActive] = useState<boolean>(
		() => typeof window !== "undefined" && safeLocalStorageGetItem(DENTE_PRIVACY_SHIELD_LOCKED_KEY) === "true",
	);

	useEffect(() => {
		const handlePrivacy = (e: Event) => {
			const active = (e as CustomEvent<{ active: boolean }>)?.detail?.active;
			if (active !== undefined) {
				setIsPrivacyShieldActive(active);
				if (active) safeLocalStorageSetItem(DENTE_PRIVACY_SHIELD_LOCKED_KEY, "true");
				else safeLocalStorageRemoveItem(DENTE_PRIVACY_SHIELD_LOCKED_KEY);
			}
		};
		window.addEventListener("dente:privacy-shield-toggled", handlePrivacy);
		return () => window.removeEventListener("dente:privacy-shield-toggled", handlePrivacy);
	}, []);

	useEffect(() => {
		if (typeof window === "undefined") return;
		const s = window.location.search || "";
		if (s && (s.includes("pair=") || s.includes("token="))) {
			const params = new URLSearchParams(s);
			const token = params.get("pair") || params.get("token");
			if (token) {
				fetch("/api/network/pair/verify", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ token, pin: params.get("pin") || undefined, deviceName: "Mobile / Tablet at chair" }),
				})
					.then((res) => (res.ok ? res.json() : null))
					.then((data) => {
						if (data?.ok && data.clinicToken && data.staffToken) {
							safeLocalStorageSetItem(DENTE_CLINIC_TOKEN_KEY, data.clinicToken);
							safeLocalStorageSetItem(DENTE_STAFF_TOKEN_KEY, data.staffToken);
							setClinicAuthed(true);
							setStaffAuthed(true);
							if (data.role) setSelectedWorkspaceRole?.(data.role);
							window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
						}
					})
					.catch(() => {});
			}
		}
	}, [setSelectedWorkspaceRole]);

	const handleLockSession = useCallback(() => {
		safeLocalStorageSetItem("dente_session_locked", "true");
		setIsSessionLocked(true);
	}, []);

	const handleClinicLogout = useCallback(() => {
		clearOfflineClinicCaches();
		safeLocalStorageRemoveItem(DENTE_CLINIC_TOKEN_KEY);
		safeLocalStorageRemoveItem(DENTE_STAFF_TOKEN_KEY);
		safeLocalStorageRemoveItem(DENTE_PRIVACY_SHIELD_LOCKED_KEY);
		safeLocalStorageRemoveItem("dente_session_locked");
		setClinicAuthed(false);
		setStaffAuthed(false);
		setActiveStaffUser(null);
		setIsPrivacyShieldActive(false);
		setIsSessionLocked(false);
		if (typeof window !== "undefined") window.location.hash = "#/auth/login";
	}, []);

	const handleFullStaffLock = useCallback(() => {
		safeLocalStorageSetItem("dente_session_locked", "true");
		safeLocalStorageRemoveItem(DENTE_STAFF_TOKEN_KEY);
		setStaffAuthed(false);
		setActiveStaffUser(null);
		setIsSessionLocked(true);
		setShowStaffPinPad(true);
	}, []);

	return {
		clinicAuthed, setClinicAuthed,
		staffAuthed, setStaffAuthed,
		activeStaffUser, setActiveStaffUser,
		showStaffPinPad, setShowStaffPinPad,
		isSessionLocked, setIsSessionLocked,
		isPrivacyShieldActive, setIsPrivacyShieldActive,
		handleLockSession, handleClinicLogout, handleFullStaffLock,
	};
}
