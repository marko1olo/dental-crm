/**
 * MarketingStudioModal.tsx — Каноническое окно Студии маркетинга, акций и ROMI клиники.
 * Разработано строго для частной стоматологии РФ (1–5 кресел) с реальными потоками данных.
 * Мандаты 8b/8zi (Sweet Spot 400–470 строк), 8e (Автономия врача), 8am (1 Primary CTA), 8ze (Apple HIG).
 */

import React, { useState, useMemo } from "react";
import {
	Megaphone, X, TrendingUp, Tag, Rocket, CheckCircle2,
	Copy, Check, Sparkles, Coins, Users, BarChart3,
} from "lucide-react";
import {
	type MarketingChannelBenchmark, type MarketingPromoPackage, type MarketingChannelId,
	CANONICAL_MARKETING_CHANNELS, CANONICAL_PROMO_PACKAGES,
	formatKopecksToRub, formatRomiPercent, calculateMarketingAggregateSummary,
} from "./marketingCatalogData.js";
import "./marketing.css";

export type MarketingStudioTab = "romi" | "promos" | "launch";

export interface MarketingStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialTab?: MarketingStudioTab;
	readonly clinicName?: string;
}

export const MarketingStudioModal: React.FC<MarketingStudioModalProps> = ({
	isOpen,
	onClose,
	initialTab = "romi",
	clinicName = "Стоматология ДЕНТЕ",
}) => {
	const [activeTab, setActiveTab] = useState<MarketingStudioTab>(initialTab);
	const [channels] = useState<readonly MarketingChannelBenchmark[]>(() => CANONICAL_MARKETING_CHANNELS);
	const [promos, setPromos] = useState<readonly MarketingPromoPackage[]>(() => CANONICAL_PROMO_PACKAGES);
	const [copiedCode, setCopiedCode] = useState<string | null>(null);
	const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

	// Экспресс-форма запуска акции (дефолтные значения — готовы к отправке в 1 клик)
	const [formTitle, setFormTitle] = useState("Комплексный семейный чек-ап зубов");
	const [formCode, setFormCode] = useState("FAMILY-2026");
	const [formCategory, setFormCategory] = useState("Диагностика");
	const [formPriceRub, setFormPriceRub] = useState(3900);
	const [formRegularPriceRub, setFormRegularPriceRub] = useState(6000);
	const [formChannel, setFormChannel] = useState<MarketingChannelId>("yandex_maps");
	const [formValidityDays, setFormValidityDays] = useState(30);
	const [formTemplate, setFormTemplate] = useState(
		"Здравствуйте! В ДЕНТЕ действует акция «Семейный чек-ап»: осмотр двоих за 3 900 ₽ вместо 6 000 ₽. Промокод {Промокод}.",
	);

	const summary = useMemo(() => calculateMarketingAggregateSummary(channels), [channels]);

	if (!isOpen) return null;

	const handleCopyCode = (code: string) => {
		try {
			if (typeof navigator !== "undefined" && navigator.clipboard) {
				navigator.clipboard.writeText(code);
			}
		} catch {}
		setCopiedCode(code);
		setTimeout(() => setCopiedCode(null), 2000);
	};

	const handleTogglePromoStatus = (promoId: string) => {
		setPromos((prev) =>
			prev.map((p) => (p.id === promoId ? { ...p, status: p.status === "active" ? "paused" : "active" } : p)),
		);
	};

	const handleSelectPreset = (pkg: MarketingPromoPackage) => {
		setFormTitle(pkg.title);
		setFormCode(pkg.promoCode);
		setFormCategory(pkg.category);
		setFormPriceRub(Math.round(pkg.priceKopecks / 100));
		setFormRegularPriceRub(Math.round(pkg.regularPriceKopecks / 100));
		setFormChannel(pkg.defaultChannelId);
		setFormValidityDays(pkg.validityDays);
		setFormTemplate(pkg.defaultMessageTemplate);
		setFeedbackMsg(`Выбран пресет «${pkg.shortTitle}»`);
		setTimeout(() => setFeedbackMsg(null), 3000);
	};

	const handleLaunchPromo = (e: React.FormEvent) => {
		e.preventDefault();
		const priceKopecks = Math.max(0, formPriceRub * 100);
		const regularPriceKopecks = Math.max(priceKopecks, formRegularPriceRub * 100);
		const discountPercent = regularPriceKopecks > 0
			? Math.round(((regularPriceKopecks - priceKopecks) / regularPriceKopecks) * 100) : 0;

		const newPromo: MarketingPromoPackage = {
			id: `promo-custom-${Date.now()}`,
			title: formTitle.trim() || "Новая промо-акция клиники",
			shortTitle: formTitle.trim() || "Акция",
			promoCode: formCode.trim().toUpperCase() || "PROMO",
			category: formCategory,
			badge: discountPercent > 0 ? `Скидка ${discountPercent}%` : "Спеццена",
			status: "active",
			priceKopecks,
			regularPriceKopecks,
			discountPercent,
			savingsKopecks: regularPriceKopecks - priceKopecks,
			targetAudience: "Первичные и постоянные пациенты клиники",
			description: formTitle,
			includedServices: ["Консультация врача-стоматолога", "Диагностический осмотр и фотопротокол", "Фиксация специальной цены по акции"],
			defaultChannelId: formChannel,
			validityDays: formValidityDays,
			stats: { impressions: 0, leads: 0, bookedPatients: 0, revenueKopecks: 0, spentKopecks: 0, romiPercent: 0 },
			defaultMessageTemplate: formTemplate,
		};

		setPromos((prev) => [newPromo, ...prev]);
		setFeedbackMsg(`Акция «${newPromo.title}» успешно запущена в клинике!`);
		setActiveTab("promos");
		setTimeout(() => setFeedbackMsg(null), 4000);
	};

	return (
		<div className="marketing-studio-backdrop" onClick={onClose} role="presentation" data-testid="marketing-studio-modal">
			<div className="marketing-studio-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="marketing-studio-title">
				{/* Apple HIG Tactile Drag Handle for Mobile Devices */}
				<div className="marketing-drag-handle-wrap" aria-hidden="true"><div className="marketing-drag-handle" /></div>

				{/* Header */}
				<header className="marketing-studio-header">
					<div className="marketing-studio-title-group">
						<div className="marketing-studio-icon-badge" aria-hidden="true"><Megaphone size={22} /></div>
						<div>
							<h2 id="marketing-studio-title" className="marketing-studio-title">Студия маркетинга и окупаемости рекламы (ROMI)</h2>
							<p className="marketing-studio-subtitle">{clinicName} · Учёт реальных каналов привлечения и запуск акций</p>
						</div>
					</div>
					<button type="button" className="marketing-studio-close-btn" onClick={onClose} aria-label="Закрыть студию маркетинга" data-testid="btn-close-modal">
						<X size={18} />
					</button>
				</header>

				{/* 4 Summary KPI Cards */}
				<section className="marketing-kpi-strip" aria-label="Сводные показатели маркетинга">
					<div className="marketing-kpi-card" data-testid="kpi-budget">
						<span className="marketing-kpi-label">Общий бюджет</span>
						<span className="marketing-kpi-value">{formatKopecksToRub(summary.totalSpentKopecks)}</span>
						<span className="marketing-kpi-subtext">6 каналов привлечения</span>
					</div>
					<div className="marketing-kpi-card" data-testid="kpi-revenue">
						<span className="marketing-kpi-label">Выручка из кассы</span>
						<span className="marketing-kpi-value">{formatKopecksToRub(summary.totalRevenueKopecks)}</span>
						<span className="marketing-kpi-subtext">Оплачено первичными</span>
					</div>
					<div className="marketing-kpi-card" data-testid="kpi-romi">
						<span className="marketing-kpi-label">Чистый ROMI</span>
						<span className="marketing-kpi-value text-[var(--teal,#0d9488)]">{formatRomiPercent(summary.overallRomiPercent)}</span>
						<span className="marketing-kpi-subtext">Прибыль {formatKopecksToRub(summary.totalProfitKopecks)}</span>
					</div>
					<div className="marketing-kpi-card" data-testid="kpi-patients">
						<span className="marketing-kpi-label">Первичных пациентов</span>
						<span className="marketing-kpi-value">{summary.totalPatientsCount} чел</span>
						<span className="marketing-kpi-subtext">Доходимость {summary.overallShowUpRatePercent}%</span>
					</div>
				</section>

				{/* Segmented Navigation Bar */}
				<nav className="marketing-nav-bar" aria-label="Вкладки студии">
					<div className="marketing-segmented-nav" role="tablist">
						<button
							type="button" role="tab" aria-selected={activeTab === "romi"}
							className={`marketing-nav-btn ${activeTab === "romi" ? "marketing-nav-btn--active" : ""}`}
							onClick={() => setActiveTab("romi")} data-testid="tab-romi"
						>
							<TrendingUp size={16} />
							<span className="hidden sm:inline">Окупаемость каналов (ROMI)</span>
							<span className="sm:hidden font-bold">ROMI</span>
						</button>
						<button
							type="button" role="tab" aria-selected={activeTab === "promos"}
							className={`marketing-nav-btn ${activeTab === "promos" ? "marketing-nav-btn--active" : ""}`}
							onClick={() => setActiveTab("promos")} data-testid="tab-promos"
						>
							<Tag size={16} />
							<span className="hidden sm:inline">Действующие акции ({promos.length})</span>
							<span className="sm:hidden font-bold">Акции ({promos.length})</span>
						</button>
						<button
							type="button" role="tab" aria-selected={activeTab === "launch"}
							className={`marketing-nav-btn ${activeTab === "launch" ? "marketing-nav-btn--active" : ""}`}
							onClick={() => setActiveTab("launch")} data-testid="tab-launch"
						>
							<Rocket size={16} />
							<span className="hidden sm:inline">Запуск новой акции за 10 сек</span>
							<span className="sm:hidden font-bold">+ Запуск</span>
						</button>
					</div>
				</nav>

				{/* Notification Banner */}
				{feedbackMsg && (
					<div className="px-6 py-2.5 bg-teal-50 dark:bg-teal-950/40 border-b border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-200 text-xs font-semibold flex items-center gap-2">
						<CheckCircle2 size={15} className="text-[var(--teal,#0d9488)] shrink-0" />
						<span>{feedbackMsg}</span>
					</div>
				)}

				{/* Scrollable Body */}
				<main className="marketing-studio-body">
					{/* Вкладка 1: Окупаемость каналов (ROMI) */}
					{activeTab === "romi" && (
						<div className="space-y-4">
							<div className="marketing-channels-table-wrap">
								<table className="marketing-channels-table" data-testid="marketing-channels-table">
									<thead>
										<tr>
											<th className="text-left">Канал рекламы</th>
											<th className="text-left">Категория</th>
											<th className="text-right">Бюджет (₽)</th>
											<th className="text-center">Лиды</th>
											<th className="text-center">Пациенты</th>
											<th className="text-right">Выручка (₽)</th>
											<th className="text-right">Ср. чек</th>
											<th className="text-right">CAC</th>
											<th className="text-center">ROMI</th>
										</tr>
									</thead>
									<tbody>
										{channels.map((ch) => (
											<tr key={ch.id}>
												<td>
													<div className="font-semibold text-[var(--ink,#0f172a)]">{ch.name}</div>
													<div className="text-xs text-[var(--text-muted,#64748b)]">{ch.badgeText}</div>
												</td>
												<td><span className="marketing-badge-tag">{ch.category}</span></td>
												<td className="text-right font-medium">{formatKopecksToRub(ch.spentKopecks)}</td>
												<td className="text-center">{ch.leadsCount}</td>
												<td className="text-center font-bold text-[var(--teal,#0d9488)]">{ch.patientsCount}</td>
												<td className="text-right font-bold">{formatKopecksToRub(ch.revenueKopecks)}</td>
												<td className="text-right">{formatKopecksToRub(ch.avgCheckKopecks)}</td>
												<td className="text-right">{formatKopecksToRub(ch.cacKopecks)}</td>
												<td className="text-center">
													{ch.romiStatus === "organic" ? (
														<span className="marketing-badge-organic">Органика (∞)</span>
													) : (
														<span className="marketing-badge-profitable">{formatRomiPercent(ch.romiPercent)}</span>
													)}
												</td>
											</tr>
										))}
									</tbody>
									<tfoot>
										<tr>
											<td colSpan={2}>ИТОГО ПО КЛИНИКЕ</td>
											<td className="text-right">{formatKopecksToRub(summary.totalSpentKopecks)}</td>
											<td className="text-center">{summary.totalLeadsCount}</td>
											<td className="text-center text-[var(--teal,#0d9488)]">{summary.totalPatientsCount}</td>
											<td className="text-right">{formatKopecksToRub(summary.totalRevenueKopecks)}</td>
											<td className="text-right">{formatKopecksToRub(summary.overallAvgCheckKopecks)}</td>
											<td className="text-right">{formatKopecksToRub(summary.overallCacKopecks)}</td>
											<td className="text-center text-[var(--teal,#0d9488)]">{formatRomiPercent(summary.overallRomiPercent)}</td>
										</tr>
									</tfoot>
								</table>
							</div>

							{/* Mobile Grouped Cards View (Apple HIG) */}
							<div className="marketing-channels-mobile-list" data-testid="marketing-channels-mobile-list">
								{channels.map((ch) => (
									<div key={ch.id} className="marketing-channel-mobile-card">
										<div className="marketing-channel-card-header">
											<div>
												<div className="marketing-channel-card-title">{ch.name}</div>
												<span className="marketing-badge-tag">{ch.category}</span>
											</div>
											{ch.romiStatus === "organic" ? (
												<span className="marketing-badge-organic">Органика</span>
											) : (
												<span className="marketing-badge-profitable">ROMI {formatRomiPercent(ch.romiPercent)}</span>
											)}
										</div>
										<div className="marketing-channel-metrics-grid">
											<div className="marketing-metric-item">
												<span className="marketing-metric-label">Потрачено</span>
												<span className="marketing-metric-val">{formatKopecksToRub(ch.spentKopecks)}</span>
											</div>
											<div className="marketing-metric-item">
												<span className="marketing-metric-label">Выручка</span>
												<span className="marketing-metric-val text-[var(--teal,#0d9488)]">{formatKopecksToRub(ch.revenueKopecks)}</span>
											</div>
											<div className="marketing-metric-item">
												<span className="marketing-metric-label">Пациенты</span>
												<span className="marketing-metric-val">{ch.patientsCount} чел ({ch.showUpRatePercent}%)</span>
											</div>
											<div className="marketing-metric-item">
												<span className="marketing-metric-label">CAC (пациент)</span>
												<span className="marketing-metric-val">{formatKopecksToRub(ch.cacKopecks)}</span>
											</div>
										</div>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Вкладка 2: Действующие акции и скидки */}
					{activeTab === "promos" && (
						<div className="marketing-promos-grid" data-testid="marketing-promos-grid">
							{promos.map((pkg) => (
								<article key={pkg.id} className="marketing-promo-card">
									<div className="marketing-promo-header">
										<div>
											<span className="marketing-badge-tag">{pkg.category}</span>
											<h3 className="marketing-promo-title mt-1">{pkg.title}</h3>
										</div>
										<span className="marketing-promo-badge">{pkg.badge}</span>
									</div>
									<p className="text-xs text-[var(--text-muted,#64748b)] leading-relaxed">{pkg.description}</p>
									<div className="marketing-promo-pricing">
										<span className="marketing-promo-price">{formatKopecksToRub(pkg.priceKopecks)}</span>
										{pkg.regularPriceKopecks > pkg.priceKopecks && (
											<span className="marketing-promo-old-price">{formatKopecksToRub(pkg.regularPriceKopecks)}</span>
										)}
									</div>
									<div className="marketing-promo-included">
										<span className="text-[11px] font-semibold text-[var(--text-muted,#64748b)]">В услугу входит:</span>
										{pkg.includedServices.slice(0, 3).map((item, idx) => (
											<div key={idx} className="marketing-promo-item-row">
												<CheckCircle2 size={13} className="text-[var(--teal,#0d9488)] shrink-0" />
												<span>{item}</span>
											</div>
										))}
									</div>
									<div className="marketing-promo-actions">
										<button
											type="button" className="marketing-code-chip"
											onClick={() => handleCopyCode(pkg.promoCode)} title="Нажмите для копирования промокода"
										>
											{copiedCode === pkg.promoCode ? <Check size={13} className="text-[var(--teal,#0d9488)]" /> : <Copy size={13} />}
											<span>{pkg.promoCode}</span>
										</button>
										<button
											type="button" className="marketing-status-toggle-btn"
											onClick={() => handleTogglePromoStatus(pkg.id)}
										>
											{pkg.status === "active" ? "✓ Активна" : "Приостановлена"}
										</button>
									</div>
								</article>
							))}
						</div>
					)}

					{/* Вкладка 3: Запуск новой акции за 10 секунд */}
					{activeTab === "launch" && (
						<form onSubmit={handleLaunchPromo} className="marketing-express-form" data-testid="marketing-express-form">
							<div className="marketing-form-group">
								<label className="marketing-form-label flex items-center gap-1.5">
									<Sparkles size={15} className="text-[var(--teal,#0d9488)]" />
									<span>Быстрый выбор проверенного пресета стоматологии:</span>
								</label>
								<div className="marketing-presets-chips-row">
									{CANONICAL_PROMO_PACKAGES.map((pkg) => (
										<button
											key={pkg.id} type="button" className="marketing-preset-chip"
											onClick={() => handleSelectPreset(pkg)}
										>
											{pkg.shortTitle} ({formatKopecksToRub(pkg.priceKopecks)})
										</button>
									))}
								</div>
							</div>
							<div className="marketing-form-group">
								<label className="marketing-form-label">Название акции</label>
								<input
									type="text" className="marketing-form-input" value={formTitle}
									onChange={(e) => setFormTitle(e.target.value)}
									placeholder="Например: Скидка 15% на первое лечение кариеса" required
								/>
							</div>
							<div className="marketing-form-row">
								<div className="marketing-form-group">
									<label className="marketing-form-label">Промокод</label>
									<input
										type="text" className="marketing-form-input uppercase" value={formCode}
										onChange={(e) => setFormCode(e.target.value)} placeholder="SMILE-2026" required
									/>
								</div>
								<div className="marketing-form-group">
									<label className="marketing-form-label">Основной канал</label>
									<select
										className="marketing-form-select" value={formChannel}
										onChange={(e) => setFormChannel(e.target.value as MarketingChannelId)}
									>
										<option value="yandex_maps">Яндекс Карты</option>
										<option value="gis2">2ГИС</option>
										<option value="prodoctorov">ПроДокторов</option>
										<option value="word_of_mouth">Сарафанное радио</option>
										<option value="website">Сайт клиники</option>
										<option value="telegram">Telegram</option>
									</select>
								</div>
							</div>
							<div className="marketing-form-row">
								<div className="marketing-form-group">
									<label className="marketing-form-label">Цена по акции (₽)</label>
									<input
										type="number" className="marketing-form-input" value={formPriceRub}
										onChange={(e) => setFormPriceRub(Number(e.target.value) || 0)} min={0} step={100}
									/>
								</div>
								<div className="marketing-form-group">
									<label className="marketing-form-label">Обычная цена (₽)</label>
									<input
										type="number" className="marketing-form-input" value={formRegularPriceRub}
										onChange={(e) => setFormRegularPriceRub(Number(e.target.value) || 0)} min={0} step={100}
									/>
								</div>
							</div>
							<div className="marketing-form-group">
								<label className="marketing-form-label">Шаблон текста для мессенджера / сайта</label>
								<textarea
									className="marketing-form-textarea" value={formTemplate}
									onChange={(e) => setFormTemplate(e.target.value)} placeholder="Текст сообщения..."
								/>
							</div>
							{/* Единственная Primary CTA кнопка (Мандат 8am) */}
							<button type="submit" className="marketing-primary-cta" data-testid="btn-launch-promo">
								<Rocket size={18} />
								<span>Запустить акцию в клинике за 1 клик</span>
							</button>
						</form>
					)}
				</main>
			</div>
		</div>
	);
};

export default MarketingStudioModal;
