/**
 * DENTE Dental CRM — Application Session & Auth State Hook (Layer 3)
 * Mandate 8b (Layer 3 Hooks), Mandate 8e (Doctor Autonomy).
 */

import { useCallback, useEffect, useState } from "react";
import type { AppSessionAuthState } from "./appStateTypes";
import type { StaffUser } from "../components/auth/staffPinPad/staffPinPadTypes";
import type { StaffRole } from "../store/appStoreModules/types";
import { isDemoUrlActive } from "./appRoutingHelpers";
import { clearOfflineClinicCaches } from "../lib/offlineStorage";
import { clearApiCache, setApiCacheScope } from "../lib/apiCache/index";
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
import { logger } from "../utils/logger";

export function useAppSessionAuth(setSelectedWorkspaceRole?: (r: StaffRole) => void): AppSessionAuthState {
	const isDemo = isDemoUrlActive();
	const [clinicAuthed, setClinicAuthed] = useState<boolean>(() => isDemo || Boolean(readDenteClinicToken()));
	const [staffAuthed, setStaffAuthed] = useState<boolean>(() => isDemo || Boolean(readDenteStaffToken()));
	const [activeStaffUser, setActiveStaffUser] = useState<StaffUser | null>(null);
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
		if (!s) return;
		const params = new URLSearchParams(s);

		const clinicServer = params.get("clinic_server");
		if (clinicServer && /^https?:\/\//i.test(clinicServer)) {
			const normalized = clinicServer.replace(/\/+$/, "");
			safeLocalStorageSetItem("dente_lan_server_url", normalized, true);
			safeLocalStorageSetItem("dente_active_api_base_url", `${normalized}/api`, true);
		}

		if (s.includes("pair=") || s.includes("token=")) {
			const token = params.get("pair") || params.get("token");
			if (token) {
				fetch("/api/network/pair/verify", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						token,
						pin: params.get("pin") || undefined,
						deviceName: "Mobile / Tablet at chair",
					}),
				})
					.then((res) => (res.ok ? res.json() : null))
					.then((raw) => {
						const data = raw?.data ?? raw;
						if (data?.ok && data.clinicToken) {
							setApiCacheScope(null);
							clearApiCache();
							safeLocalStorageSetItem(DENTE_CLINIC_TOKEN_KEY, data.clinicToken);
							setClinicAuthed(true);
							if (data.staffToken) {
								safeLocalStorageSetItem(DENTE_STAFF_TOKEN_KEY, data.staffToken);
								setStaffAuthed(true);
							} else {
								safeLocalStorageRemoveItem(DENTE_STAFF_TOKEN_KEY);
								setStaffAuthed(false);
								setShowStaffPinPad(true);
							}
							if (data.role) setSelectedWorkspaceRole?.(data.role);
							window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
						}
					})
					.catch((err: unknown) => {
						logger.warn("Failed to verify pairing token:", err);
					});
			}
		} else if (s.includes("pair_pin=")) {
			const pin = (params.get("pair_pin") || "").trim();
			const clinicId = (params.get("clinic_id") || "").trim() || undefined;
			const masterIp = (params.get("master_ip") || "").trim();
			const apiPort = (params.get("api_port") || "4100").trim();
			if (/^\d{6}$/.test(pin)) {
				const targetOrigin =
					masterIp && /^(\d{1,3}\.){3}\d{1,3}$/.test(masterIp)
						? `http://${masterIp}:${apiPort}`
						: "";
				if (targetOrigin) {
					safeLocalStorageSetItem("dente_lan_server_url", targetOrigin, true);
					safeLocalStorageSetItem("dente_active_api_base_url", `${targetOrigin}/api`, true);
				}
				const endpoint = targetOrigin
					? `${targetOrigin}/api/network/mesh/auto-join/verify`
					: "/api/network/mesh/auto-join/verify";
				const idemKey = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
					? crypto.randomUUID()
					: undefined;
				fetch(endpoint, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						...(idemKey ? { "Idempotency-Key": idemKey } : {}),
					},
					body: JSON.stringify({
						pin,
						...(clinicId ? { organizationId: clinicId } : {}),
						clientName: "Планшет / Рабочее место клиники",
					}),
				})
					.then((res) => (res.ok ? res.json() : null))
					.then((raw) => {
						const data = raw?.data ?? raw;
						const clinicToken = data?.clinicToken || data?.join?.clinicToken;
						if (data?.ok && clinicToken) {
							setApiCacheScope(null);
							clearApiCache();
							safeLocalStorageSetItem(DENTE_CLINIC_TOKEN_KEY, clinicToken);
							if (data?.join?.meshToken) {
								safeLocalStorageSetItem("dente_mesh_token", data.join.meshToken);
							}
							safeLocalStorageRemoveItem(DENTE_STAFF_TOKEN_KEY);
							setClinicAuthed(true);
							setStaffAuthed(false);
							setShowStaffPinPad(true);
							if (data?.join?.assignedRole === "doctor" || data?.join?.assignedRole === "assistant") {
								setSelectedWorkspaceRole?.(data.join.assignedRole);
							}
							window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
						}
					})
					.catch((err: unknown) => {
						logger.warn("Failed to verify auto-join PIN:", err);
					});
			}
		}
	}, [setSelectedWorkspaceRole]);

	useEffect(() => {
		if (activeStaffUser?.id) {
			const clinicToken = readDenteClinicToken();
			const scopeKey = `${clinicToken ? "clinic" : "demo"}:${activeStaffUser.id}`;
			setApiCacheScope(scopeKey);
		} else if (!staffAuthed || !clinicAuthed) {
			setApiCacheScope(null);
		}
	}, [activeStaffUser?.id, staffAuthed, clinicAuthed]);

	const handleLockSession = useCallback(() => {
		safeLocalStorageSetItem("dente_session_locked", "true");
		setIsSessionLocked(true);
	}, []);

	const handleClinicLogout = useCallback(() => {
		clearOfflineClinicCaches();
		setApiCacheScope(null);
		clearApiCache();
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
		setApiCacheScope(null);
		clearApiCache();
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
