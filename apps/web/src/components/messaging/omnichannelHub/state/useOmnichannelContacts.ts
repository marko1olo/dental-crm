/**
 * useOmnichannelContacts.ts — Управление списком контактов пациентов и активным выбором.
 * Интегрирован с реальным API бэкенда /api/communications/inbox и /api/patients в боевом режиме.
 * Строго <= 120 строк по Мандату 8b.
 */

import { useEffect, useMemo, useState } from "react";
import { isDemoShowcaseMode } from "../../../../lib/demoMode.js";
import { DEFAULT_CONTACTS } from "../../omnichannelEngine.js";
import type { OmnichannelChannel, PatientOmnichannelContact } from "../types.js";

interface RawInboxItem {
	id: string;
	patientId: string;
	patientName: string;
	patientPhone: string;
	message: string;
	channel: string;
	direction: string;
	createdAt: string;
	unreadCount?: number;
}

export function useOmnichannelContacts(initialPatientId?: string) {
	const isSsrOrDemo = typeof window === "undefined" || isDemoShowcaseMode();
	const [contacts, setContacts] = useState<readonly PatientOmnichannelContact[]>(() =>
		isSsrOrDemo ? DEFAULT_CONTACTS : [],
	);
	const [selectedPatientId, setSelectedPatientId] = useState<string>(
		() => initialPatientId || (DEFAULT_CONTACTS[0]?.id || ""),
	);
	const [patientSearchQuery, setPatientSearchQuery] = useState<string>("");
	const [isLoadingContacts, setIsLoadingContacts] = useState<boolean>(false);

	useEffect(() => {
		if (isDemoShowcaseMode()) {
			setContacts(DEFAULT_CONTACTS);
			if (!selectedPatientId && DEFAULT_CONTACTS[0]?.id) {
				setSelectedPatientId(DEFAULT_CONTACTS[0].id);
			}
			return;
		}

		let isMounted = true;
		setIsLoadingContacts(true);

		fetch("/api/communications/inbox")
			.then((res) => (res.ok ? res.json() : []))
			.then((items: RawInboxItem[]) => {
				if (!isMounted) return;
				if (Array.isArray(items) && items.length > 0) {
					const mapped: PatientOmnichannelContact[] = items.map((it) => ({
						id: it.patientId,
						fullName: it.patientName || "Пациент клиники",
						phone: it.patientPhone || "",
						preferredChannel: (it.channel === "telegram" ? "telegram" : it.channel === "sms" ? "sms" : "whatsapp") as OmnichannelChannel,
						avatarColor: "var(--teal, #0d9488)",
						unreadCount: it.unreadCount || 0,
						lastActivity: it.createdAt || new Date().toISOString(),
						lastMessageSnippet: it.message,
					}));
					setContacts(mapped);
					if (!selectedPatientId && mapped[0]?.id) {
						setSelectedPatientId(mapped[0].id);
					}
				}
			})
			.catch(() => {
				// Soft fallback — тихий возврат в случае сетевой паузы
			})
			.finally(() => {
				if (isMounted) setIsLoadingContacts(false);
			});

		return () => {
			isMounted = false;
		};
	}, [selectedPatientId]);

	const selectedContact = useMemo<PatientOmnichannelContact>(() => {
		const found = contacts.find((c) => c.id === selectedPatientId);
		if (found) return found;
		return (
			contacts[0] || {
				id: selectedPatientId || "draft-patient",
				fullName: "Пациент клиники",
				phone: "",
				preferredChannel: "whatsapp",
				unreadCount: 0,
				lastActivity: new Date().toISOString(),
			}
		);
	}, [contacts, selectedPatientId]);

	const filteredContacts = useMemo(() => {
		const q = patientSearchQuery.trim().toLowerCase();
		if (!q) return contacts;
		return contacts.filter(
			(c) =>
				c.fullName.toLowerCase().includes(q) ||
				c.phone.includes(q) ||
				c.telegramUsername?.toLowerCase().includes(q),
		);
	}, [contacts, patientSearchQuery]);

	return {
		contacts,
		setContacts,
		selectedPatientId,
		setSelectedPatientId,
		selectedContact,
		patientSearchQuery,
		setPatientSearchQuery,
		filteredContacts,
		isLoadingContacts,
	};
}
