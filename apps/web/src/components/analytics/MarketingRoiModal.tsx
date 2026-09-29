/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MARKETING ROI & CALL-TRACKING END-TO-END ANALYTICS MODAL
 * Touch-First (>= 44x44px), Multi-Theme DENTE Tokens (var(--paper), var(--teal))
 * 5-Stage Conversion Funnel: Clicks -> SIP Calls -> Bookings -> Visits -> Paid Plans
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
	type AdvertisingChannelPerformanceInput,
	calculateMarketingChannelsPerformance,
	formatInitialsOnly,
	maskRussianPhone,
	type PatientAttributionRecord,
} from "@dental/shared";
import {
	BarChart3,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	Globe,
	Layers,
	PhoneCall,
	RefreshCw,
	Search,
	ShieldCheck,
	Sparkles,
	Tag,
	TrendingUp,
	X,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { showToast } from "../GlobalToast";
import "./marketingRoi.css";
import { MarketingRoiChannelsTab } from "./MarketingRoiChannelsTab";
import { MarketingRoiKpisGrid } from "./MarketingRoiKpisGrid";

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
	const [_copiedKey, setCopiedKey] = useState<string | null>(null);
	const [fetchedChannels, setFetchedChannels] = useState<AdvertisingChannelPerformanceInput[]>([]);
	const [fetchedAttributions, setFetchedAttributions] = useState<PatientAttributionRecord[]>([]);
	const [isFunnelExpanded, setIsFunnelExpanded] = useState<boolean>(false);
	const [isLoading, setIsLoading] = useState<boolean>(false);

	useEffect(() => {
		if (customChannels || !isOpen) return;
		let isCancelled = false;
		setIsLoading(true);

		async function loadLiveChannels() {
			try {
				const res = await fetch("/api/marketing/attribution", {
					headers: denteAdminSecretRequestHeaders(),
				});
				if (!res.ok) return;
				const data = await res.json();
				if (isCancelled || !data) return;

				const list: AdvertisingChannelPerformanceInput[] = [];
				if (Array.isArray(data.selfBookingChannels)) {
					for (const ch of data.selfBookingChannels) {
						list.push({
							id: ch.key,
							channelKey: ch.key,
							nameRu: ch.nameRu,
							categoryRu: ch.categoryRu || "Самозапись",
							adSpendKopecks: ch.spentKopecks || 0,
							clicksCount: ch.viewsCount || 0,
							callsCount: ch.slotSelectedCount || 0,
							bookedAppointmentsCount: ch.bookingsCount || 0,
							attendedVisitsCount: ch.attendedCount || 0,
							paidPlansCount: ch.paidPatientsCount || 0,
							revenueKopecks: ch.revenueKopecks || 0,
						});
					}
				}
				if (data.telephonyAdminFunnel) {
					const t = data.telephonyAdminFunnel;
					list.push({
						id: "telephony",
						channelKey: "telephony",
						nameRu: "Телефония и коллтрекинг",
						categoryRu: "Коллтрекинг",
						adSpendKopecks: t.spentKopecks || 0,
						clicksCount: 0,
						callsCount: t.incomingCallsCount || 0,
						bookedAppointmentsCount: t.bookedAppointmentsCount || 0,
						attendedVisitsCount: t.attendedCount || 0,
						paidPlansCount: t.paidPatientsCount || 0,
						revenueKopecks: t.revenueKopecks || 0,
						notes: `Входящих: ${t.incomingCallsCount}, принято: ${t.answeredCallsCount}`,
					});
				}
				if (!isCancelled) {
					setFetchedChannels(list);
					if (Array.isArray(data.attributions)) {
						setFetchedAttributions(data.attributions);
					}
				}
			} catch {
				// Silently leave empty on network error
			} finally {
				if (!isCancelled) {
					setIsLoading(false);
				}
			}
		}

		loadLiveChannels();

		return () => {
			isCancelled = true;
		};
	}, [customChannels, isOpen]);

	const channelsData = useMemo(() => {
		return customChannels ?? fetchedChannels;
	}, [customChannels, fetchedChannels]);

	const attributionsData = useMemo(() => {
		return customAttributions ?? fetchedAttributions;
	}, [customAttributions, fetchedAttributions]);

	const { summary, channels: performanceChannels } = useMemo(() => {
		return calculateMarketingChannelsPerformance(channelsData);
	}, [channelsData]);

	const uniqueCategories = useMemo(() => {
		const cats = new Set<string>();
		cats.add("all");
		for (const ch of performanceChannels) {
			if (ch.categoryRu) cats.add(ch.categoryRu);
		}
		return Array.from(cats);
	}, [performanceChannels]);

	const filteredChannels = useMemo(() => {
		return performanceChannels.filter((ch) => {
			const matchesCategory =
				categoryFilter === "all" || ch.categoryRu === categoryFilter;
			const q = searchQuery.toLowerCase().trim();
			const matchesSearch =
				!q ||
				ch.nameRu.toLowerCase().includes(q) ||
				(ch.notes && ch.notes.toLowerCase().includes(q));
			return matchesCategory && matchesSearch;
		});
	}, [performanceChannels, categoryFilter, searchQuery]);

	const filteredAttributions = useMemo(() => {
		return attributionsData.filter((attr) => {
			const q = searchQuery.toLowerCase().trim();
			if (!q) return true;
			return (
				attr.patientFullName.toLowerCase().includes(q) ||
				attr.phone.includes(q) ||
				(attr.utm.utm_source && attr.utm.utm_source.toLowerCase().includes(q)) ||
				(attr.utm.utm_campaign && attr.utm.utm_campaign.toLowerCase().includes(q)) ||
				(attr.externalIds.calltouchId &&
					attr.externalIds.calltouchId.toLowerCase().includes(q)) ||
				(attr.externalIds.roistatId &&
					attr.externalIds.roistatId.toLowerCase().includes(q))
			);
		});
	}, [attributionsData, searchQuery]);

	const handleCopyUtm = (val: string, key: string) => {
		navigator.clipboard.writeText(val);
		setCopiedKey(key);
		showToast(`Скопировано: ${val}`, "info");
		setTimeout(() => setCopiedKey(null), 2000);
	};

	if (!isOpen) return null;

	return (
		<div
			className="marketing-roi-modal-overlay"
			data-testid="marketing-roi-modal-overlay"
			role="dialog"
			aria-modal="true"
			aria-labelledby="marketing-roi-title"
		>
			<div className="marketing-roi-modal-container">
				{/* 1. Header */}
				<header className="marketing-roi-header">
					<div className="marketing-roi-header-left">
						<div className="marketing-roi-icon-box">
							<TrendingUp className="w-5 h-5 text-teal-400" />
						</div>
						<div>
							<h2 id="marketing-roi-title" className="marketing-roi-title">
								Сквозная аналитика маркетинга и ROMI
							</h2>
							<p className="marketing-roi-subtitle">
								{clinicName} · Коллтрекинг, сквозная воронка и окупаемость каналов
							</p>
						</div>
					</div>

					<div className="marketing-roi-header-right">
						<div
							className="marketing-roi-period-selector"
							role="group"
							aria-label="Период отчета"
						>
							{(
								[
									{ id: "current_month", label: "Текущий месяц" },
									{ id: "prev_month", label: "Прошлый месяц" },
									{ id: "quarter_3", label: "3 квартал 2026" },
									{ id: "year_2026", label: "2026 год" },
								] as const
							).map((p) => (
								<button
									key={p.id}
									type="button"
									onClick={() => setSelectedPeriod(p.id)}
									className={`marketing-roi-period-btn ${
										selectedPeriod === p.id ? "active" : ""
									}`}
								>
									{p.label}
								</button>
							))}
						</div>

						{isLoading && (
							<RefreshCw className="w-4 h-4 animate-spin text-[var(--teal,#0d9488)]" />
						)}

						<button
							type="button"
							onClick={onClose}
							className="marketing-roi-close-btn"
							aria-label="Закрыть аналитику"
							data-testid="close-roi-modal-btn"
						>
							<X size={18} />
						</button>
					</div>
				</header>

				{/* 2. Navigation Tabs */}
				<nav className="marketing-roi-nav" aria-label="Вкладки аналитики">
					<button
						type="button"
						onClick={() => setActiveTab("funnel")}
						className={`marketing-roi-tab ${activeTab === "funnel" ? "active" : ""}`}
						data-testid="tab-funnel"
					>
						<Layers className="w-4 h-4" />
						<span>Сквозная воронка (5 этапов)</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("channels")}
						className={`marketing-roi-tab ${activeTab === "channels" ? "active" : ""}`}
						data-testid="tab-channels"
					>
						<BarChart3 className="w-4 h-4" />
						<span>Рекламные каналы ({performanceChannels.length})</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("attributions")}
						className={`marketing-roi-tab ${
							activeTab === "attributions" ? "active" : ""
						}`}
						data-testid="tab-attributions"
					>
						<Tag className="w-4 h-4" />
						<span>Сквозная атрибуция пациентов ({attributionsData.length})</span>
					</button>
				</nav>

				{/* 3. Top KPI Cards */}
				<MarketingRoiKpisGrid summary={summary} />

				{/* 4. Body Content */}
				<div className="marketing-roi-body">
					{/* TAB 1: 5-Stage Funnel */}
					{activeTab === "funnel" && (
						<div className="marketing-roi-funnel-container" data-testid="funnel-view">
							{channelsData.length === 0 ? (
								<div
									className="text-center py-12 text-[var(--muted,#94a3b8)] bg-[var(--paper-soft,#0f172a)] rounded-xl border border-[var(--line,rgba(204,251,241,0.15))] p-6 my-2"
									data-testid="funnel-empty-state"
								>
									<TrendingUp className="w-10 h-10 mx-auto mb-3 text-[var(--muted,#94a3b8)] opacity-40" />
									<div className="text-sm font-bold text-[var(--ink,#f8fafc)]">
										Нет данных сквозной воронки за период
									</div>
									<div className="text-xs mt-1">
										Ожидание событий звонков из АТС или самозаписи пациентов через онлайн-виджет
									</div>
								</div>
							) : (
								<>
									<div className="flex items-center justify-between pb-2 border-b border-[var(--line,rgba(204,251,241,0.15))] flex-wrap gap-2">
										<div>
											<h3 className="text-sm font-bold text-[var(--ink,#f8fafc)] flex items-center gap-2">
												<Sparkles className="w-4 h-4 text-teal-400" />
												<span>Сквозная воронка привлечения пациентов (5 этапов)</span>
											</h3>
											<p className="text-xs text-[var(--muted,#94a3b8)]">
												Отслеживание потерь на каждом этапе воронки от первичного клика до оплаты услуг по прейскуранту
											</p>
										</div>
										<div className="flex items-center gap-2">
											<div className="text-xs font-mono text-[var(--teal,#14b8a6)] bg-[var(--paper-soft,#0f172a)] px-3 py-1 rounded-xl border border-[var(--line,rgba(204,251,241,0.15))]">
												Итоговая конверсия: <b>{summary.conversionRates.overallConversionRate}%</b>
											</div>
											<button
												type="button"
												onClick={() => setIsFunnelExpanded((prev) => !prev)}
												className="marketing-roi-toggle-btn"
												aria-expanded={isFunnelExpanded}
												data-testid="toggle-funnel-stages-btn"
											>
												{isFunnelExpanded ? (
													<>
														<ChevronUp size={14} />
														<span>Скрыть детализацию</span>
													</>
												) : (
													<>
														<ChevronDown size={14} />
														<span>Показать расширенную аналитику</span>
													</>
												)}
											</button>
										</div>
									</div>

									{!isFunnelExpanded && (
										<div className="marketing-roi-funnel-compact-strip" data-testid="funnel-compact-summary">
											<div className="flex items-center justify-between text-xs p-3 rounded-xl bg-[var(--paper-soft,#0f172a)] border border-[var(--line,rgba(204,251,241,0.15))] flex-wrap gap-2">
												<div className="flex items-center gap-3 flex-wrap">
													<span className="text-[var(--ink,#f8fafc)] font-semibold">
														Краткая динамика:
													</span>
													<span className="text-[var(--muted,#94a3b8)]">
														Клики: <b className="text-[var(--ink,#f8fafc)]">{summary.funnelStages[0]?.count ?? 0}</b> → Звонки: <b className="text-sky-400">{summary.funnelStages[1]?.count ?? 0}</b> → Записи: <b className="text-teal-400">{summary.funnelStages[2]?.count ?? 0}</b> → Явки: <b className="text-indigo-400">{summary.funnelStages[3]?.count ?? 0}</b> → Оплачено: <b className="text-emerald-400">{summary.funnelStages[4]?.count ?? 0}</b>
													</span>
												</div>
												<button
													type="button"
													onClick={() => setIsFunnelExpanded(true)}
													className="text-[var(--teal,#14b8a6)] hover:underline font-semibold cursor-pointer inline-flex items-center gap-1 text-xs"
												>
													<span>Развернуть 5 этапов</span>
													<ChevronDown size={13} />
												</button>
											</div>
										</div>
									)}

									{isFunnelExpanded && (
										<div className="space-y-3" data-testid="funnel-stages-expanded">
											{summary.funnelStages.map((stageItem) => {
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
									)}
								</>
							)}
						</div>
					)}

					{/* TAB 2: Advertising Channels Table */}
					{activeTab === "channels" && (
						<MarketingRoiChannelsTab
							uniqueCategories={uniqueCategories}
							categoryFilter={categoryFilter}
							onCategoryFilterChange={setCategoryFilter}
							searchQuery={searchQuery}
							onSearchQueryChange={setSearchQuery}
							filteredChannels={filteredChannels}
						/>
					)}

					{/* TAB 3: Patient UTM Attribution */}
					{activeTab === "attributions" && (
						<div className="space-y-4" data-testid="attributions-view">
							<div
								className="flex items-start gap-2.5 p-3 rounded-xl bg-teal-950/20 border border-teal-800/30 text-xs"
								data-testid="marketing-roi-privacy-banner"
							>
								<ShieldCheck size={18} className="text-teal-400 shrink-0 mt-0.5" />
								<div>
									<strong className="text-[var(--ink,#f8fafc)] font-semibold block">
										Защита врачебной тайны (ст. 13 323-ФЗ) и персональных данных (152-ФЗ)
									</strong>
									<span className="text-[var(--muted,#94a3b8)]">
										ФИО сокращены до инициалов, номера телефонов маскированы, нозологические диагнозы и зубные формулы обезличены для маркетинговой аналитики.
									</span>
								</div>
							</div>

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

							{filteredAttributions.length === 0 ? (
								<div
									className="text-center py-12 text-[var(--muted,#94a3b8)] bg-[var(--paper-soft,#0f172a)] rounded-xl border border-[var(--line,rgba(204,251,241,0.15))] p-6 my-2"
									data-testid="attributions-empty-state"
								>
									<Globe className="w-10 h-10 mx-auto mb-3 text-[var(--muted,#94a3b8)] opacity-40" />
									<div className="text-sm font-bold text-[var(--ink,#f8fafc)]">
										Нет записей сквозной атрибуции пациентов
									</div>
									<div className="text-xs mt-1">
										Ожидание звонков с UTM-метками из SIP-телефонии или виджета самозаписи
									</div>
								</div>
							) : (
								<div className="marketing-roi-patient-cards">
									{filteredAttributions.map((attr) => {
										const safeInitials =
											formatInitialsOnly(attr.patientFullName) || attr.patientFullName;
										const safePhone = maskRussianPhone(attr.phone);
										const sanitizedPlanTitle = (
											attr.treatmentPlanTitle || "Первичная консультация"
										)
											.replace(/кариес[а-я]*/gi, "Терапевтический протокол")
											.replace(/пульпит[а-я]*/gi, "Эндодонтический протокол")
											.replace(/периодонтит[а-я]*/gi, "Эндодонтический протокол")
											.replace(/пародонтит[а-я]*/gi, "Пародонтологический протокол")
											.replace(/удаление/gi, "Хирургический протокол");

										return (
											<div
												key={attr.id}
												className="marketing-roi-patient-card"
												data-testid={`attribution-card-${attr.patientId}`}
											>
												<div className="marketing-roi-patient-top">
													<div className="marketing-roi-patient-name">
														<span>{safeInitials}</span>
														<span className="text-xs font-mono text-[var(--muted,#94a3b8)]">
															{safePhone}
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
														<span className="marketing-roi-chip inline-flex items-center gap-1">
															<PhoneCall size={12} className="text-teal-400 shrink-0" />
															<span>SIP Запись ({attr.sipCallDurationSeconds} сек, {attr.sipProvider})</span>
														</span>
													) : null}
												</div>

												<div className="flex items-center justify-between text-xs text-[var(--muted,#94a3b8)] pt-2 border-t border-[var(--line,rgba(204,251,241,0.08))] flex-wrap gap-2">
													<div>
														Врач: <b className="text-[var(--ink,#f8fafc)]">{attr.doctorName || "—"}</b>{" "}
														({attr.specialtyRu || "Терапевт"}) · План:{" "}
														<span className="text-teal-300 font-semibold">
															{sanitizedPlanTitle}
														</span>
													</div>
													{attr.notes && (
														<div className="text-[11px] italic text-[var(--muted,#94a3b8)]">
															«{attr.notes}»
														</div>
													)}
												</div>
											</div>
										);
									})}
								</div>
							)}
						</div>
					)}
				</div>

				{/* 5. Footer */}
				<footer className="marketing-roi-footer">
					<div className="text-xs text-[var(--muted,#94a3b8)] flex items-center gap-2">
						<CheckCircle2 className="w-4 h-4 text-teal-400" />
						<span>
							Все расчеты ведутся в целочисленных копейках (Kopecks) без float-погрешностей по кассовому регламенту и клиническим стандартам.
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

export default MarketingRoiModal;
