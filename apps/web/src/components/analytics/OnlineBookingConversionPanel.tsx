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
import {
	Bot,
	DollarSign,
	TrendingUp,
	UserCheck,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import "./executiveDashboard.css";
import { OnlineBookingAdminComparison } from "./OnlineBookingAdminComparison";
import { OnlineBookingChannelsTable } from "./OnlineBookingChannelsTable";
import { OnlineBookingFunnelView } from "./OnlineBookingFunnelView";

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
	const [_loading, setLoading] = useState(false);

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
					// biome-ignore lint/suspicious/noExplicitAny: API shape
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

	return (
		<div className="space-y-4" data-testid="online-booking-conversion-panel">
			{/* Top Header & Controls */}
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

			{/* Top KPI Cards */}
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

			{/* Navigation Tabs */}
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

			{activeTab === "self_booking" && (
				<OnlineBookingChannelsTable
					channels={channels}
					selectedChannelKey={selectedChannelKey}
					onSelectChannelKey={setSelectedChannelKey}
					savedHours={comparison.savedHours}
					onlineSummary={onlineSummary}
				/>
			)}

			{activeTab === "admin_comparison" && (
				<OnlineBookingAdminComparison
					comparison={comparison}
					onlineSummary={onlineSummary}
					adminFunnel={adminFunnel}
				/>
			)}

			{activeTab === "funnel" && (
				<OnlineBookingFunnelView onlineSummary={onlineSummary} />
			)}
		</div>
	);
}

export default OnlineBookingConversionPanel;
