/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MARKETING ROI & CALL-TRACKING END-TO-END ANALYTICS MODAL
 * Touch-First (>= 44x44px), Multi-Theme DENTE Tokens (var(--paper), var(--teal))
 * 5-Stage Conversion Funnel: Clicks -> SIP Calls -> Bookings -> Visits -> Paid Plans
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useMemo, useState } from "react";
import {
	TrendingUp,
	BarChart3,
	Filter,
	Download,
	PhoneCall,
	CalendarCheck,
	UserCheck,
	Coins,
	Sparkles,
	X,
	Search,
	ArrowUpRight,
	CheckCircle2,
	Layers,
	Globe,
	RefreshCw,
	FileSpreadsheet,
	Copy,
	Check,
	CreditCard,
	Tag,
} from "lucide-react";
import {
	calculateMarketingChannelsPerformance,
	DEFAULT_DENTAL_MARKETING_CHANNELS,
	SAMPLE_PATIENT_ATTRIBUTIONS,
	type AdvertisingChannelPerformanceInput,
	type PatientAttributionRecord,
	type FunnelStage,
} from "@dental/shared";
import { showToast } from "../GlobalToast";
import "./marketingRoi.css";

export interface MarketingRoiModalProps {
	isOpen: boolean;
	onClose: () => void;
	clinicName?: string;
	customChannels?: AdvertisingChannelPerformanceInput[];
	customAttributions?: PatientAttributionRecord[];
}

type TabType = "funnel" | "channels" | "attributions";
type PeriodType = "current_month" | "prev_month" | "quarter_3" | "year_2026";

