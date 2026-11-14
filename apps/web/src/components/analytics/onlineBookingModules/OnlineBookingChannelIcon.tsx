import React from "react";
import { Activity, Globe, MapPin, MessageSquare, Send } from "lucide-react";
import type { SelfBookingChannelMetric } from "./onlineBookingTypes";

interface ChannelIconProps {
	readonly type: SelfBookingChannelMetric["iconType"];
}

export function OnlineBookingChannelIcon({ type }: ChannelIconProps) {
	switch (type) {
		case "globe":
			return <Globe size={16} className="text-[var(--teal)]" />;
		case "yandex":
			return <MapPin size={16} className="text-[var(--teal)]" />;
		case "gis":
			return <MapPin size={16} className="text-[var(--teal)]" />;
		case "prodoc":
			return <Activity size={16} className="text-[var(--teal)]" />;
		case "tg":
			return <Send size={16} className="text-[var(--teal)]" />;
		case "wa":
			return <MessageSquare size={16} className="text-[var(--teal)]" />;
		default:
			return <Globe size={16} className="text-[var(--teal)]" />;
	}
}
