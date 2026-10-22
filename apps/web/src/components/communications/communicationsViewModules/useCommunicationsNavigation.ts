import { useEffect, useState } from "react";
import type { CommunicationActiveSection } from "./types";

export function useCommunicationsNavigation(initialSection?: CommunicationActiveSection) {
	const [activeSection, setActiveSection] = useState<CommunicationActiveSection>(() => {
		if (initialSection) return initialSection;
		if (typeof window !== "undefined") {
			const hash = window.location.hash || "";
			const search = window.location.search || "";
			if (hash.includes("omnichannel") || search.includes("omnichannel")) return "omnichannel";
			if (hash.includes("bot_inbox") || hash.includes("bots") || search.includes("bot_inbox") || search.includes("bots")) return "bot_inbox";
			if (hash.includes("chat") || search.includes("chat")) return "chat";
			if (hash.includes("notifications") || search.includes("notifications")) return "notifications";
			if (hash.includes("staff_chat") || search.includes("staff_chat") || search.includes("intercom") || hash.includes("intercom")) return "staff_chat";
			if (hash.includes("tasks") || search.includes("tasks")) return "tasks";
		}
		return "tasks";
	});

	useEffect(() => {
		const handleHash = () => {
			const hash = window.location.hash || "";
			if (hash.includes("omnichannel")) setActiveSection("omnichannel");
			else if (hash.includes("bot_inbox") || hash.includes("bots")) setActiveSection("bot_inbox");
			else if (hash.includes("chat")) setActiveSection("chat");
			else if (hash.includes("notifications")) setActiveSection("notifications");
			else if (hash.includes("staff_chat")) setActiveSection("staff_chat");
		};
		window.addEventListener("hashchange", handleHash);
		return () => window.removeEventListener("hashchange", handleHash);
	}, []);

	const [isRecallsHubOpen, setIsRecallsHubOpen] = useState(false);
	const [isOmnichannelHubOpen, setIsOmnichannelHubOpen] = useState(false);
	const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

	return {
		activeSection, setActiveSection,
		isRecallsHubOpen, setIsRecallsHubOpen,
		isOmnichannelHubOpen, setIsOmnichannelHubOpen,
		isMoreMenuOpen, setIsMoreMenuOpen,
	};
}
