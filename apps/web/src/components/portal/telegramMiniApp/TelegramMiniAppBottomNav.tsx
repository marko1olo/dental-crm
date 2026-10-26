/**
 * DENTE POCKET CLINIC — Telegram Mini App Fixed Bottom Navigation Bar
 */

import React from "react";
import { Activity, Calendar, ShieldCheck, Zap } from "lucide-react";
import type { TelegramTab } from "./TelegramMiniAppView";

export interface TelegramMiniAppBottomNavProps {
	activeTab: TelegramTab;
	complaintsCount: number;
	onSelectTab: (tab: TelegramTab) => void;
}

export const TelegramMiniAppBottomNav: React.FC<TelegramMiniAppBottomNavProps> = ({
	activeTab,
	complaintsCount,
	onSelectTab,
}) => (
	<nav className="tg-bottom-nav">
		<button
			type="button"
			className={`tg-nav-btn ${activeTab === "odontogram" ? "active" : ""}`}
			onClick={() => onSelectTab("odontogram")}
		>
			<Zap size={20} />
			<span>Зубная формула</span>
			{complaintsCount > 0 && <span className="tg-nav-badge">{complaintsCount}</span>}
		</button>

		<button
			type="button"
			className={`tg-nav-btn ${activeTab === "booking" ? "active" : ""}`}
			onClick={() => onSelectTab("booking")}
		>
			<Calendar size={20} />
			<span>Онлайн-запись</span>
		</button>

		<button
			type="button"
			className={`tg-nav-btn ${activeTab === "emr" ? "active" : ""}`}
			onClick={() => onSelectTab("emr")}
		>
			<Activity size={20} />
			<span>Моё здоровье</span>
		</button>

		<button
			type="button"
			className={`tg-nav-btn ${activeTab === "cabinet" ? "active" : ""}`}
			onClick={() => onSelectTab("cabinet")}
		>
			<ShieldCheck size={20} />
			<span>Кабинет</span>
		</button>
	</nav>
);
