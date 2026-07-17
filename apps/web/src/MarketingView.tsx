import "./styles/marketing.css";
import { AnimatePresence, motion } from "framer-motion";
import {
	AlertTriangle,
	CheckCircle2,
	Copy,
	Globe,
	Lightbulb,
	MapPin,
	MessageSquare,
	MinusCircle,
	Search,
	Sparkles,
	Star,
	ThumbsDown,
	ThumbsUp,
	TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import { showToast } from "./components/GlobalToast";
import { useAppLogicContext } from "./contexts/AppLogicContext";
import { AiOrchestrator } from "./lib/aiOrchestrator";

type MarketingStats = {
	yandex: { rating: number; reviews: number };
	gis2: { rating: number; reviews: number };
	google: { rating: number; reviews: number };
};

type ReviewTone = "positive" | "negative" | "neutral";

export function MarketingView({
	clinicName,
	clinicPhone,
}: {
	clinicName: string;
	clinicPhone: string;
}) {
	const { auth, dashboard, fetchDashboard } = useAppLogicContext();
	const marketingData = dashboard?.clinicSettings?.profile?.marketingData || {};

	const [customSeoKeys, setCustomSeoKeys] = useState<string[]>(() => {
		return (
			marketingData.customSeoKeys || [
				"лечение кариеса",
				"имплантация зубов",
				"отбеливание",
				"детский стоматолог",
			]
		);
	});

	const [phone, setPhone] = useState(() => {
		return marketingData.phone || clinicPhone || "+7 (800) 000-00-00";
	});

	const [stats, setStats] = useState<MarketingStats>(() => {
		return (
			marketingData.stats || {
				yandex: { rating: 0, reviews: 0 },
				gis2: { rating: 0, reviews: 0 },
				google: { rating: 0, reviews: 0 },
			}
		);
	});

	// NPS State
	const [npsScore, setNpsScore] = useState(() => marketingData.npsScore ?? 9.2);
	const [npsEnabled, setNpsEnabled] = useState(
		() => marketingData.npsEnabled ?? true,
	);
	const [npsSendDelay, setNpsSendDelay] = useState(
		() => marketingData.npsSendDelay ?? 24,
	);
	const [npsMessageTemplate, setNpsMessageTemplate] = useState(
		() =>
			marketingData.npsMessageTemplate ??
			`Здравствуйте! Спасибо, что посетили "${clinicName}". Оцените, пожалуйста, качество приема по 10-балльной шкале, ответив на это СМС. Это займет всего секунду, а нам поможет стать лучше!`,
	);

	// Referral State
	const [refReward, setRefReward] = useState(
		() => marketingData.refReward ?? "1000",
	);
	const [refEnabled, setRefEnabled] = useState(
		() => marketingData.refEnabled ?? true,
	);
	const [refNewDiscount, setRefNewDiscount] = useState(
		() => marketingData.refNewDiscount ?? "10",
	);

	useEffect(() => {
		if (marketingData.customSeoKeys)
			setCustomSeoKeys(marketingData.customSeoKeys);
		if (marketingData.stats) setStats(marketingData.stats);
		if (marketingData.phone) setPhone(marketingData.phone);
		if (marketingData.npsScore !== undefined)
			setNpsScore(marketingData.npsScore);
		if (marketingData.npsEnabled !== undefined)
			setNpsEnabled(marketingData.npsEnabled);
		if (marketingData.npsSendDelay !== undefined)
			setNpsSendDelay(marketingData.npsSendDelay);
		if (marketingData.npsMessageTemplate !== undefined)
			setNpsMessageTemplate(marketingData.npsMessageTemplate);
		if (marketingData.refReward !== undefined)
			setRefReward(marketingData.refReward);
		if (marketingData.refEnabled !== undefined)
			setRefEnabled(marketingData.refEnabled);
		if (marketingData.refNewDiscount !== undefined)
			setRefNewDiscount(marketingData.refNewDiscount);
	}, [
		marketingData.customSeoKeys,
		marketingData.stats,
		marketingData.phone,
		marketingData.npsScore,
		marketingData.npsEnabled,
		marketingData.npsSendDelay,
		marketingData.npsMessageTemplate,
		marketingData.refReward,
		marketingData.refEnabled,
		marketingData.refNewDiscount,
	]);

	const saveMarketingData = async (newData: any) => {
		try {
			const merged = {
				customSeoKeys,
				stats,
				phone,
				npsScore,
				npsEnabled,
				npsSendDelay,
				npsMessageTemplate,
				refReward,
				refEnabled,
				refNewDiscount,
				...newData,
			};
			const res = await fetch("/api/settings/profile", {
				method: "PUT",
				headers: auth.denteAdminSecretRequestHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({ marketingData: merged }),
			});
			if (res.ok) {
				fetchDashboard?.();
			}
		} catch (error) {
			console.error("[Marketing] Save error", error);
		}
	};

	const handleAddSeoKey = (val: string) => {
		if (!val.trim()) return;
		const updated = [...customSeoKeys, val.trim()];
		setCustomSeoKeys(updated);
		saveMarketingData({ customSeoKeys: updated });
	};

	const handleRemoveSeoKey = (val: string) => {
		const updated = customSeoKeys.filter((k: string) => k !== val);
		setCustomSeoKeys(updated);
		saveMarketingData({ customSeoKeys: updated });
	};

	const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = e.target.value;
		setPhone(val);
	};

	const handlePhoneBlur = () => {
		saveMarketingData({ phone });
	};

	const updateStat = (
		platform: keyof MarketingStats,
		field: "rating" | "reviews",
		value: string,
	) => {
		const num = parseFloat(value) || 0;
		const newStats = {
			...stats,
			[platform]: { ...stats[platform], [field]: num },
		};
		setStats(newStats);
		saveMarketingData({ stats: newStats });
	};

	const [reviewText, setReviewText] = useState("");
	const [tone, setTone] = useState<ReviewTone>("positive");
	const [generatedReply, setGeneratedReply] = useState("");
	const [copied, setCopied] = useState(false);
	const [activeTab, setActiveTab] = useState<
		"reviews" | "stats" | "keys" | "nps" | "referrals"
	>("reviews");

	const [newKeyInput, setNewKeyInput] = useState("");
	const [isAiLoading, setIsAiLoading] = useState(false);
	const [aiError, setAiError] = useState<string | null>(null);

	const handleGenerate = async () => {
		if (!reviewText.trim()) return;
		setIsAiLoading(true);
		setAiError(null);
		setGeneratedReply("");

		try {
			const res = await fetch("/api/ai/marketing-reply", {
				method: "POST",
				headers: auth.denteClinicalReadHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					reviewText,
					tone,
					clinicName,
					seoKeys: customSeoKeys,
				}),
			});

			if (!res.ok) {
				throw new Error("Не удалось сгенерировать ответ ИИ");
			}

			const data = await res.json();
			setGeneratedReply(data.reply);
		} catch (error: any) {
			console.error("[Marketing AI error]", error);
			setAiError(error.message || "Ошибка соединения");
		} finally {
			setIsAiLoading(false);
		}
	};

	const handleCopy = () => {
		if (!generatedReply) return;
		navigator.clipboard.writeText(generatedReply).then(() => {
			setCopied(true);
			setTimeout(() => setCopied(false), 2500);
		});
	};

	const clearAll = () => {
		setReviewText("");
		setGeneratedReply("");
		setCopied(false);
	};

	return (
		<section
			className="marketing-zone"
			id="marketing"
			aria-label="Маркетинг/SEO"
		>
			<motion.div
				initial={{ opacity: 0, y: -10 }}
				animate={{ opacity: 1, y: 0 }}
				className="marketing-header"
			>
				<h2 className="marketing-header-title">
					<TrendingUp size={28} color="var(--teal)" />
					Маркетинг и SEO
				</h2>
				<span
					className="status-pill"
					style={{
						background: "rgba(16, 185, 129, 0.1)",
						color: "#059669",
						border: "1px solid rgba(16, 185, 129, 0.2)",
					}}
				>
					<span
						style={{
							display: "inline-block",
							width: "8px",
							height: "8px",
							background: "#10b981",
							borderRadius: "50%",
							marginRight: "6px",
						}}
					/>
					Система активна
				</span>
			</motion.div>

			{/* STATS STRIP */}
			<motion.div
				className="marketing-stats-strip"
				aria-label="Рейтинги клиники"
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.1 }}
			>
				<div className="marketing-stat-card yandex">
					<div className="marketing-stat-icon-wrapper">
						<MapPin size={24} />
					</div>
					<div className="marketing-stat-content">
						<h3 className="marketing-stat-title">Яндекс Карты</h3>
						<div className="marketing-rating-inputs">
							<input
								type="number"
								step="0.1"
								className="rating-val"
								value={stats.yandex.rating || ""}
								onChange={(e) => updateStat("yandex", "rating", e.target.value)}
								title="Рейтинг"
							/>
							<Star size={16} color="var(--amber)" fill="var(--amber)" />
							<input
								type="number"
								className="reviews-val"
								value={stats.yandex.reviews || ""}
								onChange={(e) =>
									updateStat("yandex", "reviews", e.target.value)
								}
								title="Отзывов"
							/>
							<span style={{ fontSize: 13, color: "var(--muted)" }}>отз.</span>
						</div>
					</div>
				</div>

				<div className="marketing-stat-card gis2">
					<div className="marketing-stat-icon-wrapper">
						<Globe size={24} />
					</div>
					<div className="marketing-stat-content">
						<h3 className="marketing-stat-title">2ГИС</h3>
						<div className="marketing-rating-inputs">
							<input
								type="number"
								step="0.1"
								className="rating-val"
								value={stats.gis2.rating || ""}
								onChange={(e) => updateStat("gis2", "rating", e.target.value)}
							/>
							<Star size={16} color="var(--amber)" fill="var(--amber)" />
							<input
								type="number"
								className="reviews-val"
								value={stats.gis2.reviews || ""}
								onChange={(e) => updateStat("gis2", "reviews", e.target.value)}
							/>
							<span style={{ fontSize: 13, color: "var(--muted)" }}>отз.</span>
						</div>
					</div>
				</div>

				<div className="marketing-stat-card google">
					<div className="marketing-stat-icon-wrapper">
						<Search size={24} />
					</div>
					<div className="marketing-stat-content">
						<h3 className="marketing-stat-title">Google Maps</h3>
						<div className="marketing-rating-inputs">
							<input
								type="number"
								step="0.1"
								className="rating-val"
								value={stats.google.rating || ""}
								onChange={(e) => updateStat("google", "rating", e.target.value)}
							/>
							<Star size={16} color="var(--amber)" fill="var(--amber)" />
							<input
								type="number"
								className="reviews-val"
								value={stats.google.reviews || ""}
								onChange={(e) =>
									updateStat("google", "reviews", e.target.value)
								}
							/>
							<span style={{ fontSize: 13, color: "var(--muted)" }}>отз.</span>
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
								display: "flex",
								alignItems: "baseline",
								gap: "6px",
								marginTop: "4px",
							}}
						>
							<strong
								style={{ fontSize: 20, color: "var(--ink)", lineHeight: 1 }}
							>
								Топ-3
							</strong>
							<span
								style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}
							>
								в поиске
							</span>
						</div>
					</div>
				</div>
			</motion.div>

			{/* TAB NAV */}
			<motion.div
				className="marketing-tab-nav"
				role="tablist"
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: 0.2 }}
				style={{
					display: "flex",
					gap: "8px",
					overflowX: "auto",
					paddingBottom: "4px",
				}}
			>
				<button
					className={`marketing-tab ${activeTab === "reviews" ? "active" : ""}`}
					onClick={() => setActiveTab("reviews")}
					role="tab"
					aria-selected={activeTab === "reviews"}
					type="button"
				>
					<MessageSquare size={18} />
					ИИ Ответы
				</button>
				<button
					className={`marketing-tab ${activeTab === "keys" ? "active" : ""}`}
					onClick={() => setActiveTab("keys")}
					role="tab"
					aria-selected={activeTab === "keys"}
					type="button"
				>
					<Search size={18} />
					SEO Ключи
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
			</motion.div>

			{/* CONTENT PANELS */}
			<AnimatePresence mode="wait">
				{activeTab === "reviews" && (
					<motion.div
						key="reviews"
						className="marketing-panel"
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -10 }}
						transition={{ duration: 0.2 }}
					>
						<div className="marketing-form-grid">
							<div>
								<label htmlFor="mkt-phone">
									Телефон главного врача (для решения конфликтов)
								</label>
								<input
									className="text-input"
									id="mkt-phone"
									type="tel"
									value={phone}
									onChange={handlePhoneChange}
									onBlur={handlePhoneBlur}
									placeholder="+7 (000) 000-00-00"
								/>
							</div>

							<div>
								<label>Тональность отзыва клиента</label>
								<div className="marketing-tone-group" role="group">
									<button
										type="button"
										className={`tone-btn positive ${tone === "positive" ? "active" : ""}`}
										onClick={() => setTone("positive")}
									>
										<ThumbsUp size={18} /> Отличный
									</button>
									<button
										type="button"
										className={`tone-btn neutral ${tone === "neutral" ? "active" : ""}`}
										onClick={() => setTone("neutral")}
									>
										<MinusCircle size={18} /> Нейтральный
									</button>
									<button
										type="button"
										className={`tone-btn negative ${tone === "negative" ? "active" : ""}`}
										onClick={() => setTone("negative")}
									>
										<ThumbsDown size={18} /> Проблема
									</button>
								</div>
							</div>
						</div>

						<div style={{ marginTop: "24px" }}>
							<label
								htmlFor="mkt-review"
								style={{ display: "flex", alignItems: "center", gap: "8px" }}
							>
								<Copy size={16} /> Вставьте текст отзыва с платформы
							</label>
							<textarea
								className="marketing-textarea"
								id="mkt-review"
								value={reviewText}
								onChange={(e) => setReviewText(e.target.value)}
								placeholder="Вчера удаляла зуб мудрости. Врач просто супер, всё прошло без боли! Рекомендую всем."
							/>
							<div className="quick-chips-row">
								<span
									style={{
										fontSize: 13,
										color: "var(--muted)",
										fontWeight: 600,
										padding: "6px 4px",
									}}
								>
									Шаблоны:
								</span>
								<button
									type="button"
									className="quick-chip"
									onClick={() => {
										setReviewText(
											"Вчера удаляла зуб мудрости. Врач просто супер, всё прошло без боли!",
										);
										setTone("positive");
									}}
								>
									Позитивный
								</button>
								<button
									type="button"
									className="quick-chip"
									onClick={() => {
										setReviewText(
											"Долго ждал приема, администратор даже не поздоровалась.",
										);
										setTone("negative");
									}}
								>
									Жалоба
								</button>
							</div>
						</div>

						<div className="marketing-actions">
							<button
								className="marketing-btn-generate"
								type="button"
								onClick={handleGenerate}
								disabled={!reviewText.trim() || isAiLoading}
							>
								<Sparkles size={20} />
								{isAiLoading ? "Генерация ответа..." : "Сгенерировать AI-ответ"}
							</button>
							{(generatedReply || reviewText) && (
								<button
									className="marketing-btn-clear"
									type="button"
									onClick={clearAll}
									disabled={isAiLoading}
								>
									Сбросить
								</button>
							)}
						</div>

						{isAiLoading && (
							<div className="ai-skeleton-loader">
								<div className="ai-skeleton-line" />
								<div className="ai-skeleton-line medium" />
								<div className="ai-skeleton-line short" />
							</div>
						)}

						{generatedReply && !isAiLoading && (
							<motion.div
								className="marketing-result"
								initial={{ opacity: 0, scale: 0.98 }}
								animate={{ opacity: 1, scale: 1 }}
							>
								<div
									style={{
										display: "flex",
										justifyContent: "space-between",
										alignItems: "flex-start",
										marginBottom: "12px",
									}}
								>
									<div>
										<h4
											style={{
												margin: 0,
												fontSize: 14,
												fontWeight: 700,
												color: "var(--teal-dark)",
												textTransform: "uppercase",
												letterSpacing: "0.05em",
											}}
										>
											Оптимизированный ответ
										</h4>
										<p
											style={{
												margin: "4px 0 0 0",
												fontSize: 13,
												color: "var(--muted)",
											}}
										>
											Готов для публикации на Яндекс, Google или 2ГИС
										</p>
									</div>
									<button
										type="button"
										className="secondary-button"
										onClick={handleCopy}
										style={{
											padding: "8px 16px",
											background: copied ? "var(--green-soft)" : undefined,
											color: copied ? "var(--green)" : undefined,
											borderColor: copied ? "var(--green)" : undefined,
										}}
									>
										{copied ? (
											<>
												<CheckCircle2 size={18} /> Скопировано
											</>
										) : (
											<>
												<Copy size={18} /> Скопировать
											</>
										)}
									</button>
								</div>
								<p className="marketing-reply-text">{generatedReply}</p>
							</motion.div>
						)}
					</motion.div>
				)}

				{activeTab === "keys" && (
					<motion.div
						key="keys"
						className="marketing-panel"
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -10 }}
						transition={{ duration: 0.2 }}
					>
						<div style={{ maxWidth: "600px" }}>
							<h3
								style={{ marginTop: 0, marginBottom: "8px", fontSize: "18px" }}
							>
								Семантическое ядро клиники
							</h3>
							<p
								style={{
									color: "var(--muted)",
									marginBottom: "24px",
									lineHeight: 1.6,
									fontSize: "15px",
								}}
							>
								Эти поисковые ключи ИИ будет нативно интегрировать в ответы на
								позитивные отзывы. Это органически повышает рейтинг вашей
								карточки в поисковых системах.
							</p>

							<div
								style={{ display: "flex", gap: "12px", marginBottom: "24px" }}
							>
								<input
									type="text"
									className="text-input"
									value={newKeyInput}
									onChange={(e) => setNewKeyInput(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter") {
											handleAddSeoKey(newKeyInput);
											setNewKeyInput("");
										}
									}}
									placeholder="Введите новый SEO-ключ..."
									style={{ flex: 1 }}
								/>
								<button
									type="button"
									className="primary-button"
									onClick={() => {
										handleAddSeoKey(newKeyInput);
										setNewKeyInput("");
									}}
									disabled={!newKeyInput.trim()}
								>
									Добавить ключ
								</button>
							</div>

							<div className="seo-keys-grid">
								{customSeoKeys.map((key: string) => (
									<div className="seo-key-chip" key={key}>
										<Search size={14} />
										<span>{key}</span>
										<button
											type="button"
											className="seo-key-chip-remove"
											onClick={() => handleRemoveSeoKey(key)}
											aria-label={`Удалить ключ ${key}`}
										>
											×
										</button>
									</div>
								))}
								{customSeoKeys.length === 0 && (
									<p style={{ color: "var(--muted)", fontStyle: "italic" }}>
										Нет добавленных ключей.
									</p>
								)}
							</div>
						</div>
					</motion.div>
				)}

				{activeTab === "stats" && (
					<motion.div
						key="stats"
						className="marketing-panel"
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -10 }}
						transition={{ duration: 0.2 }}
					>
						<div style={{ maxWidth: "800px" }}>
							<h3
								style={{ marginTop: 0, marginBottom: "24px", fontSize: "18px" }}
							>
								Регламент работы с репутацией
							</h3>

							<div className="marketing-warning">
								<h4
									style={{
										display: "flex",
										alignItems: "center",
										gap: "8px",
										margin: "0 0 8px 0",
									}}
								>
									<AlertTriangle size={18} /> Критическое правило
								</h4>
								Никогда не используйте ботов для накрутки отзывов. Алгоритмы
								Яндекса и 2ГИС распознают паттерны машинной генерации и теневые
								блокировки приведут к падению трафика. Используйте ручной
								перенос отзывов.
							</div>

							<div style={{ marginTop: "32px" }}>
								<h4
									style={{
										margin: "0 0 16px 0",
										fontSize: "16px",
										color: "var(--ink)",
									}}
								>
									Архитектура ответа на негатив
								</h4>
								<div className="marketing-formula">
									<span className="formula-step">Извинение без оправданий</span>
									<span className="formula-arrow">→</span>
									<span className="formula-step">
										Признание важности проблемы
									</span>
									<span className="formula-arrow">→</span>
									<span className="formula-step">
										Перевод в оффлайн (контакт Главврача)
									</span>
								</div>
								<p
									style={{
										color: "var(--muted)",
										fontSize: "14px",
										marginTop: "16px",
										lineHeight: 1.6,
									}}
								>
									Цель ответа на негатив — не переубедить скандалиста, а
									показать другим потенциальным клиентам вашу адекватность и
									готовность решать проблемы.
								</p>
							</div>

							<div
								style={{
									marginTop: "32px",
									borderTop: "1px solid var(--line)",
									paddingTop: "24px",
								}}
							>
								<h4
									style={{
										margin: "0 0 16px 0",
										fontSize: "16px",
										color: "var(--ink)",
									}}
								>
									Внедрение SEO-ключей
								</h4>
								<ul
									style={{
										paddingLeft: "20px",
										color: "var(--ink)",
										lineHeight: 1.8,
										fontSize: "15px",
										margin: 0,
									}}
								>
									<li>
										<strong style={{ color: "var(--teal-dark)" }}>
											Позитив:
										</strong>{" "}
										1-2 ключа естественно вплетенных в текст.
									</li>
									<li>
										<strong style={{ color: "var(--teal-dark)" }}>
											Нейтраль:
										</strong>{" "}
										Фокус на благодарности, 1 ключ максимум.
									</li>
									<li>
										<strong style={{ color: "var(--red)" }}>Негатив:</strong> 0
										ключей. Внедрение коммерческих ключей в разбор жалобы
										выглядит цинично.
									</li>
								</ul>
							</div>
						</div>
					</motion.div>
				)}

				{activeTab === "nps" && (
					<motion.div
						key="nps"
						className="marketing-panel"
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -10 }}
						transition={{ duration: 0.2 }}
					>
						<div style={{ maxWidth: "800px" }}>
							<h3
								style={{ marginTop: 0, marginBottom: "24px", fontSize: "18px" }}
							>
								Система оценки качества (NPS)
							</h3>

							<div
								style={{
									display: "flex",
									gap: "24px",
									marginBottom: "32px",
									flexWrap: "wrap",
								}}
							>
								<div
									className="marketing-stat-card"
									style={{ flex: "1 1 200px" }}
								>
									<div className="marketing-stat-icon-wrapper">
										<Star size={24} />
									</div>
									<div className="marketing-stat-content">
										<h3 className="marketing-stat-title">Ваш NPS</h3>
										<strong
											style={{
												fontSize: 24,
												color: "var(--teal)",
												lineHeight: 1,
												marginTop: 4,
											}}
										>
											{npsScore}
										</strong>
									</div>
								</div>

								<div
									style={{
										flex: "2 1 300px",
										display: "flex",
										flexDirection: "column",
										gap: "16px",
										background: "var(--paper-soft)",
										padding: "16px",
										borderRadius: "12px",
										border: "1px solid var(--line)",
									}}
								>
									<div
										style={{
											display: "flex",
											alignItems: "center",
											justifyContent: "space-between",
										}}
									>
										<div>
											<strong
												style={{
													display: "block",
													fontSize: 15,
													color: "var(--ink)",
												}}
											>
												Авто-опросы пациентов
											</strong>
											<span style={{ fontSize: 13, color: "var(--muted)" }}>
												Отправлять SMS с просьбой оценить прием
											</span>
										</div>
										<label className="theme-switch" style={{ margin: 0 }}>
											<input
												type="checkbox"
												checked={npsEnabled}
												onChange={(e) => setNpsEnabled(e.target.checked)}
											/>
											<span className="slider round"></span>
										</label>
									</div>

									<div
										style={{
											opacity: npsEnabled ? 1 : 0.5,
											pointerEvents: npsEnabled ? "auto" : "none",
											transition: "opacity 0.2s",
										}}
									>
										<label
											style={{
												display: "block",
												fontSize: 13,
												color: "var(--muted)",
												marginBottom: 8,
											}}
										>
											Задержка перед отправкой (часы)
										</label>
										<div
											style={{ display: "flex", alignItems: "center", gap: 12 }}
										>
											<input
												type="range"
												min="1"
												max="72"
												value={npsSendDelay}
												onChange={(e) =>
													setNpsSendDelay(parseInt(e.target.value))
												}
												style={{ flex: 1, accentColor: "var(--teal)" }}
											/>
											<strong style={{ color: "var(--ink)", width: 40 }}>
												{npsSendDelay} ч
											</strong>
										</div>
									</div>
								</div>
							</div>

							<h4
								style={{
									margin: "0 0 16px 0",
									fontSize: "16px",
									color: "var(--ink)",
								}}
							>
								Шаблон сообщения
							</h4>
							<textarea
								className="marketing-textarea"
								value={npsMessageTemplate}
								onChange={(e) => setNpsMessageTemplate(e.target.value)}
								rows={4}
							/>
							<div
								style={{
									marginTop: "16px",
									display: "flex",
									justifyContent: "flex-end",
								}}
							>
								<button
									className="primary-button"
									onClick={() =>
										saveMarketingData({
											npsEnabled,
											npsSendDelay,
											npsMessageTemplate,
										})
									}
								>
									Сохранить настройки NPS
								</button>
							</div>
						</div>
					</motion.div>
				)}

				{activeTab === "referrals" && (
					<motion.div
						key="referrals"
						className="marketing-panel"
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -10 }}
						transition={{ duration: 0.2 }}
					>
						<div style={{ maxWidth: "800px" }}>
							<h3
								style={{ marginTop: 0, marginBottom: "8px", fontSize: "18px" }}
							>
								Реферальная Программа
							</h3>
							<p
								style={{
									color: "var(--muted)",
									marginBottom: "24px",
									lineHeight: 1.6,
									fontSize: "15px",
								}}
							>
								Стимулируйте пациентов рекомендовать вашу клинику друзьям и
								близким в обмен на бонусы.
							</p>

							<div
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
									background: "var(--paper-soft)",
									padding: "16px 20px",
									borderRadius: "12px",
									border: "1px solid var(--line)",
									marginBottom: "24px",
								}}
							>
								<div>
									<strong
										style={{
											display: "block",
											fontSize: 15,
											color: "var(--ink)",
										}}
									>
										Статус программы
									</strong>
									<span style={{ fontSize: 13, color: "var(--muted)" }}>
										Начисление бонусов за приглашенных
									</span>
								</div>
								<label className="theme-switch" style={{ margin: 0 }}>
									<input
										type="checkbox"
										checked={refEnabled}
										onChange={(e) => setRefEnabled(e.target.checked)}
									/>
									<span className="slider round"></span>
								</label>
							</div>

							<div
								style={{
									opacity: refEnabled ? 1 : 0.5,
									pointerEvents: refEnabled ? "auto" : "none",
									transition: "opacity 0.2s",
								}}
							>
								<div
									className="marketing-form-grid"
									style={{ marginBottom: "24px" }}
								>
									<div>
										<label>Бонус приглашающему (₽)</label>
										<input
											type="number"
											className="text-input"
											value={refReward}
											onChange={(e) => setRefReward(e.target.value)}
										/>
									</div>
									<div>
										<label>Скидка новому пациенту (%)</label>
										<input
											type="number"
											className="text-input"
											value={refNewDiscount}
											onChange={(e) => setRefNewDiscount(e.target.value)}
										/>
									</div>
								</div>

								<h4
									style={{
										margin: "0 0 16px 0",
										fontSize: "16px",
										color: "var(--ink)",
									}}
								>
									Сгенерированная ссылка для пациентов
								</h4>
								<div style={{ display: "flex", gap: "12px" }}>
									<input
										type="text"
										className="text-input"
										value={`https://dente.app/ref/${auth.currentOrganizationId()}/P8X1A`}
										readOnly
										style={{
											flex: 1,
											background: "var(--paper-soft)",
											color: "var(--teal)",
										}}
									/>
									<button
										className="secondary-button"
										onClick={() => showToast("Ссылка скопирована", "success")}
									>
										<Copy size={16} /> Копировать
									</button>
								</div>

								<div
									style={{
										marginTop: "32px",
										display: "flex",
										justifyContent: "flex-end",
									}}
								>
									<button
										className="primary-button"
										onClick={() =>
											saveMarketingData({
												refEnabled,
												refReward,
												refNewDiscount,
											})
										}
									>
										Применить условия рефералки
									</button>
								</div>
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</section>
	);
}
