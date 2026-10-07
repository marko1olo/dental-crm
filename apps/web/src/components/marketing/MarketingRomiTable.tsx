/**
 * MarketingRomiTable.tsx — Таблица эффективности рекламных каналов (ROMI) для владельца стоматологии.
 *
 * СТРУКТУРА:
 *   «Канал рекламы -> Потрачено (₽) -> Приведено первичных -> Выручка (₽) -> ROMI (%) -> CAC (₽)»
 *
 * ФОРМУЛА:
 *   ROMI (%) = ((Выручка - Потрачено) / Потрачено) * 100%
 *   CAC (₽)  = Потрачено / Приведено первичных
 *
 * МАНДАТ:
 * - Никаких абстрактных 3-летних LTV графиков или 3D симуляций.
 * - Чистые копеечные расчеты.
 * - Удобное редактирование затрат, пациентов и выручки прямо в таблице.
 */

import React, { useEffect, useMemo, useState } from "react";
import {
	BarChart3,
	CheckCircle2,
	HelpCircle,
	Plus,
	RotateCcw,
	Sparkles,
} from "lucide-react";
import {
	type AdvertisingChannelInput,
	type AdvertisingChannelMetric,
	buildAdvertisingChannelMetric,
	calculateMarketingRomiSummary,
	aggregateCrmMarketingMetrics,
} from "@dental/shared";
import { safeLocalStorageGetItem, safeLocalStorageSetItem } from "../../lib/safeLocalStorage.js";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext.js";
import {
	DEFAULT_STOMX_CHANNELS,
	STORAGE_KEY,
} from "./marketingRomiPresets.js";
import { MarketingRomiKpiStrip } from "./MarketingRomiKpiStrip.js";
import { MarketingRomiAddChannelForm } from "./MarketingRomiAddChannelForm.js";
import { MarketingRomiEmptyState } from "./MarketingRomiEmptyState.js";
import {
	MarketingRomiTableRow,
	type RomiFieldKey,
} from "./MarketingRomiTableRow.js";
import { MarketingRomiTableFooter } from "./MarketingRomiTableFooter.js";
import "./marketingRomi.css";

