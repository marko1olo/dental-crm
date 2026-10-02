/**
 * useSoftPresence.ts — DENTE CRM Soft Presence & Passive Collision Avoidance Engine
 *
 * Инварианты Mandate 8e (Doctor Autonomy) и Quiet Telemetry:
 * 1. Индикатор ПАССИВНЫЙ (Soft Presence): отображает имена и роли коллег,
 *    открывших ту же карточку пациента или визита.
 * 2. НОЛЬ БЛОКИРОВОК ДЛЯ ВРАЧА: никаких модальных окон «Запись заблокирована другим
 *    пользователем», никаких disabled-полей, никаких принудительных перезагрузок.
 * 3. Тихий канал связи поверх WebSocket / EventBus:
 *    - Сердцебиение каждые 15 сек (сбережение CPU/сети, пропуск при фоновой вкладке).
 *    - Автоматическая очистка при уходе с карточки или закрытии вкладки.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWebsocket } from "./useWebsocket";
import { safeLocalStorageGetItem, DENTE_STAFF_TOKEN_KEY } from "../lib/safeLocalStorage";

export interface SoftPeerPresence {
	staffId: string;
	staffName: string;
	role: string;
	visitId?: string | undefined;
	patientId?: string | undefined;
	action: "viewing" | "editing";
	lastSeen: number;
}

export interface UseSoftPresenceOptions {
	visitId?: string | undefined;
	patientId?: string | undefined;
	enabled?: boolean | undefined;
}

export interface UseSoftPresenceResult {
	activePeers: SoftPeerPresence[];
	hasOtherPeers: boolean;
	summaryText: string | null;
	currentStaffId: string;
	isConnected: boolean;
	refreshPresence: () => void;
}

function resolveWsUrl(): string {
	const configured = (
		import.meta as unknown as { env?: Record<string, string> }
	).env?.VITE_WS_URL;
	if (configured) return configured;
	if (typeof window === "undefined") return "";
	const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
	return `${protocol}//${window.location.host}/api/ws/schedule`;
}

/**
 * Извлекает информацию о текущем авторизованном сотруднике из локального кэша сессии.
 */
function getCurrentStaffIdentity(): { staffId: string; staffName: string; role: string } {
	let staffId = "staff-local";
	let staffName = "Сотрудник";
	let role = "doctor";

	if (typeof window !== "undefined") {
		try {
			const savedStaff = safeLocalStorageGetItem("dente_current_user") || safeLocalStorageGetItem("dente_user_profile");
			if (savedStaff) {
				const parsed = JSON.parse(savedStaff);
				if (parsed.id || parsed.userId) staffId = String(parsed.id || parsed.userId);
				if (parsed.fullName || parsed.name) staffName = String(parsed.fullName || parsed.name);
				if (parsed.role) role = String(parsed.role);
			}
		} catch {
			// fallback to token or defaults
		}
	}

	return { staffId, staffName, role };
}

