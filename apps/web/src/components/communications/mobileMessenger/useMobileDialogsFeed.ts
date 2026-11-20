import { useCallback, useEffect, useMemo, useState } from "react";
import { isDemoShowcaseMode } from "../../../lib/demoMode";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import type { ChannelFilter, CommunicationEvent, MobileCommunicationsMessengerProps, MobilePatientDialogSummary } from "./types";

interface InboxDialogResponseItem {
	patientId?: string | undefined;
	patientName?: string | undefined;
	patientPhone?: string | undefined;
	message?: string | undefined;
	createdAt?: string | undefined;
	channel?: string | undefined;
	direction?: string | undefined;
	unreadCount?: number | undefined;
}

interface ExtendedCommunicationEvent extends CommunicationEvent {
	patientName?: string | undefined;
	patientPhone?: string | undefined;
	preview?: string | undefined;
}

function isChatChannel(ch: unknown): ch is MobilePatientDialogSummary["channel"] {
	return ch === "whatsapp" || ch === "telegram" || ch === "sms" || ch === "max";
}

export function useMobileDialogsFeed(dashboard: MobileCommunicationsMessengerProps["dashboard"]) {
	const [serverDialogs, setServerDialogs] = useState<MobilePatientDialogSummary[]>([]);
	const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
	const [searchQuery, setSearchQuery] = useState("");
	const [isSearchOpen, setIsSearchOpen] = useState(false);

	const fetchServerDialogs = useCallback(async () => {
		try {
			const res = await fetch("/api/communications/inbox", { headers: denteAdminSecretRequestHeaders() });
			if (res.ok) {
				const data = (await res.json()) as unknown;
				if (Array.isArray(data) && data.length > 0) {
					setServerDialogs(
						(data as InboxDialogResponseItem[]).map((item) => ({
							patientId: item.patientId || "unknown",
							patientName: item.patientName || "Пациент клиники",
							patientPhone: item.patientPhone || "",
							lastMessage: item.message || "",
							lastMessageAt: item.createdAt || new Date().toISOString(),
							channel: isChatChannel(item.channel) ? item.channel : "whatsapp",
							direction: item.direction === "inbound" ? "inbound" : "outbound",
							unreadCount: typeof item.unreadCount === "number" ? item.unreadCount : 0,
						})),
					);
					return;
				}
			}
		} catch (error) {
			console.error("[useMobileDialogsFeed] Failed to fetch server dialogs, falling back to local events:", error);
		}

		const events = dashboard?.communicationEvents ?? [];
		const patientsMap = new Map<string, { name: string; phone: string }>();
		(dashboard?.patients ?? []).forEach((p) => patientsMap.set(p.id, { name: p.fullName, phone: p.phone || "" }));
		const dialogsMap = new Map<string, MobilePatientDialogSummary>();

		events.forEach((ev: CommunicationEvent | ExtendedCommunicationEvent) => {
			let pId = ev.patientId || "unknown";
			const extEv = ev as ExtendedCommunicationEvent;
			if (!patientsMap.has(pId) && extEv.patientName) {
				for (const [k, v] of patientsMap.entries()) {
					if (v.name === extEv.patientName) { pId = k; break; }
				}
			}
			const patientInfo = patientsMap.get(pId) || { name: extEv.patientName || "Пациент клиники", phone: extEv.patientPhone || "" };
			const existing = dialogsMap.get(pId);
			const evTime = new Date(ev.createdAt).getTime();

			if (!existing || evTime > new Date(existing.lastMessageAt).getTime()) {
				dialogsMap.set(pId, {
					patientId: pId, patientName: patientInfo.name, patientPhone: patientInfo.phone,
					lastMessage: ev.message || extEv.preview || "Сообщение в чате", lastMessageAt: ev.createdAt,
					channel: isChatChannel(ev.channel) ? ev.channel : "whatsapp",
					direction: ev.direction === "inbound" ? "inbound" : "outbound",
					unreadCount: ev.status === "queued" || ev.direction === "inbound" ? 1 : 0,
				});
			}
		});

		if (isDemoShowcaseMode() && dialogsMap.size < 3 && (dashboard?.patients ?? []).length > 0) {
			const samplePresets = [
				{ msg: "Здравствуйте! Подтверждаю визит на завтра в 11:30.", channel: "whatsapp" as const, unread: 1, offsetMins: 15 },
				{ msg: "Спасибо большое доктору за безболезненное лечение!", channel: "telegram" as const, unread: 0, offsetMins: 120 },
				{ msg: "Подскажите, готова ли справка для налогового вычета?", channel: "sms" as const, unread: 2, offsetMins: 360 },
			];
			(dashboard?.patients ?? []).slice(0, 5).forEach((p, idx) => {
				if (!dialogsMap.has(p.id)) {
					const preset = samplePresets[idx % samplePresets.length]!;
					dialogsMap.set(p.id, {
						patientId: p.id, patientName: p.fullName, patientPhone: p.phone || "", lastMessage: preset.msg,
						lastMessageAt: new Date(Date.now() - preset.offsetMins * 60000).toISOString(),
						channel: preset.channel, direction: "inbound", unreadCount: preset.unread,
					});
				}
			});
		}
		setServerDialogs(Array.from(dialogsMap.values()));
	}, [dashboard?.communicationEvents, dashboard?.patients]);

	useEffect(() => { void fetchServerDialogs(); }, [fetchServerDialogs]);

	const filteredDialogs = useMemo(() => {
		return serverDialogs.filter((d) => {
			if (channelFilter !== "all" && d.channel !== channelFilter) return false;
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase();
				return d.patientName.toLowerCase().includes(q) || d.patientPhone.includes(q) || d.lastMessage.toLowerCase().includes(q);
			}
			return true;
		});
	}, [serverDialogs, channelFilter, searchQuery]);

	return {
		serverDialogs, channelFilter, setChannelFilter,
		searchQuery, setSearchQuery, isSearchOpen, setIsSearchOpen,
		filteredDialogs, fetchServerDialogs,
	};
}
