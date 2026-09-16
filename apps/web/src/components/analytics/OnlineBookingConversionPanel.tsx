/**
 * OnlineBookingConversionPanel.tsx — Разделение аналитики онлайн-записей и работы администраторов (Фича №28).
 *
 * КОНТЕКСТ (IDENT & DentalPRO паритет):
 * 1. Выделение каналов автоматической самозаписи:
 *    - Официальный сайт (виджет)
 *    - Яндекс Карты (кнопка записи Яндекс Бизнес)
 *    - 2ГИС (профиль клиники)
 *    - ПроДокторов / СберЗдоровье (мед-агрегаторы)
 *    - Telegram-бот / WhatsApp-бот
 * 2. Четкое отделение от воронки телефонных звонков администраторов (АТС/SIP).
 * 3. Расчет экономии времени администраторов, конверсии в явку и выручки.
 */

import { formatKopecksRu, type Kopecks } from "@dental/shared";
import React, { useEffect, useMemo, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import "./executiveDashboard.css";

export type OnlineBookingPeriod = "7d" | "30d" | "90d" | "all";

export interface SelfBookingChannelMetric {
	readonly key: string;
	readonly nameRu: string;
	readonly categoryRu: string;
	readonly iconType: "globe" | "yandex" | "gis" | "prodoc" | "tg" | "wa";
	readonly viewsCount: number;
	readonly slotSelectedCount: number;
	readonly bookingsCount: number;
	readonly attendedCount: number;
	readonly noShowCount: number;
	readonly paidPatientsCount: number;
	readonly revenueKopecks: number;
	readonly spentKopecks: number;
}

export interface AdminPhoneFunnelMetric {
	readonly incomingCallsCount: number;
	readonly answeredCallsCount: number;
	readonly bookedAppointmentsCount: number;
	readonly attendedCount: number;
	readonly noShowCount: number;
	readonly paidPatientsCount: number;
	readonly revenueKopecks: number;
	readonly avgCallDurationSeconds: number;
}

const DEFAULT_ONLINE_CHANNELS: readonly SelfBookingChannelMetric[] = [
	{
		key: "website_widget",
		nameRu: "Сайт клиники (Виджет самозаписи)",
		categoryRu: "Сайт и лендинги",
		iconType: "globe",
		viewsCount: 0,
		slotSelectedCount: 0,
		bookingsCount: 0,
		attendedCount: 0,
		noShowCount: 0,
		paidPatientsCount: 0,
		revenueKopecks: 0 as Kopecks,
		spentKopecks: 0 as Kopecks,
	},
	{
		key: "yandex_maps",
		nameRu: "Яндекс Карты (Кнопка «Записаться»)",
		categoryRu: "Гео-сервисы",
		iconType: "yandex",
		viewsCount: 0,
		slotSelectedCount: 0,
		bookingsCount: 0,
		attendedCount: 0,
		noShowCount: 0,
		paidPatientsCount: 0,
		revenueKopecks: 0 as Kopecks,
		spentKopecks: 0 as Kopecks,
	},
	{
		key: "gis_2",
		nameRu: "2ГИС (Профиль клиники)",
		categoryRu: "Гео-сервисы",
		iconType: "gis",
		viewsCount: 0,
		slotSelectedCount: 0,
		bookingsCount: 0,
		attendedCount: 0,
		noShowCount: 0,
		paidPatientsCount: 0,
		revenueKopecks: 0 as Kopecks,
		spentKopecks: 0 as Kopecks,
	},
	{
		key: "prodoctorov",
		nameRu: "ПроДокторов / СберЗдоровье",
		categoryRu: "Мед-агрегаторы",
		iconType: "prodoc",
		viewsCount: 0,
		slotSelectedCount: 0,
		bookingsCount: 0,
		attendedCount: 0,
		noShowCount: 0,
		paidPatientsCount: 0,
		revenueKopecks: 0 as Kopecks,
		spentKopecks: 0 as Kopecks,
	},
	{
		key: "tg_bot",
		nameRu: "Telegram-бот / Mini App",
		categoryRu: "Мессенджеры",
		iconType: "tg",
		viewsCount: 0,
		slotSelectedCount: 0,
		bookingsCount: 0,
		attendedCount: 0,
		noShowCount: 0,
		paidPatientsCount: 0,
		revenueKopecks: 0 as Kopecks,
		spentKopecks: 0 as Kopecks,
	},
	{
		key: "wa_bot",
		nameRu: "WhatsApp-чатбот / WABA",
		categoryRu: "Мессенджеры",
		iconType: "wa",
		viewsCount: 0,
		slotSelectedCount: 0,
		bookingsCount: 0,
		attendedCount: 0,
		noShowCount: 0,
		paidPatientsCount: 0,
		revenueKopecks: 0 as Kopecks,
		spentKopecks: 0 as Kopecks,
	},
];

const DEFAULT_ADMIN_PHONE_FUNNEL: AdminPhoneFunnelMetric = {
	incomingCallsCount: 0,
	answeredCallsCount: 0,
	bookedAppointmentsCount: 0,
	attendedCount: 0,
	noShowCount: 0,
	paidPatientsCount: 0,
	revenueKopecks: 0 as Kopecks,
	avgCallDurationSeconds: 0,
};

export function OnlineBookingConversionPanel() {
	const [period, setPeriod] = useState<OnlineBookingPeriod>("30d");
	const [selectedChannelKey, setSelectedChannelKey] = useState<string>("all");
	const [activeTab, setActiveTab] = useState<
		"self_booking" | "admin_comparison" | "funnel"
	>("self_booking");
	const [channels, setChannels] = useState<readonly SelfBookingChannelMetric[]>(
		DEFAULT_ONLINE_CHANNELS,
	);
	const [adminFunnel, setAdminFunnel] = useState<AdminPhoneFunnelMetric>(
		DEFAULT_ADMIN_PHONE_FUNNEL,
	);

	useEffect(() => {
		let isMounted = true;
		async function loadLiveAttribution() {
			try {
				const res = await fetch("/api/marketing/attribution", {
					headers: denteAdminSecretRequestHeaders(),
				});
				if (!res.ok) return;
				const data = await res.json();
				if (
					isMounted &&
					data.selfBookingChannels &&
					Array.isArray(data.selfBookingChannels)
				) {
					const mapped = data.selfBookingChannels.map((c: any) => ({
						key: c.key,
						nameRu: c.nameRu,
						categoryRu: c.categoryRu,
						iconType:
							c.key === "website_widget"
								? "globe"
								: c.key === "yandex_maps"
									? "yandex"
									: c.key === "gis_2"
										? "gis"
										: c.key === "prodoctorov"
											? "prodoc"
											: c.key === "tg_bot"
												? "tg"
												: "wa",
						viewsCount: Math.max(0, Math.round(Number(c.viewsCount) || 0)),
						slotSelectedCount: Math.max(0, Math.round(Number(c.slotSelectedCount) || 0)),
						bookingsCount: Math.max(0, Math.round(Number(c.bookingsCount) || 0)),
						attendedCount: Math.max(0, Math.round(Number(c.attendedCount) || 0)),
						noShowCount: Math.max(0, Math.round(Number(c.noShowCount) || 0)),
						paidPatientsCount: Math.max(0, Math.round(Number(c.paidPatientsCount) || 0)),
						revenueKopecks: Math.max(0, Math.round(Number(c.revenueKopecks) || 0)) as Kopecks,
						spentKopecks: Math.max(0, Math.round(Number(c.spentKopecks) || 0)) as Kopecks,
					}));
					setChannels(mapped);
				}
				if (isMounted && data.telephonyAdminFunnel) {
					setAdminFunnel({
						incomingCallsCount: Math.max(0, Math.round(Number(data.telephonyAdminFunnel.incomingCallsCount) || 0)),
						answeredCallsCount: Math.max(0, Math.round(Number(data.telephonyAdminFunnel.answeredCallsCount) || 0)),
						bookedAppointmentsCount: Math.max(0, Math.round(Number(data.telephonyAdminFunnel.bookedAppointmentsCount) || 0)),
						attendedCount: Math.max(0, Math.round(Number(data.telephonyAdminFunnel.attendedCount) || 0)),
						noShowCount: Math.max(0, Math.round(Number(data.telephonyAdminFunnel.noShowCount) || 0)),
						paidPatientsCount: Math.max(0, Math.round(Number(data.telephonyAdminFunnel.paidPatientsCount) || 0)),
						revenueKopecks: Math.max(0, Math.round(Number(data.telephonyAdminFunnel.revenueKopecks) || 0)) as Kopecks,
						avgCallDurationSeconds: Math.max(0, Math.round(Number(data.telephonyAdminFunnel.avgCallDurationSeconds) || 120)),
					});
				}
			} catch {
				// Graceful fallback
			} finally {
				if (isMounted) setLoading(false);
			}
		}
		loadLiveAttribution();
		return () => {
			isMounted = false;
		};
	}, []);

	// Aggregated self-booking totals
	const onlineSummary = useMemo(() => {
		const filtered =
			selectedChannelKey === "all"
				? channels
				: channels.filter((c) => c.key === selectedChannelKey);

		const totalViews = filtered.reduce((acc, c) => acc + (c.viewsCount || 0), 0);
		const totalSlotSelected = filtered.reduce(
			(acc, c) => acc + (c.slotSelectedCount || 0),
			0,
		);
		const totalBookings = filtered.reduce((acc, c) => acc + (c.bookingsCount || 0), 0);
		const totalAttended = filtered.reduce((acc, c) => acc + (c.attendedCount || 0), 0);
		const totalNoShow = filtered.reduce((acc, c) => acc + (c.noShowCount || 0), 0);
		const totalPaid = filtered.reduce((acc, c) => acc + (c.paidPatientsCount || 0), 0);
		const totalRevenueKopecks = Math.round(filtered.reduce(
			(acc, c) => acc + (c.revenueKopecks || 0),
			0,
		)) as Kopecks;
		const totalSpentKopecks = Math.round(filtered.reduce(
			(acc, c) => acc + (c.spentKopecks || 0),
			0,
		)) as Kopecks;

		const conversionRatePercent =
			totalViews > 0 ? (totalBookings / totalViews) * 100 : 0;
		const attendanceRatePercent =
			totalBookings > 0 ? (totalAttended / totalBookings) * 100 : 0;
		const noShowRatePercent =
			totalBookings > 0 ? (totalNoShow / totalBookings) * 100 : 0;
		const avgCheckKopecks =
			totalPaid > 0 ? (Math.round(totalRevenueKopecks / totalPaid) as Kopecks) : (0 as Kopecks);

		// ROMI
		const profitKopecks = totalRevenueKopecks - totalSpentKopecks;
		const romiPercent =
			totalSpentKopecks > 0
				? Math.round((profitKopecks / totalSpentKopecks) * 100)
				: null;

		return {
			totalViews,
			totalSlotSelected,
			totalBookings,
			totalAttended,
			totalNoShow,
			totalPaid,
			totalRevenueKopecks,
			totalSpentKopecks,
			conversionRatePercent,
			attendanceRatePercent,
			noShowRatePercent,
			avgCheckKopecks,
			romiPercent,
			channelsCount: filtered.length,
		};
	}, [selectedChannelKey, channels]);

	// Comparison of Online Self-Booking vs Administrator Phone Funnel
	const comparison = useMemo(() => {
		const onlineBookings = onlineSummary.totalBookings;
		const adminBookings = adminFunnel.bookedAppointmentsCount;
		const grandTotalBookings = onlineBookings + adminBookings;

		const onlineSharePercent =
			grandTotalBookings > 0
				? Math.round((onlineBookings / grandTotalBookings) * 100)
				: 0;
		const adminSharePercent = 100 - onlineSharePercent;

		const onlineAttendancePercent =
			onlineSummary.totalBookings > 0
				? Math.round(
						(onlineSummary.totalAttended / onlineSummary.totalBookings) * 100,
					)
				: 0;
		const adminAttendancePercent =
			adminFunnel.bookedAppointmentsCount > 0
				? Math.round(
						(adminFunnel.attendedCount / adminFunnel.bookedAppointmentsCount) *
							100,
					)
				: 0;

		// Saved administrative work time in hours (3.5 mins per call/booking)
		const savedMinutes = onlineBookings * 4;
		const savedHours = Math.round((savedMinutes / 60) * 10) / 10;

		return {
			onlineBookings,
			adminBookings,
			grandTotalBookings,
			onlineSharePercent,
			adminSharePercent,
			onlineAttendancePercent,
			adminAttendancePercent,
			savedHours,
		};
	}, [onlineSummary, adminFunnel]);

	const renderIcon = (type: SelfBookingChannelMetric["iconType"]) => {
		switch (type) {
			case "globe":
				return <Globe size={16} className="text-blue-500" />;
			case "yandex":
				return <MapPin size={16} className="text-red-500" />;
			case "gis":
				return <MapPin size={16} className="text-emerald-500" />;
			case "prodoc":
				return <Activity size={16} className="text-indigo-500" />;
			case "tg":
				return <Send size={16} className="text-sky-500" />;
			case "wa":
				return <MessageSquare size={16} className="text-teal-500" />;
			default:
				return <Globe size={16} className="text-[var(--teal)]" />;
		}
	};

	return (
		<div className="space-y-4" data-testid="online-booking-conversion-panel">
			{/* Top Header & Controls (Mandate 8p: <= 48-56px height on desktop) */}
			<div className="online-header-compact">
				<div className="flex items-center gap-2.5 min-w-0">
					<div className="w-8 h-8 rounded-lg bg-teal-500/10 text-[var(--teal)] flex items-center justify-center shrink-0">
						<Bot size={18} aria-hidden="true" />
					</div>
					<div className="min-w-0 flex flex-col justify-center">
						<h3 className="text-sm font-bold text-[var(--ink)] m-0 leading-tight truncate">
							Сквозная аналитика: Онлайн-записи vs Администраторы
						</h3>
						<p
							className="text-[11px] text-[var(--muted)] m-0 leading-tight truncate hidden md:block"
							title="Выделение автоматических каналов самозаписи (Сайт, Карты, 2ГИС, ПроДокторов, Боты) из воронки АТС"
						>
							Выделение автоматических каналов самозаписи (Сайт, Карты, 2ГИС, ПроДокторов, Боты) из воронки АТС
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2 shrink-0">
					{/* Period Selector (32px desktop, 44px touch) */}
					<div className="online-period-toggle" role="group" aria-label="Период отчета">
						{(
							[
								{ key: "7d", label: "7 дней" },
								{ key: "30d", label: "30 дней" },
								{ key: "90d", label: "Квартал" },
								{ key: "all", label: "Все время" },
							] as const
						).map((p) => (
							<button
								key={p.key}
								type="button"
								onClick={() => setPeriod(p.key)}
								className={`online-period-btn ${period === p.key ? "active" : ""}`}
							>
								{p.label}
							</button>
						))}
					</div>
				</div>
			</div>

			{/* Top KPI Cards (Medical Density) */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
				{/* KPI 1: Online Share */}
				<div className="p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] space-y-1">
					<div className="flex items-center justify-between text-xs text-[var(--muted)]">
						<span>Доля самозаписи</span>
						<Bot size={16} className="text-[var(--teal)]" />
					</div>
					<div className="text-2xl font-extrabold text-[var(--ink)]">
						{comparison.onlineSharePercent}%
					</div>
					<p className="text-[11px] text-[var(--muted)] m-0">
						{onlineSummary.totalBookings} из {comparison.grandTotalBookings}{" "}
						всех записей
					</p>
				</div>

				{/* KPI 2: Widget Conversion */}
				<div className="p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] space-y-1">
					<div className="flex items-center justify-between text-xs text-[var(--muted)]">
						<span>Конверсия виджета</span>
						<TrendingUp size={16} className="text-emerald-500" />
					</div>
					<div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
						{Number.isFinite(onlineSummary.conversionRatePercent)
							? onlineSummary.conversionRatePercent.toFixed(1)
							: "0.0"}%
					</div>
					<p className="text-[11px] text-[var(--muted)] m-0">
						{onlineSummary.totalBookings} записей с {onlineSummary.totalViews}{" "}
						просмотров
					</p>
				</div>

				{/* KPI 3: Attendance Rate */}
				<div className="p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] space-y-1">
					<div className="flex items-center justify-between text-xs text-[var(--muted)]">
						<span>Доходимость (Явка)</span>
						<UserCheck size={16} className="text-blue-500" />
					</div>
					<div className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">
						{Number.isFinite(onlineSummary.attendanceRatePercent)
							? onlineSummary.attendanceRatePercent.toFixed(1)
							: "0.0"}%
					</div>
					<p className="text-[11px] text-[var(--muted)] m-0">
						Неявка: {Number.isFinite(onlineSummary.noShowRatePercent)
							? onlineSummary.noShowRatePercent.toFixed(1)
							: "0.0"}% ({onlineSummary.totalNoShow} чел.)
					</p>
				</div>

				{/* KPI 4: Online Revenue */}
				<div className="p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] space-y-1">
					<div className="flex items-center justify-between text-xs text-[var(--muted)]">
						<span>Выручка от самозаписи</span>
						<DollarSign size={16} className="text-[var(--teal)]" />
					</div>
					<div className="text-2xl font-extrabold text-[var(--ink)]">
						{formatKopecksRu(onlineSummary.totalRevenueKopecks)}
					</div>
					<p className="text-[11px] text-[var(--muted)] m-0">
						Ср. чек: {formatKopecksRu(onlineSummary.avgCheckKopecks)} · ROMI:{" "}
						{onlineSummary.romiPercent !== null
							? onlineSummary.romiPercent > 0
								? `+${onlineSummary.romiPercent}%`
								: `${onlineSummary.romiPercent}%`
							: "—"}
					</p>
				</div>
			</div>

			{/* Navigation Tabs (32px desktop, 44px touch) */}
			<div className="flex items-center gap-2 border-b border-[var(--line)] pb-2 overflow-x-auto no-scrollbar flex-nowrap">
				<button
					type="button"
					onClick={() => setActiveTab("self_booking")}
					className={`online-tab-btn ${activeTab === "self_booking" ? "active" : ""}`}
				>
					Каналы онлайн-самозаписи ({channels.length})
				</button>
				<button
					type="button"
					onClick={() => setActiveTab("admin_comparison")}
					className={`online-tab-btn ${activeTab === "admin_comparison" ? "active" : ""}`}
				>
					Сравнение: Онлайн vs Администраторы (АТС)
				</button>
				<button
					type="button"
					onClick={() => setActiveTab("funnel")}
					className={`online-tab-btn ${activeTab === "funnel" ? "active" : ""}`}
				>
					Пошаговая воронка конверсии виджета
				</button>
			</div>

			{/* Tab 1: Self-Booking Channels Table */}
			{activeTab === "self_booking" && (
				<div className="p-4 rounded-xl bg-[var(--paper)] border border-[var(--line)] space-y-3">
					<div className="flex flex-wrap items-center justify-between gap-2">
						<div className="flex items-center gap-2">
							<h4 className="text-sm font-bold text-[var(--ink)] m-0">
								Эффективность каналов автоматической самозаписи
							</h4>
							{channels.length > 0 && (
								<select
									aria-label="Фильтр по каналу записи"
									value={selectedChannelKey}
									onChange={(e) => setSelectedChannelKey(e.target.value)}
									className="h-7 text-xs rounded-md bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] px-2 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--teal)]"
								>
									<option value="all">Все каналы ({channels.length})</option>
									{channels.map((ch) => (
										<option key={ch.key} value={ch.key}>
											{ch.nameRu}
										</option>
									))}
								</select>
							)}
						</div>
						<div className="text-xs text-[var(--muted)]">
							Сэкономлено времени администраторов:{" "}
							<span className="font-bold text-[var(--teal)]">
								{comparison.savedHours} ч.
							</span>
						</div>
					</div>

					{channels.length === 0 ? (
						<div className="text-center py-8 px-4 bg-[var(--paper-soft)] rounded-xl border border-[var(--line)]">
							<Globe size={32} className="mx-auto text-[var(--muted)] mb-2 opacity-50" aria-hidden="true" />
							<div className="text-sm font-semibold text-[var(--ink)]">Нет подключенных каналов онлайн-самозаписи</div>
							<p className="text-xs text-[var(--muted)] mt-1 max-w-md mx-auto">
								Подключите виджет самозаписи на сайт клиники, настройте кнопки в Яндекс Картах, 2ГИС или чат-ботах Telegram/WhatsApp для автоматического привлечения пациентов.
							</p>
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full text-left text-xs border-collapse">
								<thead>
									<tr className="border-b border-[var(--line)] text-[var(--muted)] font-semibold">
										<th className="py-2.5 px-3">Канал самозаписи</th>
										<th className="py-2.5 px-3">Категория</th>
										<th className="py-2.5 px-3 text-right">Просмотры</th>
										<th className="py-2.5 px-3 text-right">Записи</th>
										<th className="py-2.5 px-3 text-right">Конверсия</th>
										<th className="py-2.5 px-3 text-right">Явка (чел / %)</th>
										<th className="py-2.5 px-3 text-right">Неявки</th>
										<th className="py-2.5 px-3 text-right">Выручка (₽)</th>
										<th className="py-2.5 px-3 text-right">ROMI</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-[var(--line)]">
									{channels.map((ch) => {
										const convPercent =
											ch.viewsCount > 0
												? (ch.bookingsCount / ch.viewsCount) * 100
												: 0;
										const attendPercent =
											ch.bookingsCount > 0
												? (ch.attendedCount / ch.bookingsCount) * 100
												: 0;
										const profit = ch.revenueKopecks - ch.spentKopecks;
										const romi =
											ch.spentKopecks > 0
												? Math.round((profit / ch.spentKopecks) * 100)
												: 0;

										return (
											<tr
												key={ch.key}
												className="hover:bg-[var(--paper-soft)]/50 transition-colors"
											>
												<td className="py-2.5 px-3 max-w-[240px]">
													<div className="flex items-center gap-2 font-bold text-[var(--ink)] min-w-0">
														{renderIcon(ch.iconType)}
														<span className="truncate" title={ch.nameRu}>{ch.nameRu}</span>
													</div>
												</td>
												<td className="py-2.5 px-3 text-[var(--muted)] max-w-[140px] truncate" title={ch.categoryRu}>
													{ch.categoryRu}
												</td>
												<td className="py-2.5 px-3 text-right font-medium text-[var(--ink)]">
													{ch.viewsCount.toLocaleString("ru-RU")}
												</td>
												<td className="py-2.5 px-3 text-right font-bold text-[var(--teal)]">
													{ch.bookingsCount}
												</td>
												<td className="py-2.5 px-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
													{convPercent.toFixed(1)}%
												</td>
												<td className="py-2.5 px-3 text-right font-medium text-blue-600 dark:text-blue-400">
													{ch.attendedCount}{" "}
													<span className="text-[11px] text-[var(--muted)]">
														({attendPercent.toFixed(0)}%)
													</span>
												</td>
												<td className="py-2.5 px-3 text-right font-medium text-rose-500">
													{ch.noShowCount}
												</td>
												<td className="py-2.5 px-3 text-right font-bold text-[var(--ink)]">
													{formatKopecksRu(ch.revenueKopecks)}
												</td>
												<td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
													{ch.spentKopecks > 0 ? (romi > 0 ? `+${romi}%` : `${romi}%`) : "—"}
												</td>
											</tr>
										);
									})}
								</tbody>
								<tfoot>
									<tr className="border-t-2 border-[var(--line)] bg-[var(--paper-soft)]/40 font-bold text-[var(--ink)]">
										<td className="py-2.5 px-3" colSpan={2}>
											ИТОГО ПО САМОЗАПИСИ:
										</td>
										<td className="py-2.5 px-3 text-right">
											{onlineSummary.totalViews.toLocaleString("ru-RU")}
										</td>
										<td className="py-2.5 px-3 text-right text-[var(--teal)]">
											{onlineSummary.totalBookings}
										</td>
										<td className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400">
											{onlineSummary.conversionRatePercent.toFixed(1)}%
										</td>
										<td className="py-2.5 px-3 text-right text-blue-600 dark:text-blue-400">
											{onlineSummary.totalAttended} (
											{onlineSummary.attendanceRatePercent.toFixed(0)}%)
										</td>
										<td className="py-2.5 px-3 text-right text-rose-500">
											{onlineSummary.totalNoShow}
										</td>
										<td className="py-2.5 px-3 text-right text-[var(--teal)]">
											{formatKopecksRu(onlineSummary.totalRevenueKopecks)}
										</td>
										<td className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400">
											{onlineSummary.romiPercent !== null
												? onlineSummary.romiPercent > 0
													? `+${onlineSummary.romiPercent}%`
													: `${onlineSummary.romiPercent}%`
												: "—"}
										</td>
									</tr>
								</tfoot>
							</table>
						</div>
					)}
				</div>
			)}

			{/* Tab 2: Online vs Admin Phone Funnel Comparison */}
			{activeTab === "admin_comparison" && (
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{/* Online Self-Booking Card */}
					<div className="p-4 rounded-xl bg-[var(--paper)] border border-teal-500/30 space-y-3">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<div className="p-1.5 rounded-lg bg-teal-500/10 text-[var(--teal)]">
									<Bot size={18} />
								</div>
								<div>
									<h4 className="text-sm font-bold text-[var(--ink)] m-0">
										Онлайн-самозапись (Авто)
									</h4>
									<p className="text-[11px] text-[var(--muted)] m-0">
										Виджет сайта, Яндекс Карты, 2ГИС, Telegram
									</p>
								</div>
							</div>
							<span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-teal-500/15 text-[var(--teal)]">
								{comparison.onlineSharePercent}% потока
							</span>
						</div>

						<div className="space-y-1.5 text-xs">
							<div className="flex justify-between py-1.5 border-b border-[var(--line)]">
								<span className="text-[var(--muted)]">
									Всего создано записей:
								</span>
								<span className="font-bold text-[var(--ink)]">
									{onlineSummary.totalBookings} записей
								</span>
							</div>
							<div className="flex justify-between py-1.5 border-b border-[var(--line)]">
								<span className="text-[var(--muted)]">Доходимость (Явка):</span>
								<span className="font-bold text-blue-600 dark:text-blue-400">
									{comparison.onlineAttendancePercent}% (
									{onlineSummary.totalAttended} чел.)
								</span>
							</div>
							<div className="flex justify-between py-1.5 border-b border-[var(--line)]">
								<span className="text-[var(--muted)]">Неявка (No-show):</span>
								<span className="font-bold text-rose-500">
									{Number.isFinite(onlineSummary.noShowRatePercent) ? onlineSummary.noShowRatePercent.toFixed(1) : "0.0"}% (
									{onlineSummary.totalNoShow} чел.)
								</span>
							</div>
							<div className="flex justify-between py-1.5 border-b border-[var(--line)]">
								<span className="text-[var(--muted)]">
									Выручка от пациентов:
								</span>
								<span className="font-bold text-[var(--teal)]">
									{formatKopecksRu(onlineSummary.totalRevenueKopecks || (0 as Kopecks))}
								</span>
							</div>
							<div className="flex justify-between py-1.5 border-b border-[var(--line)]">
								<span className="text-[var(--muted)]">Средний чек:</span>
								<span className="font-bold text-[var(--ink)]">
									{formatKopecksRu(onlineSummary.avgCheckKopecks || (0 as Kopecks))}
								</span>
							</div>
							<div className="flex justify-between py-1.5">
								<span className="text-[var(--muted)]">
									Человеко-часов сэкономлено:
								</span>
								<span className="font-bold text-emerald-600 dark:text-emerald-400">
									~{comparison.savedHours} часов работы
								</span>
							</div>
						</div>
					</div>

					{/* Admin Phone Telephony Card */}
					<div className="p-4 rounded-xl bg-[var(--paper)] border border-[var(--line)] space-y-3">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
									<PhoneCall size={18} />
								</div>
								<div>
									<h4 className="text-sm font-bold text-[var(--ink)] m-0">
										Регистратура (АТС / Звонки)
									</h4>
									<p className="text-[11px] text-[var(--muted)] m-0">
										Входящие звонки, обработанные администраторами
									</p>
								</div>
							</div>
							<span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400">
								{comparison.adminSharePercent}% потока
							</span>
						</div>

						<div className="space-y-1.5 text-xs">
							<div className="flex justify-between py-1.5 border-b border-[var(--line)]">
								<span className="text-[var(--muted)]">Входящих звонков:</span>
								<span className="font-bold text-[var(--ink)]">
									{adminFunnel.incomingCallsCount} звонков
								</span>
							</div>
							<div className="flex justify-between py-1.5 border-b border-[var(--line)]">
								<span className="text-[var(--muted)]">
									Конверсия звонок &rarr; запись:
								</span>
								<span className="font-bold text-emerald-600 dark:text-emerald-400">
									{adminFunnel.answeredCallsCount > 0
										? (
												(adminFunnel.bookedAppointmentsCount /
													adminFunnel.answeredCallsCount) *
												100
											).toFixed(1)
										: "0.0"}
									% ({adminFunnel.bookedAppointmentsCount} зап.)
								</span>
							</div>
							<div className="flex justify-between py-1.5 border-b border-[var(--line)]">
								<span className="text-[var(--muted)]">Доходимость (Явка):</span>
								<span className="font-bold text-blue-600 dark:text-blue-400">
									{comparison.adminAttendancePercent}% (
									{adminFunnel.attendedCount} чел.)
								</span>
							</div>
							<div className="flex justify-between py-1.5 border-b border-[var(--line)]">
								<span className="text-[var(--muted)]">Неявка (No-show):</span>
								<span className="font-bold text-rose-500">
									{adminFunnel.bookedAppointmentsCount > 0
										? (
												(adminFunnel.noShowCount /
													adminFunnel.bookedAppointmentsCount) *
												100
											).toFixed(1)
										: "0.0"}
									% ({adminFunnel.noShowCount} чел.)
								</span>
							</div>
							<div className="flex justify-between py-1.5 border-b border-[var(--line)]">
								<span className="text-[var(--muted)]">Выручка от звонков:</span>
								<span className="font-bold text-[var(--ink)]">
									{formatKopecksRu(adminFunnel.revenueKopecks || (0 as Kopecks))}
								</span>
							</div>
							<div className="flex justify-between py-1.5">
								<span className="text-[var(--muted)]">
									Ср. длительность звонка:
								</span>
								<span className="font-bold text-[var(--ink)]">
									{Math.floor(adminFunnel.avgCallDurationSeconds / 60)} мин{" "}
									{adminFunnel.avgCallDurationSeconds % 60} сек
								</span>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Tab 3: Step-by-Step Funnel */}
			{activeTab === "funnel" && (
				<div className="p-4 rounded-xl bg-[var(--paper)] border border-[var(--line)] space-y-3">
					<h4 className="text-sm font-bold text-[var(--ink)] m-0">
						6 этапов конверсии онлайн-записи (от показа до кассового чека 54-ФЗ)
					</h4>

					{onlineSummary.totalViews === 0 && (
						<div className="p-3 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] text-xs text-[var(--muted)] text-center">
							За выбранный период нет переходов в виджет самозаписи. Данные конверсии обновятся автоматически при первом обращении пациента.
						</div>
					)}

					<div className="grid grid-cols-1 md:grid-cols-6 gap-2">
						{[
							{
								step: "1. Просмотры",
								count: onlineSummary.totalViews,
								label: "Открытий виджета",
								dropoff:
									onlineSummary.totalViews > 0
										? `${((onlineSummary.totalSlotSelected / onlineSummary.totalViews) * 100).toFixed(0)}% перешли`
										: "0% перешли",
								color: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
							},
							{
								step: "2. Выбор слота",
								count: onlineSummary.totalSlotSelected,
								label: "Выбрали время",
								dropoff:
									onlineSummary.totalSlotSelected > 0
										? `${((onlineSummary.totalBookings / onlineSummary.totalSlotSelected) * 100).toFixed(0)}% ввели контакты`
										: "0% ввели контакты",
								color: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
							},
							{
								step: "3. Бронь создана",
								count: onlineSummary.totalBookings,
								label: "Подтверждено СМС",
								dropoff:
									onlineSummary.totalBookings > 0
										? `${((onlineSummary.totalAttended / onlineSummary.totalBookings) * 100).toFixed(0)}% явились`
										: "0% явились",
								color: "bg-teal-500/10 text-teal-700 dark:text-teal-300",
							},
							{
								step: "4. Явка в клинику",
								count: onlineSummary.totalAttended,
								label: "Сели в кресло",
								dropoff:
									onlineSummary.totalAttended > 0
										? `${((onlineSummary.totalPaid / onlineSummary.totalAttended) * 100).toFixed(0)}% оплатили`
										: "0% оплатили",
								color: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
							},
							{
								step: "5. Оплата лечения",
								count: onlineSummary.totalPaid,
								label: "Пробит чек 54-ФЗ",
								dropoff: "100% конверсия",
								color:
									"bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
							},
							{
								step: "6. Выручка",
								count: formatKopecksRu(onlineSummary.totalRevenueKopecks || (0 as Kopecks)),
								label: "Итоговая выручка",
								dropoff: `Ср. чек ${formatKopecksRu(onlineSummary.avgCheckKopecks || (0 as Kopecks))}`,
								color:
									"bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold",
							},
						].map((item) => (
							<div
								key={item.step}
								className={`p-2.5 rounded-lg border border-[var(--line)] space-y-1 ${item.color}`}
							>
								<span className="text-[11px] font-bold block">{item.step}</span>
								<div className="text-lg font-extrabold">{item.count}</div>
								<span className="text-[10px] text-[var(--muted)] block truncate" title={item.label}>
									{item.label}
								</span>
								<span className="text-[10px] font-semibold text-[var(--teal)] block mt-0.5 truncate" title={item.dropoff}>
									{item.dropoff}
								</span>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