export function MarketingRomiTable() {
	const appLogic = useOptionalAppLogicContext();
	const [syncMessage, setSyncMessage] = useState<string | null>(null);

	// Channels state loaded from safe storage (defaulting to standard StomX catalog with zeroed balances)
	const [channels, setChannels] = useState<AdvertisingChannelInput[]>(() => {
		try {
			const saved = safeLocalStorageGetItem(STORAGE_KEY);
			if (saved) {
				const parsed = JSON.parse(saved);
				if (Array.isArray(parsed) && parsed.length > 0) {
					return parsed as AdvertisingChannelInput[];
				}
			}
		} catch {
			// Fall back to default StomX preset
		}
		return [...DEFAULT_STOMX_CHANNELS];
	});

	// Local draft state for table inputs to avoid forced snapback to 0 while typing
	const [draftInputs, setDraftInputs] = useState<Record<string, string>>({});

	// New channel creation modal/form state
	const [isAddingChannel, setIsAddingChannel] = useState(false);

	// Save helper
	const persistChannels = (updated: AdvertisingChannelInput[]) => {
		setChannels(updated);
		safeLocalStorageSetItem(STORAGE_KEY, JSON.stringify(updated));
	};

	// Calculated metrics and summary totals
	const calculatedMetrics: AdvertisingChannelMetric[] = useMemo(() => {
		return channels.map(buildAdvertisingChannelMetric);
	}, [channels]);

	const summary = useMemo(() => {
		return calculateMarketingRomiSummary(calculatedMetrics);
	}, [calculatedMetrics]);

	// In-place channel field update
	const handleUpdateField = (
		channelId: string,
		field: RomiFieldKey,
		rawValue: string,
	) => {
		const num = Math.max(0, parseFloat(rawValue) || 0);
		const updated = channels.map((ch) => {
			if (ch.id !== channelId) return ch;
			if (field === "spentRub") {
				return { ...ch, spentKopecks: Math.round(num * 100) };
			}
			if (field === "leads") {
				return { ...ch, leadsCount: Math.round(num) };
			}
			if (field === "patients") {
				return { ...ch, primaryPatientsCount: Math.round(num) };
			}
			if (field === "revenueRub") {
				return { ...ch, revenueKopecks: Math.round(num * 100) };
			}
			if (field === "repeatVisits") {
				return { ...ch, repeatVisitsCount: Math.round(num) };
			}
			return ch;
		});
		persistChannels(updated);
	};

	const getInputValue = (
		channelId: string,
		field: RomiFieldKey,
		defaultValue: string,
	) => {
		const key = `${channelId}_${field}`;
		return draftInputs[key] !== undefined ? draftInputs[key] : defaultValue;
	};

	const handleInputChange = (
		channelId: string,
		field: RomiFieldKey,
		rawValue: string,
	) => {
		const key = `${channelId}_${field}`;
		setDraftInputs((prev) => ({ ...prev, [key]: rawValue }));
		if (rawValue.trim() !== "") {
			handleUpdateField(channelId, field, rawValue);
		}
	};

	const handleInputBlur = (
		channelId: string,
		field: RomiFieldKey,
	) => {
		const key = `${channelId}_${field}`;
		const rawValue = draftInputs[key];
		if (rawValue !== undefined) {
			handleUpdateField(channelId, field, rawValue);
			setDraftInputs((prev) => {
				const next = { ...prev };
				delete next[key];
				return next;
			});
		}
	};

	const handleSaveNewChannel = (newEntry: AdvertisingChannelInput) => {
		const updated = [...channels, newEntry];
		persistChannels(updated);
		setIsAddingChannel(false);
	};

	const handleRemoveChannel = (channelId: string) => {
		const updated = channels.filter((ch) => ch.id !== channelId);
		persistChannels(updated);
	};

	const handleResetDefaults = () => {
		persistChannels([...DEFAULT_STOMX_CHANNELS]);
		setSyncMessage(null);
	};

	const handleSyncWithCrmLocal = () => {
		const patients = (appLogic?.dashboard?.patients ?? []) as any[];
		const appointments = (appLogic?.dashboard?.appointments ?? []) as any[];
		const payments = (appLogic?.dashboard?.payments ?? []) as any[];
		const communicationEvents = (appLogic?.dashboard?.communicationEvents ?? []) as any[];

		// Preserve custom budgets set by user in current channels
		const customBudgetsKopecks: Record<string, number> = {};
		for (const ch of channels) {
			if (ch.spentKopecks > 0) {
				customBudgetsKopecks[ch.channelKey] = ch.spentKopecks;
			}
		}

		const aggregated = aggregateCrmMarketingMetrics({
			patients,
			appointments,
			payments,
			communicationEvents,
			customBudgetsKopecks,
		});

		persistChannels(aggregated);
		const msg = `Синхронизировано с CRM: учтено ${patients.length} пациентов, ${appointments.length} приемов, ${payments.length} оплат`;
		setSyncMessage(msg);
	};

	const fetchServerAttribution = async () => {
		try {
			const headers = appLogic?.auth && typeof appLogic.auth.denteClinicalReadHeaders === "function"
				? appLogic.auth.denteClinicalReadHeaders()
				: {};
			const res = await fetch("/api/marketing/attribution", { headers });
			if (res.ok) {
				const data = await res.json();
				if (Array.isArray(data?.selfBookingChannels) && data.selfBookingChannels.length > 0) {
					const customBudgetsKopecks: Record<string, number> = {};
					for (const ch of channels) {
						if (ch.spentKopecks > 0) {
							customBudgetsKopecks[ch.channelKey] = ch.spentKopecks;
						}
					}

					const serverChannels: AdvertisingChannelInput[] = data.selfBookingChannels.map((c: any) => ({
						id: `ch-${c.key}`,
						channelKey: c.key,
						nameRu: c.nameRu,
						categoryRu: c.categoryRu,
						spentKopecks: customBudgetsKopecks[c.key] ?? Number(c.spentKopecks || 0),
						leadsCount: Number(c.viewsCount || 0),
						primaryPatientsCount: Number(c.paidPatientsCount || c.attendedCount || 0),
						revenueKopecks: Number(c.revenueKopecks || 0),
						repeatVisitsCount: Math.max(0, Number(c.attendedCount || 0) - Number(c.paidPatientsCount || 0)),
						notes: `Сквозная аналитика Fastify: записей ${c.bookingsCount}, явка ${c.attendedCount}`,
					}));

					if (data.telephonyAdminFunnel) {
						const tf = data.telephonyAdminFunnel;
						serverChannels.push({
							id: "ch-telephony",
							channelKey: "telephony",
							nameRu: "Телефония регистратуры (Звонки)",
							categoryRu: "Коллтрекинг",
							spentKopecks: customBudgetsKopecks.telephony ?? Number(tf.spentKopecks || 0),
							leadsCount: Number(tf.incomingCallsCount || 0),
							primaryPatientsCount: Number(tf.paidPatientsCount || tf.attendedCount || 0),
							revenueKopecks: Number(tf.revenueKopecks || 0),
							repeatVisitsCount: Math.max(0, Number(tf.attendedCount || 0) - Number(tf.paidPatientsCount || 0)),
							notes: `Звонков: ${tf.incomingCallsCount}, конверсия в запись: ${tf.conversionCallToBookingPercent}%`,
						});
					}

					persistChannels(serverChannels);
					const revRub = data.summary?.totalOnlineRevenueKopecks
						? (data.summary.totalOnlineRevenueKopecks / 100).toLocaleString("ru-RU")
						: "0";
					const msg = `Сквозная аналитика (GET /api/marketing/attribution): ${serverChannels.length} каналов, общая выручка онлайн ${revRub} ₽`;
					setSyncMessage(msg);
					return;
				}
			}
		} catch (err) {
			console.warn("[MarketingRomiTable] Server attribution fetch error, falling back:", err);
		}
		// Fallback to local CRM aggregation
		handleSyncWithCrmLocal();
	};

	const handleSyncWithCrm = () => {
		fetchServerAttribution();
	};

	useEffect(() => {
		fetchServerAttribution();
	}, []);

	return (
		<section
			className="marketing-romi-card"
			aria-label="Окупаемость рекламы и каналов привлечения (ROMI)"
			data-testid="marketing-romi-table-section"
		>
			{/* HEADER & EXECUTIVE STRIP */}
			<div className="marketing-romi-header">
				<div>
					<div className="marketing-romi-title-row">
						<BarChart3 className="text-[var(--teal)]" aria-hidden="true" />
						<h3 className="marketing-romi-title">
							Эффективность рекламы и окупаемость каналов (ROMI)
						</h3>
					</div>
					<p className="marketing-romi-subtitle">
						Сводная таблица для владельца: реальные затраты, первичные и повторные пациенты, LTV выручка и чистый возврат инвестиций (ROMI).
					</p>
				</div>

				<div className="marketing-romi-header-actions">
					<button
						type="button"
						className="romi-action-btn secondary"
						onClick={handleSyncWithCrm}
						title="Синхронизировать показатели с живой базой CRM"
						data-testid="romi-sync-crm-btn"
					>
						<Sparkles className="w-3.5 h-3.5 text-[var(--teal)]" aria-hidden="true" />
						Синхронизировать с CRM
					</button>
					<button
						type="button"
						className="romi-action-btn secondary"
						onClick={handleResetDefaults}
						title="Восстановить типовые каналы"
					>
						<RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
						Сброс
					</button>
					<button
						type="button"
						className="romi-action-btn primary"
						onClick={() => setIsAddingChannel(!isAddingChannel)}
					>
						<Plus className="w-3.5 h-3.5" aria-hidden="true" />
						Добавить канал
					</button>
				</div>
			</div>

			{/* CRM SYNC NOTIFICATION BANNER */}
			{syncMessage && (
				<div className="romi-sync-banner" data-testid="romi-sync-banner">
					<CheckCircle2 className="w-4 h-4 text-[var(--teal)] flex-shrink-0" aria-hidden="true" />
					<span>{syncMessage}</span>
				</div>
			)}

			{/* KPI STATS STRIP */}
			<MarketingRomiKpiStrip summary={summary} />

			{/* ADD CHANNEL INLINE FORM */}
			{isAddingChannel && (
				<MarketingRomiAddChannelForm
					channelsCount={channels.length}
					onSaveChannel={handleSaveNewChannel}
					onCancel={() => setIsAddingChannel(false)}
				/>
			)}

			{/* MAIN OWNER ROMI TABLE OR HONEST EMPTY STATE */}
			{channels.length === 0 && !isAddingChannel ? (
				<MarketingRomiEmptyState
					onAddChannel={() => setIsAddingChannel(true)}
					onSyncWithCrm={handleSyncWithCrm}
					onResetDefaults={handleResetDefaults}
				/>
			) : (
				<div className="romi-table-container">
					<table className="romi-table" data-testid="romi-table">
						<thead>
							<tr>
								<th className="text-left">Канал рекламы</th>
								<th className="text-right">Потрачено (₽)</th>
								<th className="text-center">Лиды (чел)</th>
								<th className="text-center">Доходимость</th>
								<th className="text-center">Первичных</th>
								<th className="text-right">Выручка (₽)</th>
								<th className="text-right">Ср. чек (₽)</th>
								<th className="text-center">Повторных</th>
								<th className="text-center">Доля повт. (%)</th>
								<th className="text-right">LTV (₽)</th>
								<th className="text-center">ROMI (%)</th>
								<th className="text-right">CAC (₽ / чел)</th>
								<th className="text-center w-12"></th>
							</tr>
						</thead>
						<tbody>
							{calculatedMetrics.map((metric) => (
								<MarketingRomiTableRow
									key={metric.id}
									metric={metric}
									getInputValue={getInputValue}
									onInputChange={handleInputChange}
									onInputBlur={handleInputBlur}
									onRemoveChannel={handleRemoveChannel}
								/>
							))}
						</tbody>
						<MarketingRomiTableFooter summary={summary} />
					</table>
				</div>
			)}

			{/* EXPLANATORY HINT */}
			<div className="romi-footer-hint">
				<HelpCircle className="w-4 h-4 flex-shrink-0 text-[var(--teal)]" aria-hidden="true" />
				<p>
					<strong>Справочник каналов:</strong> 10 типовых каналов (2GIS, Яндекс Карты, ПроДокторов, Сарафанное радио, СберЗдоровье, ВКонтакте, Наружная реклама, Сайт, Инстаграм, Листовки). Кнопка «Синхронизировать с CRM» автоматически рассчитывает доходимость, первичных и повторных пациентов, выручку и LTV по реальным медицинским картам и чекам оплат клиники.
				</p>
			</div>
		</section>
	);
}
