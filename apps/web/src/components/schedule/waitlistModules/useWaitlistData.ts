/**
 * useWaitlistData.ts — Hook for loading, WebSocket synchronization, and mutation of waitlist entries.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { isDemoShowcaseMode } from "../../../lib/demoMode";
import { logger } from "../../../utils/logger";
import { showToast } from "../../GlobalToast";
import { useWebsocket } from "../../../hooks/useWebsocket";
import type { WaitlistCandidateItem } from "../waitlistCancellationEngine";
import {
	DEMO_SHOWCASE_WAITLIST_CANDIDATES,
	waitlistWriteHeaders,
	writeFailureText,
} from "./waitlistTypes";

// biome-ignore lint/suspicious/noExplicitAny: auth parameter
export function useWaitlistData(isOpen: boolean, auth?: any) {
	const [items, setItems] = useState<WaitlistCandidateItem[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [loadFailureStatus, setLoadFailureStatus] = useState<number | null | undefined>(undefined);
	const [loadingId, setLoadingId] = useState<string | null>(null);

	const fetchWaitlist = useCallback(async () => {
		try {
			setIsLoading(true);
			setLoadFailureStatus(undefined);
			const res = await fetch("/api/waitlist", {
				headers: auth?.denteClinicalReadHeaders ? auth.denteClinicalReadHeaders() : {},
			});
			if (res.ok) {
				const data = await res.json();
				const list = Array.isArray(data) ? data : [];
				setItems(list.length === 0 && isDemoShowcaseMode() ? DEMO_SHOWCASE_WAITLIST_CANDIDATES : list);
				return;
			}
			if (isDemoShowcaseMode()) {
				setItems(DEMO_SHOWCASE_WAITLIST_CANDIDATES);
				return;
			}
			setLoadFailureStatus(res.status);
		} catch (e) {
			logger.error("Failed to load waitlist", e);
			if (isDemoShowcaseMode()) {
				setItems(DEMO_SHOWCASE_WAITLIST_CANDIDATES);
				return;
			}
			setLoadFailureStatus(null);
		} finally {
			setIsLoading(false);
		}
	}, [auth]);

	useEffect(() => {
		if (isOpen) {
			fetchWaitlist();
		}
	}, [isOpen, fetchWaitlist]);

	const wsUrl = useMemo(() => {
		const configured = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_WS_URL;
		if (configured) return configured;
		if (typeof window === "undefined") return "";
		const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
		return `${protocol}//${window.location.host}/api/ws/schedule`;
	}, []);

	const { lastMessage } = useWebsocket(isOpen ? wsUrl : "");

	useEffect(() => {
		if (!isOpen || !lastMessage?.type) return;
		if (
			lastMessage.type === "WAITLIST_UPDATED" ||
			lastMessage.type === "WAITLIST_DELETED" ||
			lastMessage.type === "APPOINTMENT_UPDATED"
		) {
			fetchWaitlist();
		}
	}, [isOpen, lastMessage, fetchWaitlist]);

	const handleFulfill = async (item: WaitlistCandidateItem) => {
		if (loadingId === item.id) return;
		setLoadingId(item.id);
		try {
			const res = await fetch(`/api/waitlist/${encodeURIComponent(item.id)}`, {
				method: "PUT",
				headers: waitlistWriteHeaders(),
				body: JSON.stringify({ status: "fulfilled" }),
			});
			if (res.ok) {
				showToast(`${item.patientName || "Пациент"} отмечен как принятый`, "success");
				fetchWaitlist();
			} else {
				showToast(await writeFailureText(res, "закрыть заявку"), "error");
			}
		} catch {
			showToast("Сервер клиники не ответил. Повторите попытку.", "error");
		} finally {
			setLoadingId(null);
		}
	};

	const handleDelete = async (id: string) => {
		if (loadingId === id) return;
		setLoadingId(id);
		try {
			const res = await fetch(`/api/waitlist/${encodeURIComponent(id)}`, {
				method: "DELETE",
				headers: waitlistWriteHeaders(),
			});
			if (res.ok) {
				showToast("Запись удалена из листа ожидания", "success");
				fetchWaitlist();
			} else {
				showToast(await writeFailureText(res, "удалить запись"), "error");
			}
		} catch {
			showToast("Сервер клиники не ответил", "error");
		} finally {
			setLoadingId(null);
		}
	};

	return {
		items,
		setItems,
		isLoading,
		loadFailureStatus,
		loadingId,
		setLoadingId,
		fetchWaitlist,
		handleFulfill,
		handleDelete,
	};
}