export const MarketingRoiModal: React.FC<MarketingRoiModalProps> = ({
	isOpen,
	onClose,
	clinicName = "ООО «Стоматологическая клиника ДЕНТЕ»",
	customChannels,
	customAttributions,
}) => {
	const [activeTab, setActiveTab] = useState<TabType>("funnel");
	const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>("current_month");
	const [categoryFilter, setCategoryFilter] = useState<string>("all");
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [copiedKey, setCopiedKey] = useState<string | null>(null);

	const channelsData = useMemo(() => {
		return customChannels ?? DEFAULT_DENTAL_MARKETING_CHANNELS;
	}, [customChannels]);

	const attributionsData = useMemo(() => {
		return customAttributions ?? SAMPLE_PATIENT_ATTRIBUTIONS;
	}, [customAttributions]);

	// Performance calculations
	const { channels, summary } = useMemo(() => {
		return calculateMarketingChannelsPerformance(channelsData);
	}, [channelsData]);

	// Filtered Channels for Table
	const filteredChannels = useMemo(() => {
		return channels.filter((ch) => {
			const matchCategory =
				categoryFilter === "all" || ch.categoryRu === categoryFilter;
			const matchQuery =
				searchQuery.trim() === "" ||
				ch.nameRu.toLowerCase().includes(searchQuery.toLowerCase()) ||
				(ch.notes && ch.notes.toLowerCase().includes(searchQuery.toLowerCase()));
			return matchCategory && matchQuery;
		});
	}, [channels, categoryFilter, searchQuery]);

	// Filtered Patient Attributions
	const filteredAttributions = useMemo(() => {
		return attributionsData.filter((attr) => {
			const matchQuery =
				searchQuery.trim() === "" ||
				attr.patientFullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
				attr.phone.includes(searchQuery) ||
				attr.channelNameRu.toLowerCase().includes(searchQuery.toLowerCase()) ||
				attr.utm.utm_campaign.toLowerCase().includes(searchQuery.toLowerCase()) ||
				(attr.externalIds.calltouchId &&
					attr.externalIds.calltouchId.includes(searchQuery)) ||
				(attr.externalIds.roistatId &&
					attr.externalIds.roistatId.includes(searchQuery));
			return matchQuery;
		});
	}, [attributionsData, searchQuery]);

	// Unique Categories for Filter
	const uniqueCategories = useMemo(() => {
		const cats = new Set(channels.map((c) => c.categoryRu));
		return ["all", ...Array.from(cats)];
	}, [channels]);

	// Copy to clipboard helper
	const handleCopyUtm = (text: string, key: string) => {
		navigator.clipboard.writeText(text);
		setCopiedKey(key);
		showToast(`Скопировано в буфер: ${text}`, "info");
		setTimeout(() => setCopiedKey(null), 2000);
	};

	// CSV Export
	const handleExportCsv = () => {
		const headers = [
			"Канал рекламы",
			"Категория",
			"Затраты (₽)",
			"Клики",
			"Звонки",
			"Записи",
			"Явки",
			"Оплачено",
			"Выручка (₽)",
			"Прибыль (₽)",
			"CAC (₽)",
			"ROMI (%)",
		];

		const rows = channels.map((c) => [
			`"${c.nameRu}"`,
			`"${c.categoryRu}"`,
			Math.round(c.adSpendKopecks / 100),
			c.clicksCount,
			c.callsCount,
			c.bookedAppointmentsCount,
			c.attendedVisitsCount,
			c.paidPlansCount,
			Math.round(c.revenueKopecks / 100),
			Math.round(c.profitKopecks / 100),
			c.cacKopecks !== null ? Math.round(c.cacKopecks / 100) : "—",
			c.romiPercent !== null ? `${c.romiPercent}%` : "Органика",
		]);

		const csvContent =
			"\uFEFF" + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.setAttribute("href", url);
		link.setAttribute(
			"download",
			`Marketing_ROMI_Report_${new Date().toISOString().slice(0, 10)}.csv`,
		);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		showToast("Отчет по сквозной аналитике и ROMI выгружен в CSV", "success");
	};

	if (!isOpen) return null;

	return (
		<div
			className="marketing-roi-backdrop"
			role="dialog"
			aria-modal="true"
			aria-label="Сквозная аналитика и колл-трекинг"
			data-testid="marketing-roi-modal-container"
		>
			<div className="marketing-roi-modal">
				{/* 1. Header */}
				<header className="marketing-roi-header">
					<div className="marketing-roi-header-title-group">
						<div className="marketing-roi-header-icon">
							<TrendingUp className="w-6 h-6" />
						</div>
						<div>
							<h2 className="marketing-roi-title">
								<span>СКВОЗНАЯ АНАЛИТИКА & CALL-TRACKING</span>
								<span className="marketing-roi-badge">ROMI & CAC · DENTE V2.8</span>
							</h2>
							<p className="marketing-roi-subtitle">
								{clinicName} · Воронка конверсии от клика до оплаченного плана лечения
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="marketing-roi-close-btn"
						data-testid="close-marketing-roi-modal-btn"
						aria-label="Закрыть аналитику"
					>
						<X className="w-6 h-6" />
					</button>
				</header>

				{/* 2. Controls & Tabs Bar */}
				<div className="marketing-roi-controls">
					<div className="marketing-roi-tabs">
						<button
							type="button"
							onClick={() => setActiveTab("funnel")}
							className={`marketing-roi-tab-btn ${activeTab === "funnel" ? "active" : ""}`}
							data-testid="tab-marketing-funnel"
						>
							<BarChart3 size={16} />
							<span>1. Воронка конверсии</span>
						</button>
						<button
							type="button"
							onClick={() => setActiveTab("channels")}
							className={`marketing-roi-tab-btn ${activeTab === "channels" ? "active" : ""}`}
							data-testid="tab-marketing-channels"
						>
							<Layers size={16} />
							<span>2. Каналы & ROMI</span>
						</button>
						<button
							type="button"
							onClick={() => setActiveTab("attributions")}
							className={`marketing-roi-tab-btn ${activeTab === "attributions" ? "active" : ""}`}
							data-testid="tab-marketing-attributions"
						>
							<Globe size={16} />
							<span>3. UTM & Пациенты</span>
						</button>
					</div>

					<div className="flex items-center gap-2">
						<select
							value={selectedPeriod}
							onChange={(e) => setSelectedPeriod(e.target.value as PeriodType)}
							className="px-3 py-1.5 rounded-xl text-xs font-bold border border-[var(--line,rgba(204,251,241,0.15))] bg-[var(--paper-soft,#0f172a)] text-[var(--ink,#f8fafc)] outline-none min-h-[38px]"
							data-testid="marketing-period-select"
						>
							<option value="current_month">Август 2026 (Текущий)</option>
							<option value="prev_month">Июль 2026</option>
							<option value="quarter_3">3-й квартал 2026</option>
							<option value="year_2026">2026 год (С начала года)</option>
						</select>

						<button
							type="button"
							onClick={handleExportCsv}
							className="marketing-roi-action-btn"
							data-testid="export-marketing-csv-btn"
						>
							<FileSpreadsheet size={15} />
							<span className="hidden sm:inline">Экспорт CSV</span>
						</button>
					</div>
				</div>

				{/* 3. KPI Summary Strip (6 Metric Cards) */}
				<div className="marketing-roi-kpi-grid">
					{/* Card 1: Ad Spend */}
					<div className="marketing-roi-kpi-card" data-testid="kpi-ad-spend">
						<div className="marketing-roi-kpi-header">
							<span>Затраты на рекламу</span>
							<Coins className="w-4 h-4 text-emerald-500" />
						</div>
						<div className="marketing-roi-kpi-value">{summary.totalAdSpendFormatted}</div>
						<div className="marketing-roi-kpi-sub">
							Активных каналов: <b>{summary.activeChannelsCount}</b>
						</div>
					</div>

					{/* Card 2: Calls & CPL */}
					<div className="marketing-roi-kpi-card" data-testid="kpi-calls">
						<div className="marketing-roi-kpi-header">
							<span>Звонки / Лиды (SIP)</span>
							<PhoneCall className="w-4 h-4 text-sky-400" />
						</div>
						<div className="marketing-roi-kpi-value">{summary.totalCallsCount}</div>
						<div className="marketing-roi-kpi-sub">
							CPL: <b>{summary.overallCplFormatted}</b>
						</div>
					</div>

					{/* Card 3: Bookings & CPA */}
					<div className="marketing-roi-kpi-card" data-testid="kpi-bookings">
						<div className="marketing-roi-kpi-header">
							<span>Записи на приём</span>
							<CalendarCheck className="w-4 h-4 text-teal-400" />
						</div>
						<div className="marketing-roi-kpi-value">{summary.totalBookedAppointmentsCount}</div>
						<div className="marketing-roi-kpi-sub">
							CPA: <b>{summary.overallCpaFormatted}</b>
						</div>
					</div>

					{/* Card 4: Attended & Paid (CAC) */}
					<div className="marketing-roi-kpi-card" data-testid="kpi-paid-plans">
						<div className="marketing-roi-kpi-header">
							<span>Оплаченные планы</span>
							<UserCheck className="w-4 h-4 text-indigo-400" />
						</div>
						<div className="marketing-roi-kpi-value">{summary.totalPaidPlansCount}</div>
						<div className="marketing-roi-kpi-sub">
							CAC: <b>{summary.overallCacFormatted}</b>
						</div>
					</div>

					{/* Card 5: Total Revenue */}
					<div className="marketing-roi-kpi-card" data-testid="kpi-revenue">
						<div className="marketing-roi-kpi-header">
							<span>Выручка с рекламы</span>
							<CreditCard className="w-4 h-4 text-emerald-400" />
						</div>
						<div className="marketing-roi-kpi-value">{summary.totalRevenueFormatted}</div>
						<div className="marketing-roi-kpi-sub">
							Ср. чек: <b>{summary.overallAverageCheckFormatted}</b>
						</div>
					</div>

					{/* Card 6: ROMI & Profit */}
					<div className="marketing-roi-kpi-card" data-testid="kpi-romi">
						<div className="marketing-roi-kpi-header">
							<span>Окупаемость ROMI</span>
							<TrendingUp className="w-4 h-4 text-amber-400" />
						</div>
						<div className="marketing-roi-kpi-value text-emerald-400">
							{summary.overallRomiFormatted}
						</div>
						<div className="marketing-roi-kpi-sub">
							Прибыль: <b>{summary.totalProfitFormatted}</b>
						</div>
					</div>
				</div>

				{/* 4. Body Content */}
				<div className="marketing-roi-body">
					{/* TAB 1: 5-Stage Funnel */}
					{activeTab === "funnel" && (
						<div className="marketing-roi-funnel-container" data-testid="funnel-view">
							<div className="flex items-center justify-between pb-2 border-b border-[var(--line,rgba(204,251,241,0.15))]">
								<div>
									<h3 className="text-sm font-bold text-[var(--ink,#f8fafc)] flex items-center gap-2">
										<Sparkles className="w-4 h-4 text-teal-400" />
										<span>Сквозная воронка привлечения пациентов (5 этапов)</span>
									</h3>
									<p className="text-xs text-[var(--muted,#94a3b8)]">
										Отслеживание потерь на каждом этапе воронки от первичного клика до оплаты услуг по Номенклатуре 804н
									</p>
								</div>
								<div className="text-xs font-mono text-[var(--teal,#14b8a6)] bg-[var(--paper-soft,#0f172a)] px-3 py-1 rounded-xl border border-[var(--line,rgba(204,251,241,0.15))]">
									Итоговая конверсия: <b>{summary.conversionRates.overallConversionRate}%</b>
								</div>
							</div>

							<div className="space-y-3">
								{summary.funnelStages.map((stageItem, idx) => {
									const fillPercent = Math.max(
										8,
										Math.min(100, stageItem.conversionFromFirst),
									);
									return (
										<div
											key={stageItem.stage}
											className="marketing-roi-funnel-card"
											data-testid={`funnel-stage-${stageItem.stage}`}
										>
											<div className="marketing-roi-funnel-header-row">
												<div className="marketing-roi-funnel-title">
													<span>{stageItem.stageLabelRu}</span>
												</div>
												<div className="marketing-roi-funnel-metrics">
													<div className="text-right">
														<span className="text-xs text-[var(--muted,#94a3b8)] mr-2">Количество:</span>
														<span className="marketing-roi-funnel-count">
															{stageItem.count.toLocaleString("ru-RU")}
														</span>
													</div>
													<div className="text-right">
														<span className="text-xs text-[var(--muted,#94a3b8)] mr-2">Конверсия этапа:</span>
														<span className="text-xs font-bold font-mono text-emerald-400">
															{stageItem.conversionFromPrevious}%
														</span>
													</div>
													<div className="text-right">
														<span className="text-xs text-[var(--muted,#94a3b8)] mr-2">Себестоимость:</span>
														<span className="text-xs font-bold font-mono text-[var(--ink,#f8fafc)]">
															{stageItem.unitCostFormatted}
														</span>
													</div>
												</div>
											</div>

											{/* Visual Progress Bar */}
											<div className="marketing-roi-funnel-bar-bg">
												<div
													className="marketing-roi-funnel-bar-fill"
													style={{ width: `${fillPercent}%` }}
												/>
											</div>

											<div className="marketing-roi-funnel-details">
												<span>
													Сквозная конверсия от первого касания: <b>{stageItem.conversionFromFirst}%</b>
												</span>
												{stageItem.dropOffCount > 0 && (
													<span className="text-rose-400 font-semibold">
														Потери этапа: -{stageItem.dropOffCount} пациентов ({stageItem.dropOffPercent}%)
													</span>
												)}
												{stageItem.dropOffCount === 0 && (
													<span className="text-emerald-400 font-semibold">
														Финальный шаг: оплаченный результат
													</span>
												)}
											</div>
										</div>
									);
								})}
							</div>
						</div>
					)}

					{/* TAB 2: Advertising Channels Table */}
					{activeTab === "channels" && (
						<div className="space-y-4" data-testid="channels-view">
							{/* Filter and Search Bar */}
							<div className="flex flex-wrap items-center justify-between gap-3">
								<div className="flex items-center gap-2 flex-wrap">
									<span className="text-xs font-semibold text-[var(--muted,#94a3b8)]">Категория:</span>
									<div className="flex items-center gap-1 flex-wrap">
										{uniqueCategories.map((cat) => (
											<button
												key={cat}
												type="button"
												onClick={() => setCategoryFilter(cat)}
												className={`px-2.5 py-1 text-xs rounded-lg border font-semibold transition-all ${
													categoryFilter === cat
														? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)]"
														: "bg-[var(--paper-soft,#0f172a)] text-[var(--muted,#94a3b8)] border-[var(--line,rgba(204,251,241,0.15))] hover:text-white"
												}`}
											>
												{cat === "all" ? "Все каналы" : cat}
											</button>
										))}
									</div>
								</div>

								<div className="relative min-w-[240px]">
									<Search className="w-4 h-4 absolute left-3 top-2.5 text-[var(--muted,#94a3b8)]" />
									<input
										type="text"
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
										placeholder="Поиск канала или заметки..."
										className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-[var(--paper-soft,#0f172a)] text-[var(--ink,#f8fafc)] border border-[var(--line,rgba(204,251,241,0.15))] outline-none focus:border-[var(--teal,#0d9488)]"
										data-testid="search-channels-input"
									/>
								</div>
							</div>

							{/* Table */}
							<div className="marketing-roi-table-container">
								<table className="marketing-roi-table">
									<thead>
										<tr>
											<th>Рекламный канал</th>
											<th>Категория</th>
											<th className="text-right">Затраты (₽)</th>
											<th className="text-center">Звонки</th>
											<th className="text-center">Записи</th>
											<th className="text-center">Оплачено</th>
											<th className="text-right">Выручка (₽)</th>
											<th className="text-right">CAC (₽)</th>
											<th className="text-right">Прибыль (₽)</th>
											<th className="text-center">ROMI (%)</th>
										</tr>
									</thead>
									<tbody>
										{filteredChannels.map((ch) => {
											let statusClass = "status-profitable";
											let statusLabel = "Окупается";
											if (ch.romiStatus === "super_profitable") {
												statusClass = "status-super-profitable";
												statusLabel = "Супер-ROMI";
											} else if (ch.romiStatus === "loss") {
												statusClass = "status-loss";
												statusLabel = "Убыток";
											} else if (ch.romiStatus === "organic") {
												statusClass = "status-organic";
												statusLabel = "Органика";
											} else if (ch.romiStatus === "break_even") {
												statusClass = "status-break-even";
												statusLabel = "В ноль";
											}

											return (
												<tr key={ch.id} data-testid={`channel-row-${ch.channelKey}`}>
													<td>
														<div className="font-bold text-[var(--ink,#f8fafc)]">{ch.nameRu}</div>
														{ch.notes && (
															<div className="text-[11px] text-[var(--muted,#94a3b8)]">
																{ch.notes}
															</div>
														)}
													</td>
													<td>
														<span className="marketing-roi-chip">{ch.categoryRu}</span>
													</td>
													<td className="text-right font-mono font-bold">
														{ch.adSpendFormatted}
													</td>
													<td className="text-center font-mono">
														{ch.callsCount}
														<div className="text-[10px] text-[var(--muted,#94a3b8)]">
															CPL: {ch.cplFormatted}
														</div>
													</td>
													<td className="text-center font-mono">
														{ch.bookedAppointmentsCount}
														<div className="text-[10px] text-[var(--muted,#94a3b8)]">
															CPA: {ch.cpaFormatted}
														</div>
													</td>
													<td className="text-center font-mono font-bold text-teal-400">
														{ch.paidPlansCount}
													</td>
													<td className="text-right font-mono font-bold">
														{ch.revenueFormatted}
													</td>
													<td className="text-right font-mono text-emerald-400 font-bold">
														{ch.cacFormatted}
													</td>
													<td className="text-right font-mono font-bold">
														<span
															className={
																ch.profitKopecks >= 0 ? "text-emerald-400" : "text-rose-400"
															}
														>
															{ch.profitFormatted}
														</span>
													</td>
													<td className="text-center">
														<span className={`marketing-roi-status-badge ${statusClass}`}>
															{ch.romiFormatted}
														</span>
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						</div>
					)}

					{/* TAB 3: Patient UTM Attribution */}
					{activeTab === "attributions" && (
						<div className="space-y-4" data-testid="attributions-view">
							<div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-[var(--line,rgba(204,251,241,0.15))]">
								<div>
									<h3 className="text-sm font-bold text-[var(--ink,#f8fafc)] flex items-center gap-2">
										<Tag className="w-4 h-4 text-teal-400" />
										<span>Привязка UTM-меток и Calltouch/Roistat ID к первичным пациентам</span>
									</h3>
									<p className="text-xs text-[var(--muted,#94a3b8)]">
										Сквозная связка звонка из SIP-телефонии, рекламного источника и оплаченного плана лечения
									</p>
								</div>

								<div className="relative min-w-[260px]">
									<Search className="w-4 h-4 absolute left-3 top-2.5 text-[var(--muted,#94a3b8)]" />
									<input
										type="text"
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
										placeholder="Поиск по ФИО, телефону, UTM или ID..."
										className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-[var(--paper-soft,#0f172a)] text-[var(--ink,#f8fafc)] border border-[var(--line,rgba(204,251,241,0.15))] outline-none focus:border-[var(--teal,#0d9488)]"
										data-testid="search-attributions-input"
									/>
								</div>
							</div>

							<div className="marketing-roi-patient-cards">
								{filteredAttributions.map((attr) => (
									<div
										key={attr.id}
										className="marketing-roi-patient-card"
										data-testid={`attribution-card-${attr.patientId}`}
									>
										<div className="marketing-roi-patient-top">
											<div className="marketing-roi-patient-name">
												<span>{attr.patientFullName}</span>
												<span className="text-xs font-mono text-[var(--muted,#94a3b8)]">
													{attr.phone}
												</span>
												<span className="marketing-roi-chip highlight">{attr.channelNameRu}</span>
											</div>

											<div className="flex items-center gap-2">
												<span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/30 border border-emerald-800/40 px-2.5 py-1 rounded-lg">
													Оплачено: {(attr.totalPaidKopecks / 100).toLocaleString("ru-RU")} ₽
												</span>
												<span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-900/40 text-teal-300 border border-teal-700/50">
													{attr.currentStage === "paid_plan"
														? "Оплачен план"
														: attr.currentStage === "attended"
															? "Был на приеме"
															: "Записан"}
												</span>
											</div>
										</div>

										{/* UTM Parameters & External IDs Strip */}
										<div className="flex flex-wrap items-center gap-1.5 text-xs">
											{attr.utm.utm_source && (
												<span
													onClick={() =>
														handleCopyUtm(attr.utm.utm_source, `${attr.id}-src`)
													}
													className="marketing-roi-chip cursor-pointer hover:border-teal-400"
													title="Кликните для копирования"
												>
													utm_source: <b>{attr.utm.utm_source}</b>
												</span>
											)}
											{attr.utm.utm_campaign && (
												<span
													onClick={() =>
														handleCopyUtm(attr.utm.utm_campaign, `${attr.id}-cmp`)
													}
													className="marketing-roi-chip cursor-pointer hover:border-teal-400"
													title="Кликните для копирования"
												>
													campaign: <b>{attr.utm.utm_campaign}</b>
												</span>
											)}
											{attr.utm.utm_term && (
												<span className="marketing-roi-chip">
													term: <i>{attr.utm.utm_term}</i>
												</span>
											)}
											{attr.externalIds.calltouchId && (
												<span className="marketing-roi-chip highlight">
													Calltouch ID: <b>{attr.externalIds.calltouchId}</b>
												</span>
											)}
											{attr.externalIds.roistatId && (
												<span className="marketing-roi-chip highlight">
													Roistat ID: <b>{attr.externalIds.roistatId}</b>
												</span>
											)}
											{attr.sipCallDurationSeconds && attr.sipCallDurationSeconds > 0 ? (
												<span className="marketing-roi-chip">
													📞 SIP Запись ({attr.sipCallDurationSeconds} сек, {attr.sipProvider})
												</span>
											) : null}
										</div>

										{/* Doctor & Plan Information */}
										<div className="flex items-center justify-between text-xs text-[var(--muted,#94a3b8)] pt-2 border-t border-[var(--line,rgba(204,251,241,0.08))] flex-wrap gap-2">
											<div>
												Врач: <b className="text-[var(--ink,#f8fafc)]">{attr.doctorName || "—"}</b>{" "}
												({attr.specialtyRu || "Терапевт"}) · План:{" "}
												<span className="text-teal-300 font-semibold">
													{attr.treatmentPlanTitle || "Первичная консультация"}
												</span>
											</div>
											{attr.notes && (
												<div className="text-[11px] italic text-[var(--muted,#94a3b8)]">
													«{attr.notes}»
												</div>
											)}
										</div>
									</div>
								))}
							</div>
						</div>
					)}
				</div>

				{/* 5. Footer */}
				<footer className="marketing-roi-footer">
					<div className="text-xs text-[var(--muted,#94a3b8)] flex items-center gap-2">
						<CheckCircle2 className="w-4 h-4 text-teal-400" />
						<span>
							Все расчеты ведутся в целочисленных копейках (Kopecks) без float-погрешностей по 54-ФЗ и МКБ-10.
						</span>
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={onClose}
							className="marketing-roi-action-btn primary"
							data-testid="close-marketing-roi-btn"
						>
							<span>Закрыть аналитику</span>
						</button>
					</div>
				</footer>
			</div>
		</div>
	);
};
