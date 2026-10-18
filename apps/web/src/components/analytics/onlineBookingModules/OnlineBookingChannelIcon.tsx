import React from "react";
import { Activity, Globe, MapPin, MessageSquare, Send } from "lucide-react";
import type { SelfBookingChannelMetric } from "./onlineBookingTypes";

interface ChannelIconProps {
	readonly type: SelfBookingChannelMetric["iconType"];
}

export function OnlineBookingChannelIcon({ type }: ChannelIconProps) {
	switch (type) {
		case "globe":
			return <Globe size={16} className="text-blue-500" />;
		case "yandex":
			return <MapPin size={16} className="text-red-500" />;
		case "gis":
			return <MapPin size={16} className="text-emerald-500" />;
		case "prodoc":
			return <Activity size={16} className="text-indigo-500" />;
		case "tg":
			return <Send size={16} className="text-sky-500" />;
		case "wa":
			return <MessageSquare size={16} className="text-teal-500" />;
		default:
			return <Globe size={16} className="text-[var(--teal)]" />;
	}
}
