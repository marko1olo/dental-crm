import { type IntercomLocationItem, type StaffChatChannel, type StaffMemberPresenceItem } from "@dental/shared";
import { useCallback, useState } from "react";
import { isDemoShowcaseMode } from "../../../lib/demoMode";
import { getDenteAuthHeaders } from "../../../lib/denteRequestHeaders";
import { getDemoChannels, getDemoLocations } from "./staffMessengerDemoData";

export function useStaffChannels(cabinetNumber = "Каб. 1") {
	const [channels, setChannels] = useState<StaffChatChannel[]>([]);
	const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
	const [members, setMembers] = useState<StaffMemberPresenceItem[]>([]);
	const [locations, setLocations] = useState<IntercomLocationItem[]>([]);
	const [selectedLocation, setSelectedLocation] = useState(cabinetNumber);
	const [isLoading, setIsLoading] = useState(false);

	const loadLocations = useCallback(async () => {
		try {
			const res = await fetch("/api/staff-chat/locations", { headers: getDenteAuthHeaders() });
			if (res.ok) {
				const data = await res.json();
				if (Array.isArray(data.locations) && data.locations.length > 0) {
					setLocations(data.locations);
					const first = data.locations[0];
					if (first && (!selectedLocation || selectedLocation === "Каб. 1")) {
						setSelectedLocation(first.name);
					}
					return;
				}
			}
		} catch (e) {
			console.error("Ошибка загрузки локаций:", e);
		}
		const fallback = getDemoLocations();
		setLocations(fallback);
		if (!selectedLocation && fallback[0]) setSelectedLocation(fallback[0].name);
	}, [selectedLocation]);

	const loadChannels = useCallback(async () => {
		try {
			setIsLoading(true);
			const res = await fetch("/api/staff-chat/channels", { headers: getDenteAuthHeaders() });
			if (res.ok) {
				const data = await res.json();
				if (Array.isArray(data.channels) && data.channels.length > 0) {
					setChannels(data.channels);
					if (!activeChannelId) {
						const defaultCh = data.channels.find((c: StaffChatChannel) => c.slug === "general") || data.channels[0];
						if (defaultCh) setActiveChannelId(defaultCh.id);
					}
					return;
				}
			}
			if (isDemoShowcaseMode()) {
				const fallback = getDemoChannels();
				setChannels(fallback);
				if (!activeChannelId && fallback[0]) setActiveChannelId(fallback[0].id);
			}
		} catch (e) {
			console.error("Ошибка загрузки каналов:", e);
			if (isDemoShowcaseMode()) {
				const fallback = getDemoChannels();
				setChannels(fallback);
				if (!activeChannelId && fallback[0]) setActiveChannelId(fallback[0].id);
			}
		} finally {
			setIsLoading(false);
		}
	}, [activeChannelId]);

	const loadMembers = useCallback(async () => {
		try {
			const res = await fetch("/api/staff-chat/members", { headers: getDenteAuthHeaders() });
			if (res.ok) {
				const data = await res.json();
				if (Array.isArray(data.members)) setMembers(data.members);
			}
		} catch (e) {
			console.error("Ошибка загрузки сотрудников:", e);
		}
	}, []);

	return {
		channels, setChannels, activeChannelId, setActiveChannelId,
		members, setMembers, locations, setLocations,
		selectedLocation, setSelectedLocation, isLoading,
		loadLocations, loadChannels, loadMembers,
	};
}
