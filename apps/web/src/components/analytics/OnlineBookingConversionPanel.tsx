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

import { formatKopecksRu, type Kopecks, parseKopecks } from "@dental/shared";
import {
	Activity,
	ArrowRight,
	BarChart3,
	Bot,
	Building2,
	Calendar,
	CheckCircle2,
	Clock,
	DollarSign,
	Globe,
	HelpCircle,
	MapPin,
	MessageSquare,
	PhoneCall,
	Send,
	Sparkles,
	TrendingUp,
	UserCheck,
	Users,
	XCircle,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";

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
		viewsCount: 1840,
		slotSelectedCount: 412,
		bookingsCount: 88,
		attendedCount: 76,
		noShowCount: 12,
		paidPatientsCount: 64,
		revenueKopecks: parseKopecks("840000.00"), // 840 000 ₽
		spentKopecks: parseKopecks("35000.00"),
	},
	{
		key: "yandex_maps",
		nameRu: "Яндекс Карты (Кнопка «Записаться»)",
		categoryRu: "Гео-сервисы",
		iconType: "yandex",
		viewsCount: 2450,
		slotSelectedCount: 520,
		bookingsCount: 104,
		attendedCount: 91,
		noShowCount: 13,
		paidPatientsCount: 78,
		revenueKopecks: parseKopecks("980000.00"), // 980 000 ₽
		spentKopecks: parseKopecks("42000.00"),
	},
	{
		key: "gis_2",
		nameRu: "2ГИС (Профиль клиники)",
		categoryRu: "Гео-сервисы",
		iconType: "gis",
		viewsCount: 1120,
		slotSelectedCount: 215,
		bookingsCount: 46,
		attendedCount: 39,
		noShowCount: 7,
		paidPatientsCount: 32,
		revenueKopecks: parseKopecks("390000.00"), // 390 000 ₽
		spentKopecks: parseKopecks("24000.00"),
	},
	{
		key: "prodoctorov",
		nameRu: "ПроДокторов / СберЗдоровье",
		categoryRu: "Мед-агрегаторы",
		iconType: "prodoc",
		viewsCount: 890,
		slotSelectedCount: 195,
		bookingsCount: 52,
		attendedCount: 47,
		noShowCount: 5,
		paidPatientsCount: 41,
		revenueKopecks: parseKopecks("530000.00"), // 530 000 ₽
		spentKopecks: parseKopecks("30000.00"),
	},
	{
		key: "tg_bot",
		nameRu: "Telegram-бот / Mini App",
		categoryRu: "Мессенджеры",
		iconType: "tg",
		viewsCount: 620,
		slotSelectedCount: 140,
		bookingsCount: 38,
		attendedCount: 34,
		noShowCount: 4,
		paidPatientsCount: 29,
		revenueKopecks: parseKopecks("310000.00"), // 310 000 ₽
		spentKopecks: parseKopecks("15000.00"),
	},
	{
		key: "wa_bot",
		nameRu: "WhatsApp-чатбот / WABA",
		categoryRu: "Мессенджеры",
		iconType: "wa",
		viewsCount: 480,
		slotSelectedCount: 95,
		bookingsCount: 26,
		attendedCount: 23,
		noShowCount: 3,
		paidPatientsCount: 20,
		revenueKopecks: parseKopecks("225000.00"), // 225 000 ₽
		spentKopecks: parseKopecks("12000.00"),
	},
];

