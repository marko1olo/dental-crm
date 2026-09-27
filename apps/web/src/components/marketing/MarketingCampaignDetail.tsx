/**
 * MarketingCampaignDetail.tsx — Right Column: Dominant Campaign Workspace.
 * Analytics KPIs, Message Preview Simulator (SMS/WhatsApp/Telegram), and 1-Click Audience Launch.
 * Governed by Mandate 8c, 8e, 8n (Zero-Void, 1-Click Flow, Real Clinical Density).
 */

import React, { useState } from "react";
import {
	Send,
	MessageSquare,
	Users,
	TrendingUp,
	DollarSign,
	Target,
	Copy,
	Check,
	Sparkles,
	ShieldCheck,
	Info,
	CheckCircle2,
	Clock,
} from "lucide-react";
import type { MarketingPromo, MessageChannel } from "./marketingTypes";
import { DEFAULT_PATIENT_SEGMENTS } from "./marketingPresets";
import { showToast } from "../GlobalToast";

export interface MarketingCampaignDetailProps {
	readonly promo: MarketingPromo;
	readonly clinicName: string;
	readonly onTogglePromoStatus: (promoId: string) => void;
}

export const MarketingCampaignDetail: React.FC<MarketingCampaignDetailProps> = ({
	promo,
	clinicName,
	onTogglePromoStatus,
}) => {
	const [selectedChannel, setSelectedChannel] = useState<MessageChannel>("sms");
	const [selectedSegmentId, setSelectedSegmentId] = useState<string>(
		promo.recommendedSegment || "no_visit_6m",
	);
	const [consentOnly, setConsentOnly] = useState<boolean>(true);
	const [isCopied, setIsCopied] = useState<boolean>(false);
	const [isSending, setIsSending] = useState<boolean>(false);
	const [testSent, setTestSent] = useState<boolean>(false);

	const fallbackSegment: PatientSegmentOption = DEFAULT_PATIENT_SEGMENTS[0] ?? {
		id: "default",
		name: "Сегмент по умолчанию",
		count: 100,
		description: "Все пациенты клиники",
	};
	const activeSegment =
		DEFAULT_PATIENT_SEGMENTS.find((s) => s.id === selectedSegmentId) ??
		fallbackSegment;

	// Channel pricing per message
	const channelRates: Record<MessageChannel, { rateRub: number; label: string }> = {
		sms: { rateRub: 2.8, label: "1 SMS (68 символов) · 2.80 ₽ / сообщение" },
		whatsapp: { rateRub: 3.9, label: "WhatsApp Business API Template · 3.90 ₽ / диалог" },
		telegram: { rateRub: 0.0, label: "Telegram CRM Bot Интеграция · 0.00 ₽" },
	};

	const estimatedCostRub = (activeSegment.count * channelRates[selectedChannel].rateRub).toFixed(2);

	const handleCopyPromoCode = () => {
		navigator.clipboard?.writeText(promo.promoCode);
		setIsCopied(true);
		showToast(`Промокод «${promo.promoCode}» скопирован в буфер обмена`, "info");
		setTimeout(() => setIsCopied(false), 2000);
	};

	const handleTestSend = () => {
		setTestSent(true);
		showToast(`Тестовое сообщение (${selectedChannel.toUpperCase()}) отправлено на ваш номер врача`, "info");
		setTimeout(() => setTestSent(false), 3000);
	};

	const handleLaunchCampaign = () => {
		setIsSending(true);
		setTimeout(() => {
			setIsSending(false);
			showToast(
				`Рассылка «${promo.title}» успешно запущена! Поставлено в очередь: ${activeSegment.count} получателей.`,
				"info",
			);
		}, 800);
	};

	// Compile live simulated preview
	const getRawTemplate = (): string => {
		if (selectedChannel === "whatsapp") return promo.templates.whatsapp;
		if (selectedChannel === "telegram") return promo.templates.telegram;
		return promo.templates.sms;
	};

	const getCompiledPreview = (): string => {
		const raw = getRawTemplate();
		return raw
			.replace(/\{Имя\}/g, "Роман")
			.replace(/\{Клиника\}/g, clinicName || "ДЕНТЕ Премиум")
			.replace(/\{Скидка\}/g, promo.discountText)
			.replace(/\{Промокод\}/g, promo.promoCode)
			.replace(/\{Срок\}/g, promo.validUntil)
			.replace(/\{Ссылка\}/g, "dente.ru/b/h35");
	};

	return (
		<div className="marketing-workspace-col" data-testid="marketing-campaign-detail">
			{/* 1. Header Bar */}
			<div className="marketing-workspace-header">
				<div className="marketing-workspace-header__main">
					<div className="flex items-center gap-2 flex-wrap mb-1">
						<span className="marketing-badge-category">{promo.category}</span>
						<span className="marketing-badge-validity">
							<Clock size={11} className="inline mr-1" />
							до {promo.validUntil}
						</span>
						<span
							className={`marketing-status-pill ${
								promo.status === "active"
									? "marketing-status-pill--active"
									: "marketing-status-pill--archived"
							}`}
						>
							{promo.status === "active" ? "Активна в клинике" : "В архиве"}
						</span>
					</div>
					<h3 className="marketing-workspace-title">{promo.title}</h3>
					<p className="marketing-workspace-desc">{promo.description}</p>
				</div>

				<div className="marketing-workspace-header__actions">
					<div className="marketing-code-box">
						<span className="marketing-code-label">Промокод</span>
						<div className="marketing-code-value-wrap">
							<strong className="marketing-code-value">{promo.promoCode}</strong>
							<button
								type="button"
								className="marketing-copy-btn"
								onClick={handleCopyPromoCode}
								title="Скопировать промокод"
								aria-label="Скопировать промокод"
								data-testid="btn-copy-promo"
							>
								{isCopied ? (
									<Check size={14} className="text-teal" />
								) : (
									<Copy size={14} />
								)}
							</button>
						</div>
					</div>

					<button
						type="button"
						className="secondary-button marketing-toggle-status-btn"
						onClick={() => onTogglePromoStatus(promo.id)}
						data-testid="btn-toggle-promo-status"
					>
						{promo.status === "active" ? "Приостановить" : "Активировать"}
					</button>
				</div>
			</div>

			{/* Conditions Strip */}
			<div className="marketing-conditions-strip">
				<Info size={14} className="marketing-conditions-icon" aria-hidden="true" />
				<div className="marketing-conditions-list">
					{promo.conditions.map((cond, idx) => (
						<span key={cond} className="marketing-condition-item">
							• {cond}
							{idx < promo.conditions.length - 1 ? "  " : ""}
						</span>
					))}
				</div>
			</div>

			{/* 2. Section: Analytics KPIs Grid */}
			<div className="marketing-section" data-testid="marketing-analytics-section">
				<div className="marketing-section-header">
					<div className="flex items-center gap-1.5">
						<TrendingUp size={16} className="text-teal" aria-hidden="true" />
						<h4 className="marketing-section-title">Аналитика эффективности и окупаемость</h4>
					</div>
					<span className="marketing-section-badge">Автоматический учет по промокоду</span>
				</div>

				<div className="marketing-kpi-grid">
					{/* KPI 1: Охват */}
					<div className="marketing-kpi-card">
						<div className="marketing-kpi-card__top">
							<Users size={16} className="text-teal" aria-hidden="true" />
							<span className="marketing-kpi-label">Охват рассылки</span>
						</div>
						<div className="marketing-kpi-value">{promo.stats.reach} чел.</div>
						<div className="marketing-kpi-sub">
							Доставлено {promo.stats.delivered} ({promo.stats.deliveredPercent}%)
						</div>
					</div>

					{/* KPI 2: Конверсия */}
					<div className="marketing-kpi-card">
						<div className="marketing-kpi-card__top">
							<Target size={16} className="text-teal" aria-hidden="true" />
							<span className="marketing-kpi-label">Конверсия в визиты</span>
						</div>
						<div className="marketing-kpi-value text-teal">
							{promo.stats.conversionPercent}%
						</div>
						<div className="marketing-kpi-sub">{promo.stats.visits} пациентов записались</div>
					</div>

					{/* KPI 3: Выручка */}
					<div className="marketing-kpi-card">
						<div className="marketing-kpi-card__top">
							<DollarSign size={16} className="text-teal" aria-hidden="true" />
							<span className="marketing-kpi-label">Выручка по промокоду</span>
						</div>
						<div className="marketing-kpi-value">
							{promo.stats.revenueRub.toLocaleString("ru-RU")} ₽
						</div>
						<div className="marketing-kpi-sub">
							Ср. чек:{" "}
							{(promo.stats.visits > 0
								? promo.stats.revenueRub / promo.stats.visits
								: 0
							).toLocaleString("ru-RU", { maximumFractionDigits: 0 })}{" "}
							₽
						</div>
					</div>

					{/* KPI 4: ROMI */}
					<div className="marketing-kpi-card">
						<div className="marketing-kpi-card__top">
							<Sparkles size={16} className="text-teal" aria-hidden="true" />
							<span className="marketing-kpi-label">Окупаемость (ROMI)</span>
						</div>
						<div className="marketing-kpi-value text-teal-dark font-extrabold">
							+{promo.stats.romiPercent}%
						</div>
						<div className="marketing-kpi-sub">
							Затраты: {promo.stats.budgetSpentRub.toLocaleString("ru-RU")} ₽
						</div>
					</div>
				</div>

				{/* Visual Funnel Bar */}
				<div className="marketing-funnel-bar">
					<div className="marketing-funnel-step">
						<span className="marketing-funnel-num">{promo.stats.reach}</span>
						<span className="marketing-funnel-name">Отправлено</span>
					</div>
					<div className="marketing-funnel-arrow">→</div>
					<div className="marketing-funnel-step">
						<span className="marketing-funnel-num">{promo.stats.delivered}</span>
						<span className="marketing-funnel-name">Доставлено ({promo.stats.deliveredPercent}%)</span>
					</div>
					<div className="marketing-funnel-arrow">→</div>
					<div className="marketing-funnel-step">
						<span className="marketing-funnel-num text-teal">{promo.stats.visits}</span>
						<span className="marketing-funnel-name">Визиты ({promo.stats.conversionPercent}%)</span>
					</div>
					<div className="marketing-funnel-arrow">→</div>
					<div className="marketing-funnel-step">
						<span className="marketing-funnel-num font-bold">
							{(promo.stats.revenueRub / 1000).toFixed(0)}k ₽
						</span>
						<span className="marketing-funnel-name">Оплачено в кассу</span>
					</div>
				</div>
			</div>

			{/* 3. Section: Message Preview Simulator */}
			<div className="marketing-section" data-testid="marketing-preview-section">
				<div className="marketing-section-header">
					<div className="flex items-center gap-1.5">
						<MessageSquare size={16} className="text-teal" aria-hidden="true" />
						<h4 className="marketing-section-title">Превью шаблона сообщения</h4>
					</div>

					{/* Channel Switcher */}
					<div className="marketing-channel-tabs" role="tablist">
						<button
							type="button"
							role="tab"
							aria-selected={selectedChannel === "sms"}
							className={`marketing-channel-btn ${selectedChannel === "sms" ? "marketing-channel-btn--active" : ""}`}
							onClick={() => setSelectedChannel("sms")}
							data-testid="channel-sms-btn"
						>
							SMS
						</button>
						<button
							type="button"
							role="tab"
							aria-selected={selectedChannel === "whatsapp"}
							className={`marketing-channel-btn ${selectedChannel === "whatsapp" ? "marketing-channel-btn--active" : ""}`}
							onClick={() => setSelectedChannel("whatsapp")}
							data-testid="channel-whatsapp-btn"
						>
							WhatsApp
						</button>
						<button
							type="button"
							role="tab"
							aria-selected={selectedChannel === "telegram"}
							className={`marketing-channel-btn ${selectedChannel === "telegram" ? "marketing-channel-btn--active" : ""}`}
							onClick={() => setSelectedChannel("telegram")}
							data-testid="channel-telegram-btn"
						>
							Telegram
						</button>
					</div>
				</div>

				{/* Realistic Chat Simulator Box */}
				<div className={`marketing-chat-simulator marketing-chat-simulator--${selectedChannel}`}>
					<div className="marketing-chat-bubble">
						<div className="marketing-chat-sender">
							<span className="marketing-chat-sender-name">
								{clinicName || "Стоматология ДЕНТЕ Премиум"}
							</span>
							<CheckCircle2 size={12} className="text-teal inline" aria-label="Верифицировано" />
							<span className="marketing-chat-time">10:30</span>
						</div>

						<div className="marketing-chat-body">
							<p className="marketing-chat-compiled-text">{getCompiledPreview()}</p>
						</div>

						<div className="marketing-chat-channel-meta">
							<Info size={11} aria-hidden="true" />
							<span>{channelRates[selectedChannel].label}</span>
						</div>
					</div>
				</div>

				{/* Available Template Variables */}
				<div className="marketing-vars-strip">
					<span className="marketing-vars-label">Переменные подстановки:</span>
					<div className="marketing-vars-chips">
						<span className="marketing-var-chip" title="Имя пациента">{`{Имя}`}</span>
						<span className="marketing-var-chip" title="Название клиники">{`{Клиника}`}</span>
						<span className="marketing-var-chip" title="Размер скидки или выгода">{`{Скидка}`}</span>
						<span className="marketing-var-chip" title="Код купона">{`{Промокод}`}</span>
						<span className="marketing-var-chip" title="Дата окончания">{`{Срок}`}</span>
						<span className="marketing-var-chip" title="Короткая ссылка">{`{Ссылка}`}</span>
					</div>
				</div>
			</div>

			{/* 4. Section: Audience Segmentation & 1-Click Launch */}
			<div className="marketing-section" data-testid="marketing-launch-section">
				<div className="marketing-section-header">
					<div className="flex items-center gap-1.5">
						<Send size={16} className="text-teal" aria-hidden="true" />
						<h4 className="marketing-section-title">Быстрый запуск сегменту пациентов</h4>
					</div>
					<span className="marketing-section-badge">1-клик рассылка</span>
				</div>

				{/* Segment Selector Chips */}
				<div className="marketing-segments-grid">
					{DEFAULT_PATIENT_SEGMENTS.map((segment) => {
						const isSelected = segment.id === selectedSegmentId;
						return (
							<button
								key={segment.id}
								type="button"
								className={`marketing-segment-card ${isSelected ? "marketing-segment-card--selected" : ""}`}
								onClick={() => setSelectedSegmentId(segment.id)}
								data-testid={`segment-${segment.id}`}
							>
								<div className="marketing-segment-card__top">
									<strong className="marketing-segment-name">{segment.name}</strong>
									<span className="marketing-segment-count">{segment.count} чел.</span>
								</div>
								<p className="marketing-segment-desc">{segment.description}</p>
							</button>
						);
					})}
				</div>

				{/* Compliance Guard & Budget Strip */}
				<div className="marketing-launch-controls">
					<label className="marketing-compliance-checkbox">
						<input
							type="checkbox"
							checked={consentOnly}
							onChange={(e) => setConsentOnly(e.target.checked)}
							className="marketing-checkbox-input"
						/>
						<ShieldCheck size={15} className="text-teal shrink-0" aria-hidden="true" />
						<span className="marketing-compliance-text">
							Только пациенты с подтвержденным согласием на уведомления (152-ФЗ и ст. 18 ФЗ «О рекламе»)
						</span>
					</label>

					<div className="marketing-budget-calc">
						<span className="marketing-budget-label">Расчетный бюджет:</span>
						<strong className="marketing-budget-value">{estimatedCostRub} ₽</strong>
						<span className="marketing-budget-sub">
							({activeSegment.count} получателей × {channelRates[selectedChannel].rateRub.toFixed(2)} ₽)
						</span>
					</div>
				</div>

				{/* Primary & Secondary Action Buttons */}
				<div className="marketing-launch-actions">
					<button
						type="button"
						className="primary-button marketing-launch-cta min-h-[44px] sm:min-h-[36px]"
						onClick={handleLaunchCampaign}
						disabled={isSending}
						data-testid="btn-launch-campaign"
					>
						<Send size={15} aria-hidden="true" />
						<span>
							{isSending
								? "Запуск рассылки…"
								: `Запустить рассылку сегменту (${activeSegment.count} получателей)`}
						</span>
					</button>

					<button
						type="button"
						className="secondary-button marketing-test-btn min-h-[44px] sm:min-h-[36px]"
						onClick={handleTestSend}
						disabled={testSent}
						data-testid="btn-test-send"
					>
						<MessageSquare size={14} aria-hidden="true" />
						<span>{testSent ? "Отправлено!" : "Тестовая отправка себе"}</span>
					</button>
				</div>
			</div>
		</div>
	);
};
