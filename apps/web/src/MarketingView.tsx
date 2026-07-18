import "./styles/marketing.css";
import { AnimatePresence, motion } from "framer-motion";
import {
	Globe,
	Lightbulb,
	MessageSquare,
	Search,
	Star,
	TrendingUp,
} from "lucide-react";
import { useMarketingLogic } from "./hooks/useMarketingLogic";
import { MarketingMapPreviews } from "./components/marketing/MarketingMapPreviews";
import { MarketingReviewsTab } from "./components/marketing/tabs/MarketingReviewsTab";
import { MarketingSeoTab } from "./components/marketing/tabs/MarketingSeoTab";
import { MarketingStatsTab } from "./components/marketing/tabs/MarketingStatsTab";
import { MarketingNpsTab } from "./components/marketing/tabs/MarketingNpsTab";
import { MarketingReferralsTab } from "./components/marketing/tabs/MarketingReferralsTab";

export function MarketingView({
	clinicName,
	clinicPhone,
}: {
	clinicName: string;
	clinicPhone: string;
}) {
	const marketing = useMarketingLogic(clinicName, clinicPhone);
	const { state, actions } = marketing;
	const { activeTab, activePlatform, stats, phone } = state;
	const { setActiveTab, setActivePlatform, updateStat } = actions;

	return (
		<section
			className="workspace-panel marketing-workspace"
			aria-label="Модуль маркетинга и репутации"
		>
			{/* PREVIEW COLUMN (Left) */}
			<MarketingMapPreviews
				activePlatform={activePlatform}
				stats={stats}
				phone={phone}
			/>

			{/* CONTROLS COLUMN (Right) */}
			<div className="marketing-controls-column">
				{/* STATS STRIP */}
				<div
					className="marketing-stats-strip"
					role="region"
					aria-label="Сводка репутации"
				>
					<div
						className={`marketing-stat-card yandex interactive-card ${activePlatform === "yandex" ? "active-platform" : ""}`}
						onClick={() => setActivePlatform("yandex")}
						onKeyDown={(e) => {
							if (e.key === "Enter" || e.key === " ") setActivePlatform("yandex");
						}}
						role="button"
						tabIndex={0}
					>
						<div className="marketing-stat-icon-wrapper">
							<span style={{ fontSize: 24 }}>Y</span>
						</div>
						<div className="marketing-stat-content">
							<h3 className="marketing-stat-title">Яндекс Карты</h3>
							<div
								className="marketing-rating-inputs"
								onClick={(e) => e.stopPropagation()}
							>
								<input
									type="number"
									step="0.1"
									min="0"
									max="5"
									value={stats.yandex.rating}
									onChange={(e) => updateStat("yandex", "rating", e.target.value)}
									className="rating-val"
									aria-label="Рейтинг Яндекс"
								/>
								<span className="star">★</span>
								<input
									type="number"
									min="0"
									value={stats.yandex.reviews}
									onChange={(e) => updateStat("yandex", "reviews", e.target.value)}
									className="reviews-val"
									aria-label="Количество отзывов Яндекс"
								/>
								<span className="reviews-label">отзывов</span>
							</div>
						</div>
					</div>

					<div
						className={`marketing-stat-card gis2 interactive-card ${activePlatform === "gis2" ? "active-platform" : ""}`}
						onClick={() => setActivePlatform("gis2")}
						onKeyDown={(e) => {
							if (e.key === "Enter" || e.key === " ") setActivePlatform("gis2");
						}}
						role="button"
						tabIndex={0}
					>
						<div className="marketing-stat-icon-wrapper">
							<span style={{ fontSize: 24, fontWeight: "bold" }}>2</span>
						</div>
						<div className="marketing-stat-content">
							<h3 className="marketing-stat-title">2ГИС</h3>
							<div
								className="marketing-rating-inputs"
								onClick={(e) => e.stopPropagation()}
							>
								<input
									type="number"
									step="0.1"
									min="0"
									max="5"
									value={stats.gis2.rating}
									onChange={(e) => updateStat("gis2", "rating", e.target.value)}
									className="rating-val"
									aria-label="Рейтинг 2ГИС"
								/>
								<span className="star">★</span>
								<input
									type="number"
									min="0"
									value={stats.gis2.reviews}
									onChange={(e) => updateStat("gis2", "reviews", e.target.value)}
									className="reviews-val"
									aria-label="Количество отзывов 2ГИС"
								/>
								<span className="reviews-label">отзывов</span>
							</div>
						</div>
					</div>

					<div
						className={`marketing-stat-card google interactive-card ${activePlatform === "google" ? "active-platform" : ""}`}
						onClick={() => setActivePlatform("google")}
						onKeyDown={(e) => {
							if (e.key === "Enter" || e.key === " ") setActivePlatform("google");
						}}
						role="button"
						tabIndex={0}
					>
						<div className="marketing-stat-icon-wrapper">
							<span style={{ fontSize: 24, color: "#EA4335" }}>G</span>
						</div>
						<div className="marketing-stat-content">
							<h3 className="marketing-stat-title">Google Maps</h3>
							<div
								className="marketing-rating-inputs"
								onClick={(e) => e.stopPropagation()}
							>
								<input
									type="number"
									step="0.1"
									min="0"
									max="5"
									value={stats.google.rating}
									onChange={(e) => updateStat("google", "rating", e.target.value)}
									className="rating-val"
									aria-label="Рейтинг Google"
								/>
								<span className="star">★</span>
								<input
									type="number"
									min="0"
									value={stats.google.reviews}
									onChange={(e) => updateStat("google", "reviews", e.target.value)}
									className="reviews-val"
									aria-label="Количество отзывов Google"
								/>
								<span className="reviews-label">отзывов</span>
							</div>
						</div>
					</div>

					<div className="marketing-stat-card search-pos">
						<div className="marketing-stat-icon-wrapper">
							<TrendingUp size={24} />
						</div>
						<div className="marketing-stat-content">
							<h3 className="marketing-stat-title">Позиция SEO</h3>
							<div
								style={{
									fontSize: 24,
									fontWeight: 700,
									color: "var(--teal)",
									lineHeight: 1,
									marginTop: 4,
								}}
							>
								Топ-3
							</div>
							<div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
								В локальной выдаче
							</div>
						</div>
					</div>
				</div>

				{/* TAB NAVIGATION */}
				<motion.nav
					className="marketing-tab-nav"
					role="tablist"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
				>
					<button
						className={`marketing-tab ${activeTab === "reviews" ? "active" : ""}`}
						onClick={() => setActiveTab("reviews")}
						role="tab"
						aria-selected={activeTab === "reviews"}
						type="button"
					>
						<MessageSquare size={18} />
						Работа с отзывами
					</button>
					<button
						className={`marketing-tab ${activeTab === "keys" ? "active" : ""}`}
						onClick={() => setActiveTab("keys")}
						role="tab"
						aria-selected={activeTab === "keys"}
						type="button"
					>
						<Search size={18} />
						SEO-ключи
					</button>
					<button
						className={`marketing-tab ${activeTab === "nps" ? "active" : ""}`}
						onClick={() => setActiveTab("nps")}
						role="tab"
						aria-selected={activeTab === "nps"}
						type="button"
					>
						<Star size={18} />
						NPS Опросы
					</button>
					<button
						className={`marketing-tab ${activeTab === "referrals" ? "active" : ""}`}
						onClick={() => setActiveTab("referrals")}
						role="tab"
						aria-selected={activeTab === "referrals"}
						type="button"
					>
						<Globe size={18} />
						Реферальная Программа
					</button>
					<button
						className={`marketing-tab ${activeTab === "stats" ? "active" : ""}`}
						onClick={() => setActiveTab("stats")}
						role="tab"
						aria-selected={activeTab === "stats"}
						type="button"
					>
						<Lightbulb size={18} />
						Методичка
					</button>
				</motion.nav>

				{/* CONTENT PANELS */}
				<AnimatePresence mode="wait">
					{activeTab === "reviews" && (
						<MarketingReviewsTab state={state} actions={actions} />
					)}
					{activeTab === "keys" && (
						<MarketingSeoTab state={state} actions={actions} />
					)}
					{activeTab === "stats" && <MarketingStatsTab />}
					{activeTab === "nps" && (
						<MarketingNpsTab state={state} actions={actions} />
					)}
					{activeTab === "referrals" && (
						<MarketingReferralsTab state={state} actions={actions} />
					)}
				</AnimatePresence>
			</div>
		</section>
	);
}
