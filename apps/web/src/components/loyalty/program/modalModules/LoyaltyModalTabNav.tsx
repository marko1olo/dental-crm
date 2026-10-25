import React from "react";
import { Award, Coins, Gift, Sparkles, Tag, Users } from "lucide-react";

export type LoyaltyTabType =
	| "balance"
	| "family"
	| "referrals"
	| "certificates"
	| "promos"
	| "ledger";

export interface LoyaltyModalTabNavProps {
	readonly activeTab: LoyaltyTabType;
	readonly onSelectTab: (tab: LoyaltyTabType) => void;
}

export const LoyaltyModalTabNav: React.FC<LoyaltyModalTabNavProps> = ({
	activeTab,
	onSelectTab,
}) => {
	return (
		<nav
			className="loyalty-tabs-nav dente-segmented-bar"
			aria-label="Разделы программы лояльности"
		>
			<button
				type="button"
				className={`loyalty-tab-btn dente-segmented-item ${activeTab === "balance" ? "active" : ""}`}
				onClick={() => onSelectTab("balance")}
			>
				<Award size={16} />
				Баланс и касса
			</button>
			<button
				type="button"
				className={`loyalty-tab-btn dente-segmented-item ${activeTab === "family" ? "active" : ""}`}
				onClick={() => onSelectTab("family")}
			>
				<Users size={16} />
				Семейный кошелек
			</button>
			<button
				type="button"
				className={`loyalty-tab-btn dente-segmented-item ${activeTab === "referrals" ? "active" : ""}`}
				onClick={() => onSelectTab("referrals")}
				data-testid="loyalty-referrals-tab-btn"
			>
				<Sparkles size={16} />
				Приведи друга
			</button>
			<button
				type="button"
				className={`loyalty-tab-btn dente-segmented-item ${activeTab === "certificates" ? "active" : ""}`}
				onClick={() => onSelectTab("certificates")}
			>
				<Gift size={16} />
				Сертификаты
			</button>
			<button
				type="button"
				className={`loyalty-tab-btn dente-segmented-item ${activeTab === "promos" ? "active" : ""}`}
				onClick={() => onSelectTab("promos")}
			>
				<Tag size={16} />
				Промокоды
			</button>
			<button
				type="button"
				className={`loyalty-tab-btn dente-segmented-item ${activeTab === "ledger" ? "active" : ""}`}
				onClick={() => onSelectTab("ledger")}
			>
				<Coins size={16} />
				История операций
			</button>
		</nav>
	);
};