export function useSoftPresence(options: UseSoftPresenceOptions = {}): UseSoftPresenceResult {
	const { visitId, patientId, enabled = true } = options;
	const [activePeers, setActivePeers] = useState<SoftPeerPresence[]>([]);
	const identity = useMemo(() => getCurrentStaffIdentity(), []);

	const wsUrl = useMemo(() => (enabled && (visitId || patientId) ? resolveWsUrl() : ""), [enabled, visitId, patientId]);
	const { isConnected, lastMessage, sendMessage } = useWebsocket(wsUrl);

	const heartbeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);

	const sendHeartbeat = useCallback(() => {
		if (!isConnected || (!visitId && !patientId)) return;
		if (typeof document !== "undefined" && document.hidden) return;

		sendMessage("STAFF_PRESENCE_HEARTBEAT", {
			staffId: identity.staffId,
			staffName: identity.staffName,
			role: identity.role,
			visitId: visitId || undefined,
			patientId: patientId || undefined,
			action: "viewing",
		});
	}, [isConnected, visitId, patientId, identity, sendMessage]);

	const sendLeave = useCallback(() => {
		if (!isConnected) return;
		sendMessage("STAFF_PRESENCE_LEAVE", {
			staffId: identity.staffId,
			visitId: visitId || undefined,
			patientId: patientId || undefined,
		});
	}, [isConnected, visitId, patientId, identity, sendMessage]);

	const queryPeers = useCallback(() => {
		if (!isConnected || (!visitId && !patientId)) return;
		sendMessage("STAFF_PRESENCE_QUERY", {
			visitId: visitId || undefined,
			patientId: patientId || undefined,
		});
	}, [isConnected, visitId, patientId, sendMessage]);

	// Подписка и периодическое сердцебиение
	useEffect(() => {
		if (!enabled || !isConnected || (!visitId && !patientId)) {
			setActivePeers([]);
			return;
		}

		// Первичное объявление присутствия и запрос коллег
		sendHeartbeat();
		queryPeers();

		heartbeatTimer.current = setInterval(sendHeartbeat, 15_000);

		const handleVisibilityChange = () => {
			if (typeof document !== "undefined" && !document.hidden) {
				sendHeartbeat();
				queryPeers();
			}
		};

		if (typeof document !== "undefined") {
			document.addEventListener("visibilitychange", handleVisibilityChange);
		}

		return () => {
			if (heartbeatTimer.current) {
				clearInterval(heartbeatTimer.current);
				heartbeatTimer.current = null;
			}
			if (typeof document !== "undefined") {
				document.removeEventListener("visibilitychange", handleVisibilityChange);
			}
			sendLeave();
		};
	}, [enabled, isConnected, visitId, patientId, sendHeartbeat, queryPeers, sendLeave]);

	// Обработка входящих событий присутствия
	useEffect(() => {
		if (!lastMessage?.type) return;

		const type = lastMessage.type;
		const payload = lastMessage.payload;

		if (type === "STAFF_PRESENCE_LIST") {
			if (Array.isArray(payload?.peers)) {
				const filtered = payload.peers
					.filter((p: SoftPeerPresence) => p && p.staffId !== identity.staffId)
					.filter((p: SoftPeerPresence) => {
						if (visitId && p.visitId === visitId) return true;
						if (patientId && p.patientId === patientId) return true;
						return false;
					});
				setActivePeers(filtered);
			}
			return;
		}

		if (type === "STAFF_PRESENCE_UPDATE") {
			if (payload?.presence && payload.presence.staffId !== identity.staffId) {
				const isRelevant =
					(visitId && payload.presence.visitId === visitId) ||
					(patientId && payload.presence.patientId === patientId);

				if (isRelevant) {
					setActivePeers((prev) => {
						const exists = prev.some((p) => p.staffId === payload.presence.staffId);
						if (exists) {
							return prev.map((p) => (p.staffId === payload.presence.staffId ? payload.presence : p));
						}
						return [...prev, payload.presence];
					});
				}
			} else if (Array.isArray(payload?.activePeers)) {
				const filtered = payload.activePeers
					.filter((p: SoftPeerPresence) => p && p.staffId !== identity.staffId)
					.filter((p: SoftPeerPresence) => {
						if (visitId && p.visitId === visitId) return true;
						if (patientId && p.patientId === patientId) return true;
						return false;
					});
				setActivePeers(filtered);
			}
			return;
		}

		if (type === "STAFF_PRESENCE_LEAVE") {
			if (payload?.staffId) {
				setActivePeers((prev) => prev.filter((p) => p.staffId !== payload.staffId));
			}
			return;
		}
	}, [lastMessage, visitId, patientId, identity.staffId]);

	const hasOtherPeers = activePeers.length > 0;

	const summaryText = useMemo(() => {
		if (activePeers.length === 0) return null;
		if (activePeers.length === 1) {
			const peer = activePeers[0]!;
			const roleLabel =
				peer.role === "doctor"
					? "Врач"
					: peer.role === "nurse" || peer.role === "assistant"
						? "Ассистент"
						: peer.role === "admin" || peer.role === "senior_admin" || peer.role === "registrar"
							? "Регистратор"
							: "Сотрудник";
			return `${roleLabel} ${peer.staffName} также просматривает эту карту`;
		}
		const names = activePeers.map((p) => p.staffName).join(", ");
		return `Коллеги (${names}) также просматривают эту карту`;
	}, [activePeers]);

	return {
		activePeers,
		hasOtherPeers,
		summaryText,
		currentStaffId: identity.staffId,
		isConnected,
		refreshPresence: queryPeers,
	};
}
