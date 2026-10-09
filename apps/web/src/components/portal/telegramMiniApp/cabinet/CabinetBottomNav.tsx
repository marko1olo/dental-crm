import React, { memo } from "react";
import {
	Calendar,
	Eye,
	FileText,
	Wallet,
	Zap,
} from "lucide-react";
import type { TelegramCabinetTab } from "./types";

export interface CabinetBottomNavProps {
	readonly activeTab: TelegramCabinetTab;
	readonly onSelectTab: (tab: TelegramCabinetTab) => void;
	readonly toothComplaintsCount: number;
	readonly onTriggerHaptic?: (style?: "light" | "medium" | "heavy") => void;
}

export const CabinetBottomNav: React.FC<CabinetBottomNavProps> = memo(({
	activeTab,
	onSelectTab,
	toothComplaintsCount,
	onTriggerHaptic,
}) => {
	return (
		<nav className="tg-bottom-nav">
			{/* ТАБ 1: 🦷 Зубы */}
			<button
				type="button"
				className={`tg-nav-btn ${activeTab === "teeth" ? "active" : ""}`}
				onClick={() => {
					onSelectTab("teeth");
					onTriggerHaptic?.("light");
				}}
			>
				<Zap size={18} />
				<span>Зубы</span>
				{toothComplaintsCount > 0 && (
					<span className="tg-nav-badge">{toothComplaintsCount}</span>
				)}
			</button>

			{/* ТАБ 2: 📅 Записи */}
			<button
				type="button"
				className={`tg-nav-btn ${activeTab === "appointments" ? "active" : ""}`}
				onClick={() => {
					onSelectTab("appointments");
					onTriggerHaptic?.("light");
				}}
			>
				<Calendar size={18} />
				<span>Записи</span>
			</button>

			{/* ТАБ 3: 🖼️ Снимки и КТ */}
			<button
				type="button"
				className={`tg-nav-btn ${activeTab === "imaging" ? "active" : ""}`}
				onClick={() => {
					onSelectTab("imaging");
					onTriggerHaptic?.("light");
				}}
			>
				<Eye size={18} />
				<span>Снимки</span>
			</button>

			{/* ТАБ 4: 🧾 Налог 13% */}
			<button
				type="button"
				className={`tg-nav-btn ${activeTab === "tax" ? "active" : ""}`}
				onClick={() => {
					onSelectTab("tax");
					onTriggerHaptic?.("light");
				}}
			>
				<FileText size={18} />
				<span>Налог 13%</span>
			</button>

			{/* ТАБ 5: 💳 Финансы */}
			<button
				type="button"
				className={`tg-nav-btn ${activeTab === "finance" ? "active" : ""}`}
				onClick={() => {
					onSelectTab("finance");
					onTriggerHaptic?.("light");
				}}
			>
				<Wallet size={18} />
				<span>Финансы</span>
			</button>
		</nav>
	);
});

CabinetBottomNav.displayName = "CabinetBottomNav";
