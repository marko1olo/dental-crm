/**
 * MarketingDashboardView.tsx — Comprehensive 2-Column Dental Marketing & Funnel Analytics Dashboard.
 *
 * Mandate 8c (Visual Quality & Design System Tokens)
 * Mandate 8d (Quiet Telemetry & 0 Carnival Colors)
 * Mandate 8e & 8n (Solo Doctor Autonomy & Zero Dead-Ends)
 *
 * STRUCTURE:
 * 1. Single-Row Quiet Header (Hick's Law) & Telemetry Status
 * 2. 4-Metric Key Performance Indicator (KPI) Strip
 * 3. Two-Column Balanced Grid:
 *    - Left Column: Acquisition Channels & End-to-End Conversion Funnel
 *    - Right Column: Ad ROI (ROMI & CAC) & Segmented Patient Base
 */

import React, { lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
	BarChart3,
	CheckCircle2,
	ChevronRight,
	Download,
	Flame,
	Globe,
	Megaphone,
	Plus,
	Sliders,
	TrendingUp,
	Users,
} from "lucide-react";
import { showToast } from "../components/GlobalToast";
import { denteAdminSecretRequestHeaders } from "../lib/denteRequestHeaders";
import { useLeadsStore } from "../store/leadsStore";
import {
	type ChannelSpendMap,
	FUNNEL_PERIOD_OPTIONS,
	type FunnelTimePeriod,
	calculateFunnelAnalysis,
	exportFunnelReportCsv,
	getDefaultChannelSpendMap,
	normalizeMarketingChannel,
} from "../components/leads/leadsFunnelEngine";
import { DEFAULT_PATIENT_SEGMENTS } from "../components/marketing/marketingPresets";
import { MarketingNewPromoModal } from "../components/marketing/MarketingNewPromoModal";
import "./MarketingDashboardView.css";

const LeadsFunnelAnalyticsModal = lazy(() =>
	import("../components/leads/LeadsFunnelAnalyticsModal").then((module) => ({
		default: module.LeadsFunnelAnalyticsModal,
	})),
);

const CrmLeakDetectorModal = lazy(() =>
	import("../components/crm/CrmLeakDetectorModal").then((module) => ({
		default: module.CrmLeakDetectorModal,
	})),
);

export interface MarketingDashboardViewProps {
	readonly clinicName?: string;
	readonly onNavigateToRecalls?: () => void;
}

