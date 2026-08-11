import { useEffect, useRef, useState } from "react";
import { showToast } from "../components/GlobalToast";
import { actionFailureToast } from "../lib/panelStateText";
import {
	DENTE_CLINIC_TOKEN_KEY,
	DENTE_STAFF_TOKEN_KEY,
	readDenteClinicToken,
	readDenteStaffToken,
	safeLocalStorageRemoveItem,
} from "../lib/safeLocalStorage";
import { logger } from "../utils/logger";

/**
 * Handles the dual-tier session state (clinic & staff), auto-locking,
 * and user profile restoration.
 */
export function useAppSession(
	dashboard: any,
	loadDashboard: () => Promise<void>,
) {
	const [clinicAuthed, setClinicAuthed] = useState<boolean>(() => {
		return !!readDenteClinicToken();
	});
	const [staffAuthed, setStaffAuthed] = useState<boolean>(() => {
		return !!readDenteStaffToken();
	});
	const [showStaffPinPad, setShowStaffPinPad] = useState<boolean>(false);
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const [activeStaffUser, setActiveStaffUser] = useState<any>(null);
	const staffProfileFetchAttemptedRef = useRef<boolean>(false);

	// On mount: if clinic token already in localStorage (page refresh / persisted session), load dashboard + restore user profile
	useEffect(() => {
		if (clinicAuthed && !dashboard) {
			void loadDashboard().catch((e) => {
				// Only force re-login on explicit 401 auth failure, not network/db errors
				// biome-ignore lint/suspicious/noExplicitAny: automated suppression
				const statusCode = (e as any)?.statusCode ?? (e as any)?.status ?? 0;
				const is401 =
					statusCode === 401 ||
					(e instanceof Error &&
						(e.message.includes("401") || e.message.includes("Unauthorized")));
				if (is401) {
					logger.warn(
						"[Dente] Clinic token invalid (401), forcing re-login:",
						e,
					);
					safeLocalStorageRemoveItem(DENTE_CLINIC_TOKEN_KEY);
					safeLocalStorageRemoveItem(DENTE_STAFF_TOKEN_KEY);
					setClinicAuthed(false);
					setStaffAuthed(false);
				} else {
					// Network/DB error: keep session, fallback dashboard already set by loadDashboard
					logger.warn(
						"[Dente] Dashboard load failed (network/db), keeping session with fallback:",
						e,
					);
				}
			});
		}

		// Restore staff user profile from token on page refresh
		const staffToken = readDenteStaffToken() || null;
		if (
			staffToken &&
			!activeStaffUser &&
			!staffProfileFetchAttemptedRef.current
		) {
			staffProfileFetchAttemptedRef.current = true;
			fetch("/api/auth/user/me", {
				headers: { "x-dente-staff-token": staffToken },
			})
				.then((r) => {
					if (r.status === 401 || r.status === 403) {
						safeLocalStorageRemoveItem(DENTE_STAFF_TOKEN_KEY);
						setStaffAuthed(false);
						setActiveStaffUser(null);
						return null;
					}
					return r.ok ? r.json() : null;
				})
				.then((data) => {
					if (data?.user) {
						setActiveStaffUser(data.user);
					} else if (data !== null) {
						safeLocalStorageRemoveItem(DENTE_STAFF_TOKEN_KEY);
						setStaffAuthed(false);
						setActiveStaffUser(null);
					}
				})
				.catch((err) => {
					logger.error("[Dente] auth check error:", err);
					showToast(
						actionFailureToast(
							"Не удалось загрузить профиль пользователя",
							(err as { status?: number })?.status ?? null,
						),
						"error",
					);
				});
		}
	}, [loadDashboard, dashboard, clinicAuthed, activeStaffUser]); // Run once on mount only

	// Auto-lock on inactivity (5 minutes)
	useEffect(() => {
		if (!clinicAuthed || !staffAuthed) return;

		let timer: ReturnType<typeof setTimeout>;

		const resetTimer = () => {
			clearTimeout(timer);
			timer = setTimeout(
				() => {
					setStaffAuthed(false);
					setShowStaffPinPad(true);
					safeLocalStorageRemoveItem(DENTE_STAFF_TOKEN_KEY);
				},
				5 * 60 * 1000,
			);
		};

		const events = ["mousemove", "keydown", "pointerdown", "touchstart"];

		events.forEach((e) => {
			document.addEventListener(e, resetTimer, { passive: true });
		});

		resetTimer();

		return () => {
			clearTimeout(timer);
			events.forEach((e) => {
				document.removeEventListener(e, resetTimer);
			});
		};
	}, [clinicAuthed, staffAuthed]);

	const handleClinicLogout = () => {
		staffProfileFetchAttemptedRef.current = false;
		safeLocalStorageRemoveItem(DENTE_CLINIC_TOKEN_KEY);
		safeLocalStorageRemoveItem(DENTE_STAFF_TOKEN_KEY);
		setClinicAuthed(false);
		setStaffAuthed(false);
		setShowStaffPinPad(false);
		setActiveStaffUser(null);
	};

	const handleLockSession = () => {
		safeLocalStorageRemoveItem(DENTE_STAFF_TOKEN_KEY);
		setStaffAuthed(false);
		setShowStaffPinPad(true);
	};

	return {
		clinicAuthed,
		setClinicAuthed,
		staffAuthed,
		setStaffAuthed,
		showStaffPinPad,
		setShowStaffPinPad,
		activeStaffUser,
		setActiveStaffUser,
		handleClinicLogout,
		handleLockSession,
	};
}