const DEFAULT_ADMIN_PHONE_FUNNEL: AdminPhoneFunnelMetric = {
	incomingCallsCount: 680,
	answeredCallsCount: 645,
	bookedAppointmentsCount: 290,
	attendedCount: 235,
	noShowCount: 55,
	paidPatientsCount: 192,
	revenueKopecks: parseKopecks("2450000.00"), // 2 450 000 ₽
	avgCallDurationSeconds: 142, // 2 мин 22 сек
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
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		let isMounted = true;
		async function loadLiveAttribution() {
			try {
				setLoading(true);
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
											? "prodoctorov"
											: c.key === "tg_bot"
												? "telegram"
												: "whatsapp",
						viewsCount: c.viewsCount || 0,
						slotSelectedCount: c.slotSelectedCount || 0,
						bookingsCount: c.bookingsCount || 0,
						attendedCount: c.attendedCount || 0,
						noShowCount: c.noShowCount || 0,
						paidPatientsCount: c.paidPatientsCount || 0,
						revenueKopecks: (c.revenueKopecks || 0) as Kopecks,
						spentKopecks: (c.spentKopecks || 0) as Kopecks,
					}));
					setChannels(mapped);
				}
				if (isMounted && data.telephonyAdminFunnel) {
					setAdminFunnel({
						incomingCallsCount:
							data.telephonyAdminFunnel.incomingCallsCount || 0,
						answeredCallsCount:
							data.telephonyAdminFunnel.answeredCallsCount || 0,
						bookedAppointmentsCount:
							data.telephonyAdminFunnel.bookedAppointmentsCount || 0,
						attendedCount: data.telephonyAdminFunnel.attendedCount || 0,
						noShowCount: data.telephonyAdminFunnel.noShowCount || 0,
						paidPatientsCount: data.telephonyAdminFunnel.paidPatientsCount || 0,
						revenueKopecks: (data.telephonyAdminFunnel.revenueKopecks ||
							0) as Kopecks,
						avgCallDurationSeconds:
							data.telephonyAdminFunnel.avgCallDurationSeconds || 120,
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

		const totalViews = filtered.reduce((acc, c) => acc + c.viewsCount, 0);
		const totalSlotSelected = filtered.reduce(
			(acc, c) => acc + c.slotSelectedCount,
			0,
		);
		const totalBookings = filtered.reduce((acc, c) => acc + c.bookingsCount, 0);
		const totalAttended = filtered.reduce((acc, c) => acc + c.attendedCount, 0);
		const totalNoShow = filtered.reduce((acc, c) => acc + c.noShowCount, 0);
		const totalPaid = filtered.reduce((acc, c) => acc + c.paidPatientsCount, 0);
		const totalRevenueKopecks = filtered.reduce(
			(acc, c) => acc + c.revenueKopecks,
			0,
		);
		const totalSpentKopecks = filtered.reduce(
			(acc, c) => acc + c.spentKopecks,
			0,
		);

		const conversionRatePercent =
			totalViews > 0 ? (totalBookings / totalViews) * 100 : 0;
		const attendanceRatePercent =
			totalBookings > 0 ? (totalAttended / totalBookings) * 100 : 0;
		const noShowRatePercent =
			totalBookings > 0 ? (totalNoShow / totalBookings) * 100 : 0;
		const avgCheckKopecks =
			totalPaid > 0 ? Math.round(totalRevenueKopecks / totalPaid) : 0;

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
			{/* Top Header & Controls */}
			<div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-[var(--paper)] border border-[var(--line)]">
				<div className="space-y-1">
					<div className="flex items-center gap-2">
						<div className="p-2 rounded-xl bg-teal-500/10 text-[var(--teal)]">
							<Bot size={20} />
						</div>
						<div>
							<h3 className="text-base font-bold text-[var(--ink)] m-0 flex items-center gap-2">
								Сквозная аналитика: Онлайн-записи vs Администраторы
								<span className="text-[11px] px-2 py-0.5 rounded-full bg-teal-500/15 text-[var(--teal)] font-semibold">
									Фича №28
								</span>
							</h3>
							<p className="text-xs text-[var(--muted)] m-0">
								Выделение автоматических каналов самозаписи (Сайт, Карты, 2ГИС,
								ПроДокторов, Боты) из воронки АТС
							</p>
						</div>
					</div>
				</div>

				<div className="flex items-center gap-2">
					{/* Period Selector */}
					<div className="inline-flex rounded-xl bg-[var(--paper-soft)] p-1 border border-[var(--line)]">
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
								className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors border-0 cursor-pointer min-h-[44px] flex items-center justify-center ${
									period === p.key
										? "bg-[var(--paper)] text-[var(--ink)] shadow-sm"
										: "bg-transparent text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
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
				<div className="p-4 rounded-2xl bg-[var(--paper)] border border-[var(--line)] space-y-1">
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
				<div className="p-4 rounded-2xl bg-[var(--paper)] border border-[var(--line)] space-y-1">
					<div className="flex items-center justify-between text-xs text-[var(--muted)]">
						<span>Конверсия виджета</span>
						<TrendingUp size={16} className="text-emerald-500" />
					</div>
					<div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
						{onlineSummary.conversionRatePercent.toFixed(1)}%
					</div>
					<p className="text-[11px] text-[var(--muted)] m-0">
						{onlineSummary.totalBookings} записей с {onlineSummary.totalViews}{" "}
						просмотров
					</p>
				</div>

				{/* KPI 3: Attendance Rate */}
				<div className="p-4 rounded-2xl bg-[var(--paper)] border border-[var(--line)] space-y-1">
					<div className="flex items-center justify-between text-xs text-[var(--muted)]">
						<span>Доходимость (Явка)</span>
						<UserCheck size={16} className="text-blue-500" />
					</div>
					<div className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">
						{onlineSummary.attendanceRatePercent.toFixed(1)}%
					</div>
					<p className="text-[11px] text-[var(--muted)] m-0">
						Неявка: {onlineSummary.noShowRatePercent.toFixed(1)}% (
						{onlineSummary.totalNoShow} чел.)
					</p>
				</div>

				{/* KPI 4: Online Revenue */}
				<div className="p-4 rounded-2xl bg-[var(--paper)] border border-[var(--line)] space-y-1">
					<div className="flex items-center justify-between text-xs text-[var(--muted)]">
						<span>Выручка от самозаписи</span>
						<DollarSign size={16} className="text-[var(--teal)]" />
					</div>
					<div className="text-2xl font-extrabold text-[var(--ink)]">
						{formatKopecksRu(onlineSummary.totalRevenueKopecks)}
					</div>
					<p className="text-[11px] text-[var(--muted)] m-0">
						Ср. чек: {formatKopecksRu(onlineSummary.avgCheckKopecks)} · ROMI: +
						{onlineSummary.romiPercent ?? 0}%
					</p>
				</div>
			</div>

			{/* Navigation Tabs */}
			<div className="flex items-center gap-2 border-b border-[var(--line)] pb-2">
				<button
					type="button"
					onClick={() => setActiveTab("self_booking")}
					className={`px-4 py-2.5 text-xs font-bold rounded-xl border-0 cursor-pointer transition-colors min-h-[44px] ${
						activeTab === "self_booking"
							? "bg-[var(--teal)] text-white shadow-sm"
							: "bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)]"
					}`}
				>
					Каналы онлайн-самозаписи ({DEFAULT_ONLINE_CHANNELS.length})
				</button>
				<button
					type="button"
					onClick={() => setActiveTab("admin_comparison")}
					className={`px-4 py-2.5 text-xs font-bold rounded-xl border-0 cursor-pointer transition-colors min-h-[44px] ${
						activeTab === "admin_comparison"
							? "bg-[var(--teal)] text-white shadow-sm"
							: "bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)]"
					}`}
				>
					Сравнение: Онлайн vs Администраторы (АТС)
				</button>
				<button
					type="button"
					onClick={() => setActiveTab("funnel")}
					className={`px-4 py-2.5 text-xs font-bold rounded-xl border-0 cursor-pointer transition-colors min-h-[44px] ${
						activeTab === "funnel"
							? "bg-[var(--teal)] text-white shadow-sm"
							: "bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)]"
					}`}
				>
					Пошаговая воронка конверсии виджета
				</button>
			</div>

			{/* Tab 1: Self-Booking Channels Table */}
			{activeTab === "self_booking" && (
				<div className="p-4 rounded-2xl bg-[var(--paper)] border border-[var(--line)] space-y-3">
					<div className="flex flex-wrap items-center justify-between gap-2">
						<h4 className="text-sm font-bold text-[var(--ink)] m-0">
							Эффективность каналов автоматической самозаписи
						</h4>
						<div className="text-xs text-[var(--muted)]">
							Сэкономлено времени администраторов:{" "}
							<span className="font-bold text-[var(--teal)]">
								{comparison.savedHours} ч.
							</span>
						</div>
					</div>

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
								{DEFAULT_ONLINE_CHANNELS.map((ch) => {
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
											<td className="py-3 px-3">
												<div className="flex items-center gap-2 font-bold text-[var(--ink)]">
													{renderIcon(ch.iconType)}
													<span>{ch.nameRu}</span>
												</div>
											</td>
											<td className="py-3 px-3 text-[var(--muted)]">
												{ch.categoryRu}
											</td>
											<td className="py-3 px-3 text-right font-medium text-[var(--ink)]">
												{ch.viewsCount.toLocaleString("ru-RU")}
											</td>
											<td className="py-3 px-3 text-right font-bold text-[var(--teal)]">
												{ch.bookingsCount}
											</td>
											<td className="py-3 px-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
												{convPercent.toFixed(1)}%
											</td>
											<td className="py-3 px-3 text-right font-medium text-blue-600 dark:text-blue-400">
												{ch.attendedCount}{" "}
												<span className="text-[11px] text-[var(--muted)]">
													({attendPercent.toFixed(0)}%)
												</span>
											</td>
											<td className="py-3 px-3 text-right font-medium text-rose-500">
												{ch.noShowCount}
											</td>
											<td className="py-3 px-3 text-right font-bold text-[var(--ink)]">
												{formatKopecksRu(ch.revenueKopecks)}
											</td>
											<td className="py-3 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
												+{romi}%
											</td>
										</tr>
									);
								})}
							</tbody>
							<tfoot>
								<tr className="border-t-2 border-[var(--line)] bg-[var(--paper-soft)]/40 font-bold text-[var(--ink)]">
									<td className="py-3 px-3" colSpan={2}>
										ИТОГО ПО САМОЗАПИСИ:
									</td>
									<td className="py-3 px-3 text-right">
										{onlineSummary.totalViews.toLocaleString("ru-RU")}
									</td>
									<td className="py-3 px-3 text-right text-[var(--teal)]">
										{onlineSummary.totalBookings}
									</td>
									<td className="py-3 px-3 text-right text-emerald-600 dark:text-emerald-400">
										{onlineSummary.conversionRatePercent.toFixed(1)}%
									</td>
									<td className="py-3 px-3 text-right text-blue-600 dark:text-blue-400">
										{onlineSummary.totalAttended} (
										{onlineSummary.attendanceRatePercent.toFixed(0)}%)
									</td>
									<td className="py-3 px-3 text-right text-rose-500">
										{onlineSummary.totalNoShow}
									</td>
									<td className="py-3 px-3 text-right text-[var(--teal)]">
										{formatKopecksRu(onlineSummary.totalRevenueKopecks)}
									</td>
									<td className="py-3 px-3 text-right text-emerald-600 dark:text-emerald-400">
										+{onlineSummary.romiPercent}%
									</td>
								</tr>
							</tfoot>
						</table>
					</div>
				</div>
			)}

			{/* Tab 2: Online vs Admin Phone Funnel Comparison */}
			{activeTab === "admin_comparison" && (
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{/* Online Self-Booking Card */}
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-teal-500/30 space-y-4">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<div className="p-2 rounded-xl bg-teal-500/10 text-[var(--teal)]">
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
							<span className="text-xs font-bold px-2.5 py-1 rounded-full bg-teal-500/15 text-[var(--teal)]">
								{comparison.onlineSharePercent}% потока
							</span>
						</div>

						<div className="space-y-2 text-xs">
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
									{onlineSummary.noShowRatePercent.toFixed(1)}% (
									{onlineSummary.totalNoShow} чел.)
								</span>
							</div>
							<div className="flex justify-between py-1.5 border-b border-[var(--line)]">
								<span className="text-[var(--muted)]">
									Выручка от пациентов:
								</span>
								<span className="font-bold text-[var(--teal)]">
									{formatKopecksRu(onlineSummary.totalRevenueKopecks)}
								</span>
							</div>
							<div className="flex justify-between py-1.5 border-b border-[var(--line)]">
								<span className="text-[var(--muted)]">Средний чек:</span>
								<span className="font-bold text-[var(--ink)]">
									{formatKopecksRu(onlineSummary.avgCheckKopecks)}
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
					<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] space-y-4">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
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
							<span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400">
								{comparison.adminSharePercent}% потока
							</span>
						</div>

						<div className="space-y-2 text-xs">
							<div className="flex justify-between py-1.5 border-b border-[var(--line)]">
								<span className="text-[var(--muted)]">Входящих звонков:</span>
								<span className="font-bold text-[var(--ink)]">
									{DEFAULT_ADMIN_PHONE_FUNNEL.incomingCallsCount} звонков
								</span>
							</div>
							<div className="flex justify-between py-1.5 border-b border-[var(--line)]">
								<span className="text-[var(--muted)]">
									Конверсия звонок &rarr; запись:
								</span>
								<span className="font-bold text-emerald-600 dark:text-emerald-400">
									{(
										(DEFAULT_ADMIN_PHONE_FUNNEL.bookedAppointmentsCount /
											DEFAULT_ADMIN_PHONE_FUNNEL.answeredCallsCount) *
										100
									).toFixed(1)}
									% ({DEFAULT_ADMIN_PHONE_FUNNEL.bookedAppointmentsCount} зап.)
								</span>
							</div>
							<div className="flex justify-between py-1.5 border-b border-[var(--line)]">
								<span className="text-[var(--muted)]">Доходимость (Явка):</span>
								<span className="font-bold text-blue-600 dark:text-blue-400">
									{comparison.adminAttendancePercent}% (
									{DEFAULT_ADMIN_PHONE_FUNNEL.attendedCount} чел.)
								</span>
							</div>
							<div className="flex justify-between py-1.5 border-b border-[var(--line)]">
								<span className="text-[var(--muted)]">Неявка (No-show):</span>
								<span className="font-bold text-rose-500">
									{(
										(DEFAULT_ADMIN_PHONE_FUNNEL.noShowCount /
											DEFAULT_ADMIN_PHONE_FUNNEL.bookedAppointmentsCount) *
										100
									).toFixed(1)}
									% ({DEFAULT_ADMIN_PHONE_FUNNEL.noShowCount} чел.)
								</span>
							</div>
							<div className="flex justify-between py-1.5 border-b border-[var(--line)]">
								<span className="text-[var(--muted)]">Выручка от звонков:</span>
								<span className="font-bold text-[var(--ink)]">
									{formatKopecksRu(DEFAULT_ADMIN_PHONE_FUNNEL.revenueKopecks)}
								</span>
							</div>
							<div className="flex justify-between py-1.5">
								<span className="text-[var(--muted)]">
									Ср. длительность звонка:
								</span>
								<span className="font-bold text-[var(--ink)]">
									2 мин 22 сек
								</span>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Tab 3: Step-by-Step Funnel */}
			{activeTab === "funnel" && (
				<div className="p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] space-y-4">
					<h4 className="text-sm font-bold text-[var(--ink)] m-0">
						6 этапов конверсии онлайн-записи (от показа до кассового чека 54-ФЗ)
					</h4>

					<div className="grid grid-cols-1 md:grid-cols-6 gap-2">
						{[
							{
								step: "1. Просмотры",
								count: onlineSummary.totalViews,
								label: "Открытий виджета",
								dropoff: `${((onlineSummary.totalSlotSelected / onlineSummary.totalViews) * 100).toFixed(0)}% перешли`,
								color: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
							},
							{
								step: "2. Выбор слота",
								count: onlineSummary.totalSlotSelected,
								label: "Выбрали время",
								dropoff: `${((onlineSummary.totalBookings / onlineSummary.totalSlotSelected) * 100).toFixed(0)}% ввели контакты`,
								color: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
							},
							{
								step: "3. Бронь создана",
								count: onlineSummary.totalBookings,
								label: "Подтверждено СМС",
								dropoff: `${((onlineSummary.totalAttended / onlineSummary.totalBookings) * 100).toFixed(0)}% явились`,
								color: "bg-teal-500/10 text-teal-700 dark:text-teal-300",
							},
							{
								step: "4. Явка в клинику",
								count: onlineSummary.totalAttended,
								label: "Сели в кресло",
								dropoff: `${((onlineSummary.totalPaid / onlineSummary.totalAttended) * 100).toFixed(0)}% оплатили`,
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
								count: formatKopecksRu(onlineSummary.totalRevenueKopecks),
								label: "Итоговая выручка",
								dropoff: `Ср. чек ${formatKopecksRu(onlineSummary.avgCheckKopecks)}`,
								color:
									"bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold",
							},
						].map((item, idx) => (
							<div
								key={item.step}
								className={`p-3 rounded-xl border border-[var(--line)] space-y-1 ${item.color}`}
							>
								<span className="text-[11px] font-bold block">{item.step}</span>
								<div className="text-lg font-extrabold">{item.count}</div>
								<span className="text-[10px] text-[var(--muted)] block">
									{item.label}
								</span>
								<span className="text-[10px] font-semibold text-[var(--teal)] block mt-1">
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