export function MarketingDashboardView({
	clinicName = "Стоматология ДЕНТЕ",
	onNavigateToRecalls,
}: MarketingDashboardViewProps) {
	const { leads, fetchLeads } = useLeadsStore();
	const [period, setPeriod] = useState<FunnelTimePeriod>("all");
	const [customSpends, setCustomSpends] = useState<ChannelSpendMap>(() =>
		getDefaultChannelSpendMap(),
	);
	const [attributionSummary, setAttributionSummary] = useState<{
		onlineSharePercent: number;
		adminSharePercent: number;
	} | null>(null);

	// Modals
	const [isFullAnalyticsOpen, setIsFullAnalyticsOpen] = useState(false);
	const [isLeakDetectorOpen, setIsLeakDetectorOpen] = useState(false);
	const [isNewPromoModalOpen, setIsNewPromoModalOpen] = useState(false);

	// Fetch live attribution spend from backend
	useEffect(() => {
		fetchLeads();
	}, [fetchLeads]);

	useEffect(() => {
		let cancelled = false;
		async function fetchLiveSpends() {
			try {
				const res = await fetch("/api/marketing/attribution", {
					headers: denteAdminSecretRequestHeaders(),
				});
				if (!res.ok) return;
				const data = await res.json();
				if (cancelled || !data) return;

				if (data.summary && typeof data.summary.onlineSharePercent === "number") {
					setAttributionSummary({
						onlineSharePercent: data.summary.onlineSharePercent,
						adminSharePercent:
							typeof data.summary.adminSharePercent === "number"
								? data.summary.adminSharePercent
								: Math.max(0, 100 - data.summary.onlineSharePercent),
					});
				}

				const liveSpends: Partial<ChannelSpendMap> = {};
				if (Array.isArray(data.selfBookingChannels)) {
					for (const ch of data.selfBookingChannels) {
						const rub = Math.round((ch.spentKopecks || 0) / 100);
						if (ch.key === "gis_2") liveSpends.gis_2 = rub;
						else if (ch.key === "prodoctorov") liveSpends.prodoctorov = rub;
						else if (ch.key === "website_widget") liveSpends.site_seo = rub;
						else if (ch.key === "tg_bot" || ch.key === "wa_bot") {
							liveSpends.social_media = (liveSpends.social_media || 0) + rub;
						}
					}
				}
				if (data.telephonyAdminFunnel) {
					liveSpends.other = Math.round(
						(data.telephonyAdminFunnel.spentKopecks || 0) / 100,
					);
				}

				if (!cancelled && Object.keys(liveSpends).length > 0) {
					setCustomSpends((prev) => ({
						...prev,
						...liveSpends,
					}));
				}
			} catch {
				// Silently fall back to standard presets
			}
		}

		fetchLiveSpends();
		return () => {
			cancelled = true;
		};
	}, []);

	// Funnel and ROI metrics computation via engine
	const analysis = useMemo(() => {
		return calculateFunnelAnalysis(leads, period, customSpends);
	}, [leads, period, customSpends]);

	// Dynamic Intake Split: backend attribution summary or computed from leads
	const intakeSplit = useMemo(() => {
		if (attributionSummary) {
			return {
				onlinePercent: attributionSummary.onlineSharePercent,
				adminPercent: attributionSummary.adminSharePercent,
			};
		}
		if (leads.length === 0) {
			return { onlinePercent: 0, adminPercent: 0 };
		}
		const onlineLeads = leads.filter((l) => {
			const ch = normalizeMarketingChannel(l.source);
			return (
				ch === "site_seo" ||
				ch === "gis_2" ||
				ch === "prodoctorov" ||
				ch === "napopravku" ||
				ch === "social_media"
			);
		}).length;
		const onlinePercent = Math.round((onlineLeads / leads.length) * 100);
		return {
			onlinePercent,
			adminPercent: Math.max(0, 100 - onlinePercent),
		};
	}, [attributionSummary, leads]);

	const { summary, channels, stages } = analysis;

	// Export CSV action
	const handleExportCsv = () => {
		try {
			const csvData = exportFunnelReportCsv(analysis);
			const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.setAttribute(
				"download",
				`Marketing_Funnel_Report_${period}_${new Date().toISOString().slice(0, 10)}.csv`,
			);
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);
			showToast("Отчет по маркетингу экспортирован в CSV", "success");
		} catch {
			showToast("Не удалось экспортировать отчет", "error");
		}
	};

	// Best performing channel by ROMI
	const topChannel = useMemo(() => {
		const profitable = channels
			.filter((c) => c.spendRub > 0 && c.revenueRub > 0)
			.sort((a, b) => b.romiPercent - a.romiPercent);
		return profitable[0] ?? channels[0];
	}, [channels]);

	return (
		<section
			className="marketing-dashboard-page"
			data-testid="marketing-dashboard-page"
			aria-label="Маркетинговая аналитика и воронка"
		>
			{/* ── 1. QUIET HEADER (1 ROW, HICK'S LAW) ─────────────────────────── */}
			<header className="marketing-dashboard-header">
				<div className="marketing-dashboard-title-wrap">
					<Megaphone size={20} className="text-[var(--teal)]" aria-hidden="true" />
					<h1 className="marketing-dashboard-title">
						Маркетинговая аналитика и воронка
					</h1>
					<div
						className="marketing-quiet-telemetry"
						title="Сквозной учет конверсий и расходов активен"
					>
						<span className="marketing-telemetry-dot" />
						<span>Телеметрия активна</span>
					</div>
				</div>

				<div className="marketing-dashboard-controls">
					{/* Period Selector (Segmented Control) */}
					<div
						className="marketing-period-segmented dente-segmented-bar"
						role="tablist"
						aria-label="Выбор периода аналитики"
					>
						{FUNNEL_PERIOD_OPTIONS.map((opt) => (
							<button
								key={opt.id}
								type="button"
								role="tab"
								aria-selected={period === opt.id}
								className={`marketing-period-btn dente-segmented-item ${period === opt.id ? "is-active active" : ""}`}
								onClick={() => setPeriod(opt.id)}
								data-testid={`period-filter-${opt.id}`}
							>
								{opt.label}
							</button>
						))}
					</div>

					<button
						type="button"
						className="secondary-button marketing-header-csv-btn h-8 min-h-[32px] px-3 rounded-lg text-[13px] font-medium inline-flex items-center gap-1.5 cursor-pointer"
						onClick={handleExportCsv}
						data-testid="marketing-export-csv-btn"
						title="Экспортировать сводку в Excel (CSV)"
					>
						<Download size={13} />
						<span>CSV</span>
					</button>

					<button
						type="button"
						className="primary-button marketing-header-promo-btn h-8 min-h-[32px] px-3.5 rounded-lg text-[13px] font-semibold inline-flex items-center gap-1.5 cursor-pointer"
						onClick={() => setIsNewPromoModalOpen(true)}
						data-testid="marketing-create-promo-btn"
					>
						<Plus size={14} />
						<span>Новая акция</span>
					</button>
				</div>
			</header>

			{/* ── 2. TOP METRIC STRIP (4 BALANCED KPI CARDS) ─────────────────── */}
			<div className="marketing-dashboard-kpis">
				{/* KPI 1: Ad Spend */}
				<div className="marketing-kpi-card" data-testid="kpi-ad-spend">
					<div className="marketing-kpi-top">
						<span className="marketing-kpi-label">Рекламный бюджет</span>
						<Sliders size={16} className="marketing-kpi-icon" />
					</div>
					<div className="marketing-kpi-value">
						{(summary.totalMarketingSpendRub || 0).toLocaleString("ru-RU")} ₽
					</div>
					<div className="marketing-kpi-sub">
						<span>CPL: </span>
						<strong>{(summary.cplRub || 0).toLocaleString("ru-RU")} ₽ / лид</strong>
					</div>
				</div>

				{/* KPI 2: Total Leads */}
				<div className="marketing-kpi-card" data-testid="kpi-total-leads">
					<div className="marketing-kpi-top">
						<span className="marketing-kpi-label">Обращения / Лиды</span>
						<Users size={16} className="marketing-kpi-icon" />
					</div>
					<div className="marketing-kpi-value">{summary.totalLeads}</div>
					<div className="marketing-kpi-sub">
						<span>Квалифицировано: </span>
						<strong>
							{summary.contactedLeads} ({summary.totalLeads > 0 ? Math.round((summary.contactedLeads / summary.totalLeads) * 100) : 0}%)
						</strong>
					</div>
				</div>

				{/* KPI 3: Show-ups (Visits) */}
				<div className="marketing-kpi-card" data-testid="kpi-show-ups">
					<div className="marketing-kpi-top">
						<span className="marketing-kpi-label">Дошли до клиники</span>
						<CheckCircle2 size={16} className="marketing-kpi-icon" />
					</div>
					<div className="marketing-kpi-value">{summary.showUpLeads}</div>
					<div className="marketing-kpi-sub">
						<span className="marketing-kpi-tag-good">
							CR {summary.showUpRatePercent}% в первичный визит
						</span>
					</div>
				</div>

				{/* KPI 4: ROMI & Revenue */}
				<div className="marketing-kpi-card" data-testid="kpi-romi-revenue">
					<div className="marketing-kpi-top">
						<span className="marketing-kpi-label">Окупаемость ROMI</span>
						<TrendingUp size={16} className="marketing-kpi-icon" />
					</div>
					<div className="marketing-kpi-value">
						{summary.romiPercent > 0 ? `+${summary.romiPercent}%` : `${summary.romiPercent}%`}
					</div>
					<div className="marketing-kpi-sub">
						<span>Выручка: </span>
						<strong>{(summary.totalRevenueRub || 0).toLocaleString("ru-RU")} ₽</strong>
					</div>
				</div>
			</div>

			{/* ── 3. TWO-COLUMN BALANCED DASHBOARD GRID ───────────────────────── */}
			<div className="marketing-dashboard-grid">
				{/* ════════════════════════════════════════════════════════════════ */}
				{/* ЛЕВАЯ КОЛОНКА: Каналы привлечения и Конверсионная воронка        */}
				{/* ════════════════════════════════════════════════════════════════ */}
				<div className="marketing-col">
					{/* СЕКЦИЯ 1: КАНАЛЫ ПРИВЛЕЧЕНИЯ (ACQUISITION CHANNELS) */}
					<div className="marketing-section-card" data-testid="marketing-channels-section">
						<div className="marketing-section-card-header">
							<h2 className="marketing-section-title">
								<Globe size={16} className="text-[var(--teal)]" />
								<span>Каналы привлечения пациентов</span>
							</h2>
							<span className="marketing-section-badge">
								{channels.length} активных источников
							</span>
						</div>

						<div className="marketing-channels-list">
							{channels.map((ch) => {
								const maxLeads = Math.max(...channels.map((c) => c.leadsCount), 1);
								const barPercent = Math.round((ch.leadsCount / maxLeads) * 100);

								return (
									<div
										key={ch.channelKey}
										className="marketing-channel-row"
										data-testid={`channel-row-${ch.channelKey}`}
									>
										<div className="marketing-channel-left">
											<span
												className="marketing-channel-bullet"
												style={{ background: ch.color || "var(--teal)" }}
											/>
											<div style={{ minWidth: 0, flex: 1 }}>
												<div className="marketing-channel-name" title={ch.channelLabel}>
													{ch.channelLabel}
												</div>
												<div className="marketing-channel-bar-wrap">
													<div
														className="marketing-channel-bar"
														style={{
															width: `${barPercent}%`,
															background: ch.color || "var(--teal)",
														}}
													/>
												</div>
											</div>
										</div>

										<div className="marketing-channel-stats">
											<div className="marketing-channel-metric">
												<span className="marketing-channel-metric-val">
													{ch.leadsCount} лид.
												</span>
												<span className="marketing-channel-metric-sub">
													{ch.showUpCount} виз. ({ch.showUpRatePercent}%)
												</span>
											</div>

											<div className="marketing-channel-metric" style={{ minWidth: 65 }}>
												<span className="marketing-channel-metric-val">
													{ch.spendRub > 0 ? `${ch.spendRub.toLocaleString("ru-RU")} ₽` : "0 ₽"}
												</span>
												<span className="marketing-channel-metric-sub">
													{ch.cacRub > 0 ? `CAC ${ch.cacRub.toLocaleString("ru-RU")} ₽` : "CPL 0 ₽"}
												</span>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					</div>

					{/* СЕКЦИЯ 2: КОНВЕРСИОННАЯ ВОРОНКА (CONVERSION FUNNEL STAGES) */}
					<div className="marketing-section-card" data-testid="marketing-funnel-section">
						<div className="marketing-section-card-header">
							<h2 className="marketing-section-title">
								<BarChart3 size={16} className="text-[var(--teal)]" />
								<span>Конверсионная воронка (CR)</span>
							</h2>
							<button
								type="button"
								className="marketing-modal-link"
								onClick={() => setIsFullAnalyticsOpen(true)}
								data-testid="open-funnel-modal-link"
							>
								Подробный аудит →
							</button>
						</div>

						<div className="marketing-funnel-steps">
							{stages.slice(0, 4).map((st, idx) => (
								<div key={st.key} className="marketing-funnel-step">
									<div className="marketing-funnel-step-left">
										<span className="marketing-funnel-num">{idx + 1}</span>
										<span className="marketing-funnel-step-name">{st.label}</span>
									</div>
									<div className="marketing-funnel-step-right">
										<span className="marketing-funnel-count">{st.count}</span>
										<span className="marketing-funnel-cr">
											{st.conversionFromFirstPercent}% от всех
										</span>
									</div>
								</div>
							))}
						</div>

						{/* Intake Split: Self-booking vs Telephony */}
						<div className="marketing-intake-split" data-testid="marketing-intake-split">
							<div className="marketing-intake-col">
								<Globe size={15} className="text-[var(--teal)]" />
								<span>Самозапись (виджет/карты): <strong>{intakeSplit.onlinePercent}%</strong></span>
							</div>
							<div className="marketing-intake-col">
								<Users size={15} className="text-[var(--muted)]" />
								<span>Ресепшен (АТС/звонки): <strong>{intakeSplit.adminPercent}%</strong></span>
							</div>
						</div>
					</div>
				</div>

				{/* ════════════════════════════════════════════════════════════════ */}
				{/* ПРАВАЯ КОЛОНКА: Окупаемость рекламы и Сегментированная база      */}
				{/* ════════════════════════════════════════════════════════════════ */}
				<div className="marketing-col">
					{/* СЕКЦИЯ 3: ОКУПАЕМОСТЬ РЕКЛАМЫ (AD ROI / ROMI) */}
					<div className="marketing-section-card" data-testid="marketing-roi-section">
						<div className="marketing-section-card-header">
							<h2 className="marketing-section-title">
								<TrendingUp size={16} className="text-[var(--teal)]" />
								<span>Окупаемость рекламы (ROMI)</span>
							</h2>
							<span className="marketing-section-badge">Unit-экономика</span>
						</div>

						<div className="marketing-romi-hero">
							<div className="marketing-romi-main">
								<span className="marketing-romi-val">
									{summary.romiPercent > 0 ? `+${summary.romiPercent}%` : `${summary.romiPercent}%`}
								</span>
								<span className="marketing-romi-label">
									Итоговая рентабельность инвестиций в маркетинг
								</span>
							</div>
							<div style={{ textAlign: "right" }}>
								<div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>
									{(summary.totalRevenueRub || 0).toLocaleString("ru-RU")} ₽
								</div>
								<div style={{ fontSize: 11, color: "var(--muted)" }}>
									Привлеченная выручка
								</div>
							</div>
						</div>

						<div className="marketing-romi-details">
							<div className="marketing-romi-detail-box">
								<span className="marketing-romi-detail-val">
									{summary.cacRub > 0 ? `${summary.cacRub.toLocaleString("ru-RU")} ₽` : "0 ₽"}
								</span>
								<span className="marketing-romi-detail-lbl">
									CAC (Стоимость привлечения пациента)
								</span>
							</div>

							<div className="marketing-romi-detail-box">
								<span className="marketing-romi-detail-val">
									{summary.cplRub > 0 ? `${summary.cplRub.toLocaleString("ru-RU")} ₽` : "0 ₽"}
								</span>
								<span className="marketing-romi-detail-lbl">
									CPL (Стоимость входящей заявки)
								</span>
							</div>
						</div>

						{topChannel && (
							<div className="marketing-best-channel-box">
								<Flame size={15} className="shrink-0" />
								<span className="truncate">
									Лидер по окупаемости: <strong>{topChannel.channelLabel}</strong> ({topChannel.romiPercent}% ROMI)
								</span>
							</div>
						)}
					</div>

					{/* СЕКЦИЯ 4: СЕГМЕНТИРОВАННАЯ ПАЦИЕНТСКАЯ БАЗА */}
					<div className="marketing-section-card" data-testid="marketing-segments-section">
						<div className="marketing-section-card-header">
							<h2 className="marketing-section-title">
								<Users size={16} className="text-[var(--teal)]" />
								<span>Сегментированная пациентская база</span>
							</h2>
							<button
								type="button"
								className="marketing-modal-link"
								onClick={() => setIsLeakDetectorOpen(true)}
								data-testid="open-leak-detector-btn"
							>
								Детектор оттока (210д) →
							</button>
						</div>

						<div className="marketing-cohorts-grid">
							{DEFAULT_PATIENT_SEGMENTS.map((seg) => (
								<div
									key={seg.id}
									className="marketing-cohort-card"
									data-testid={`segment-card-${seg.id}`}
								>
									<div className="marketing-cohort-top">
										<span className="marketing-cohort-name" title={seg.name}>
											{seg.name}
										</span>
										<span className="marketing-cohort-badge">
											{seg.count} пац.
										</span>
									</div>
									<p className="marketing-cohort-desc" title={seg.description}>
										{seg.description}
									</p>
									<button
										type="button"
										className="marketing-cohort-action"
										onClick={() => {
											if (onNavigateToRecalls) {
												onNavigateToRecalls();
											} else {
												showToast(`Сегмент «${seg.name}» выбран для триггерного сценария`, "info");
											}
										}}
									>
										<span>Запустить сценарий</span>
										<ChevronRight size={12} />
									</button>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>

			{/* ── 4. MODALS INTEGRATION ───────────────────────────────────────── */}
			{isFullAnalyticsOpen && (
				<Suspense fallback={null}>
					<LeadsFunnelAnalyticsModal
						isOpen={isFullAnalyticsOpen}
						onClose={() => setIsFullAnalyticsOpen(false)}
						leads={leads}
					/>
				</Suspense>
			)}

			{isLeakDetectorOpen && (
				<Suspense fallback={null}>
					<CrmLeakDetectorModal
						isOpen={isLeakDetectorOpen}
						onClose={() => setIsLeakDetectorOpen(false)}
					/>
				</Suspense>
			)}

			<MarketingNewPromoModal
				isOpen={isNewPromoModalOpen}
				onClose={() => setIsNewPromoModalOpen(false)}
				onSave={(newPromo) => {
					showToast(`Акция «${newPromo.title}» сохранена`, "success");
				}}
			/>
		</section>
	);
}

export default MarketingDashboardView;
