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

import React, { useMemo, useState } from "react";
import {
	BarChart3,
	CheckCircle2,
	DollarSign,
	HelpCircle,
	Plus,
	RotateCcw,
	Sparkles,
	Trash2,
	TrendingDown,
	TrendingUp,
	Users,
} from "lucide-react";
import {
	type AdvertisingChannelInput,
	type AdvertisingChannelMetric,
	buildAdvertisingChannelMetric,
	calculateMarketingRomiSummary,
	STOMX_MARKETING_SOURCES,
	buildStomxDefaultAdvertisingChannels,
	aggregateCrmMarketingMetrics,
	type StomxMarketingSourceItem,
} from "@dental/shared";
import { safeLocalStorageGetItem, safeLocalStorageSetItem } from "../../lib/safeLocalStorage";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";
import "./marketingRomi.css";

const STORAGE_KEY = "dental_crm_mkt_romi_channels_v3";

const DEFAULT_STOMX_CHANNELS: AdvertisingChannelInput[] = [
	{
		id: "ch_stomx_gis2",
		channelKey: "gis2",
		nameRu: "2GIS",
		categoryRu: "Гео-сервисы",
		spentKopecks: 0,
		leadsCount: 0,
		primaryPatientsCount: 0,
		repeatVisitsCount: 0,
		revenueKopecks: 0,
		totalLtvRevenueKopecks: 0,
		notes: "Картографический справочник 2ГИС: гео-профиль клиники и кнопка онлайн-записи",
	},
	{
		id: "ch_stomx_yandex_maps",
		channelKey: "yandex_maps",
		nameRu: "Яндекс Карты",
		categoryRu: "Гео-сервисы",
		spentKopecks: 0,
		leadsCount: 0,
		primaryPatientsCount: 0,
		repeatVisitsCount: 0,
		revenueKopecks: 0,
		totalLtvRevenueKopecks: 0,
		notes: "Гео-приоритет клиники в Яндекс Картах и Навигаторе с синей меткой",
	},
	{
		id: "ch_stomx_prodoctorov",
		channelKey: "prodoctorov",
		nameRu: "ПроДокторов",
		categoryRu: "Мед-агрегаторы",
		spentKopecks: 0,
		leadsCount: 0,
		primaryPatientsCount: 0,
		repeatVisitsCount: 0,
		revenueKopecks: 0,
		totalLtvRevenueKopecks: 0,
		notes: "Профили ведущих врачей на медицинском портале отзывов ПроДокторов",
	},
	{
		id: "ch_stomx_word_of_mouth",
		channelKey: "word_of_mouth",
		nameRu: "Сарафанное радио",
		categoryRu: "Органика",
		spentKopecks: 0,
		leadsCount: 0,
		primaryPatientsCount: 0,
		repeatVisitsCount: 0,
		revenueKopecks: 0,
		totalLtvRevenueKopecks: 0,
		notes: "Рекомендации постоянных пациентов, членов семьи и знакомых (0 ₽ бюджет)",
	},
	{
		id: "ch_stomx_sberhealth",
		channelKey: "sberhealth",
		nameRu: "СберЗдоровье",
		categoryRu: "Мед-агрегаторы",
		spentKopecks: 0,
		leadsCount: 0,
		primaryPatientsCount: 0,
		repeatVisitsCount: 0,
		revenueKopecks: 0,
		totalLtvRevenueKopecks: 0,
		notes: "Записи пациентов через экосистему медицинских сервисов СберЗдоровье (DocDoc)",
	},
	{
		id: "ch_stomx_vk",
		channelKey: "vk",
		nameRu: "ВКонтакте",
		categoryRu: "Соцсети",
		spentKopecks: 0,
		leadsCount: 0,
		primaryPatientsCount: 0,
		repeatVisitsCount: 0,
		revenueKopecks: 0,
		totalLtvRevenueKopecks: 0,
		notes: "Таргетированная реклама и официальное сообщество клиники ВКонтакте",
	},
	{
		id: "ch_stomx_outdoor",
		channelKey: "outdoor",
		nameRu: "Наружная реклама",
		categoryRu: "Наружная реклама",
		spentKopecks: 0,
		leadsCount: 0,
		primaryPatientsCount: 0,
		repeatVisitsCount: 0,
		revenueKopecks: 0,
		totalLtvRevenueKopecks: 0,
		notes: "Фасадная световая вывеска, панель-кронштейн и указатели",
	},
	{
		id: "ch_stomx_website",
		channelKey: "website",
		nameRu: "Сайт",
		categoryRu: "Сайт / SEO",
		spentKopecks: 0,
		leadsCount: 0,
		primaryPatientsCount: 0,
		repeatVisitsCount: 0,
		revenueKopecks: 0,
		totalLtvRevenueKopecks: 0,
		notes: "Официальный сайт стоматологии, поисковое SEO-продвижение и веб-виджет",
	},
	{
		id: "ch_stomx_instagram",
		channelKey: "instagram",
		nameRu: "Инстаграм",
		categoryRu: "Соцсети",
		spentKopecks: 0,
		leadsCount: 0,
		primaryPatientsCount: 0,
		repeatVisitsCount: 0,
		revenueKopecks: 0,
		totalLtvRevenueKopecks: 0,
		notes: "Клинические кейсы до/после, сторис и запись через директ Инстаграм",
	},
	{
		id: "ch_stomx_flyers",
		channelKey: "flyers",
		nameRu: "Листовки",
		categoryRu: "Полиграфия",
		spentKopecks: 0,
		leadsCount: 0,
		primaryPatientsCount: 0,
		repeatVisitsCount: 0,
		revenueKopecks: 0,
		totalLtvRevenueKopecks: 0,
		notes: "Печатные промо-листовки, буклеты в жилые комплексы и партнерские стойки",
	},
];

const QUICK_CHANNEL_PRESETS = [
	{ channelKey: "gis2", nameRu: "2GIS", categoryRu: "Гео-сервисы", spentRub: 0, leadsCount: 0, patients: 0, repeatVisits: 0, revenueRub: 0 },
	{ channelKey: "yandex_maps", nameRu: "Яндекс Карты", categoryRu: "Гео-сервисы", spentRub: 0, leadsCount: 0, patients: 0, repeatVisits: 0, revenueRub: 0 },
	{ channelKey: "prodoctorov", nameRu: "ПроДокторов", categoryRu: "Мед-агрегаторы", spentRub: 0, leadsCount: 0, patients: 0, repeatVisits: 0, revenueRub: 0 },
	{ channelKey: "word_of_mouth", nameRu: "Сарафанное радио", categoryRu: "Органика", spentRub: 0, leadsCount: 0, patients: 0, repeatVisits: 0, revenueRub: 0 },
	{ channelKey: "sberhealth", nameRu: "СберЗдоровье", categoryRu: "Мед-агрегаторы", spentRub: 0, leadsCount: 0, patients: 0, repeatVisits: 0, revenueRub: 0 },
	{ channelKey: "vk", nameRu: "ВКонтакте", categoryRu: "Соцсети", spentRub: 0, leadsCount: 0, patients: 0, repeatVisits: 0, revenueRub: 0 },
	{ channelKey: "outdoor", nameRu: "Наружная реклама", categoryRu: "Наружная реклама", spentRub: 0, leadsCount: 0, patients: 0, repeatVisits: 0, revenueRub: 0 },
	{ channelKey: "website", nameRu: "Сайт", categoryRu: "Сайт / SEO", spentRub: 0, leadsCount: 0, patients: 0, repeatVisits: 0, revenueRub: 0 },
	{ channelKey: "instagram", nameRu: "Инстаграм", categoryRu: "Соцсети", spentRub: 0, leadsCount: 0, patients: 0, repeatVisits: 0, revenueRub: 0 },
	{ channelKey: "flyers", nameRu: "Листовки", categoryRu: "Полиграфия", spentRub: 0, leadsCount: 0, patients: 0, repeatVisits: 0, revenueRub: 0 },
];

export function MarketingRomiTable() {
	const appLogic = useOptionalAppLogicContext();
	const [syncMessage, setSyncMessage] = useState<string | null>(null);

	// Channels state loaded from safe storage (empty by default to avoid fake procedural data)
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
			// Fall back to empty channels list
		}
		return [];
	});

	// New channel creation modal/form state
	const [isAddingChannel, setIsAddingChannel] = useState(false);
	const [newChannelName, setNewChannelName] = useState("");
	const [newChannelCategory, setNewChannelCategory] = useState("Таргет / Медиа");
	const [newChannelSpentRub, setNewChannelSpentRub] = useState("");
	const [newChannelLeads, setNewChannelLeads] = useState("");
	const [newChannelPatients, setNewChannelPatients] = useState("");
	const [newChannelRepeatVisits, setNewChannelRepeatVisits] = useState("");
	const [newChannelRevenueRub, setNewChannelRevenueRub] = useState("");

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
		field: "spentRub" | "leads" | "patients" | "revenueRub" | "repeatVisits",
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

	// 1-Click quick channel preset creation from canonical StomX
	const handleAddPreset = (preset: {
		channelKey: string;
		nameRu: string;
		categoryRu: string;
		spentRub: number;
		leadsCount: number;
		patients: number;
		repeatVisits: number;
		revenueRub: number;
	}) => {
		const newEntry: AdvertisingChannelInput = {
			id: `ch_preset_${Date.now()}_${channels.length + 1}`,
			channelKey: preset.channelKey,
			nameRu: preset.nameRu,
			categoryRu: preset.categoryRu,
			spentKopecks: Math.round(preset.spentRub * 100),
			leadsCount: preset.leadsCount,
			primaryPatientsCount: preset.patients,
			repeatVisitsCount: preset.repeatVisits,
			revenueKopecks: Math.round(preset.revenueRub * 100),
		};
		const updated = [...channels, newEntry];
		persistChannels(updated);
		setIsAddingChannel(false);
	};

	// Add custom channel
	const handleAddChannel = (e: React.FormEvent) => {
		e.preventDefault();
		if (!newChannelName.trim()) return;

		const spentRub = Math.max(0, parseFloat(newChannelSpentRub) || 0);
		const patients = Math.max(0, parseInt(newChannelPatients, 10) || 0);
		const leads = Math.max(patients, parseInt(newChannelLeads, 10) || Math.round(patients * 1.25));
		const repeatVisits = Math.max(0, parseInt(newChannelRepeatVisits, 10) || 0);
		const revenueRub = Math.max(0, parseFloat(newChannelRevenueRub) || 0);

		const newEntry: AdvertisingChannelInput = {
			id: `ch_custom_${Date.now()}`,
			channelKey: `custom_${Date.now()}`,
			nameRu: newChannelName.trim(),
			categoryRu: newChannelCategory.trim() || "Реклама",
			spentKopecks: Math.round(spentRub * 100),
			leadsCount: leads,
			primaryPatientsCount: patients,
			repeatVisitsCount: repeatVisits,
			revenueKopecks: Math.round(revenueRub * 100),
		};

		const updated = [...channels, newEntry];
		persistChannels(updated);

		// Reset form
		setNewChannelName("");
		setNewChannelSpentRub("");
		setNewChannelLeads("");
		setNewChannelPatients("");
		setNewChannelRepeatVisits("");
		setNewChannelRevenueRub("");
		setIsAddingChannel(false);
	};

	// Remove channel
	const handleRemoveChannel = (channelId: string) => {
		const updated = channels.filter((ch) => ch.id !== channelId);
		persistChannels(updated);
	};

	// Reset to standard StomX defaults
	const handleResetDefaults = () => {
		persistChannels([...DEFAULT_STOMX_CHANNELS]);
		setSyncMessage(null);
	};

	// 1-Click sync with live CRM database
	const handleSyncWithCrm = () => {
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
						<BarChart3 className="text-[var(--teal,#0f766e)]" aria-hidden="true" />
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
						<Sparkles className="w-3.5 h-3.5 text-[var(--teal,#0f766e)]" aria-hidden="true" />
						Синхронизировать с CRM
					</button>
					<button
						type="button"
						className="romi-action-btn secondary"
						onClick={handleResetDefaults}
						title="Восстановить канонические каналы StomX"
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
					<CheckCircle2 className="w-4 h-4 text-[var(--teal,#0f766e)] flex-shrink-0" aria-hidden="true" />
					<span>{syncMessage}</span>
				</div>
			)}

			{/* KPI STATS STRIP */}
			<div className="romi-kpi-grid">
				<div className="romi-kpi-item">
					<span className="romi-kpi-label">Потрачено на рекламу</span>
					<strong className="romi-kpi-value text-[var(--ink)]">
						{summary.totalSpentFormatted}
					</strong>
					<span className="romi-kpi-hint">Затраты за расчетный период</span>
				</div>

				<div className="romi-kpi-item">
					<span className="romi-kpi-label">Лиды и доходимость</span>
					<strong className="romi-kpi-value text-[var(--teal-dark,#0f766e)]">
						{summary.totalLeadsCount} лидов
					</strong>
					<span className="romi-kpi-hint">
						Доходимость: {summary.overallShowUpRatePercent}% ({summary.totalPrimaryPatientsCount} приемов)
					</span>
				</div>

				<div className="romi-kpi-item">
					<span className="romi-kpi-label">Выручка от первичных</span>
					<strong className="romi-kpi-value text-[var(--ink)]">
						{summary.totalRevenueFormatted}
					</strong>
					<span className="romi-kpi-hint">
						Ср. чек: {summary.overallAverageCheckFormatted}
					</span>
				</div>

				<div className="romi-kpi-item">
					<span className="romi-kpi-label">LTV и повторные визиты</span>
					<strong className="romi-kpi-value text-[var(--teal-dark,#0f766e)]">
						{summary.overallLtvFormatted}
					</strong>
					<span className="romi-kpi-hint">
						Повторных: {summary.totalRepeatVisitsCount} ({summary.overallRepeatRatePercent}%)
					</span>
				</div>

				<div className="romi-kpi-item highlight">
					<span className="romi-kpi-label">Общий ROMI клиники</span>
					<strong
						className={`romi-kpi-value ${
							(summary.overallRomiPercent ?? 0) >= 0 ? "text-[var(--teal-dark,#0f766e)]" : "text-[var(--danger,#e63946)]"
						}`}
					>
						{summary.overallRomiFormatted}
					</strong>
					<span className="romi-kpi-hint">
						Чистая прибыль: {summary.totalProfitFormatted}
					</span>
				</div>
			</div>

			{/* ADD CHANNEL INLINE FORM */}
			{isAddingChannel && (
				<form onSubmit={handleAddChannel} className="romi-add-form" data-testid="romi-add-form">
					<h4 className="romi-add-title">Добавление рекламного канала</h4>

					<div style={{ marginBottom: "12px" }}>
						<span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted, #64748b)", display: "block", marginBottom: "6px" }}>
							Быстрое добавление типового канала StomX (в 1 клик):
						</span>
						<div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
							{QUICK_CHANNEL_PRESETS.map((p) => (
								<button
									key={p.nameRu}
									type="button"
									onClick={() => handleAddPreset(p)}
									className="romi-action-btn secondary"
									style={{ fontSize: "11px", padding: "4px 10px", minHeight: "32px" }}
									title={`Добавить ${p.nameRu} (${p.categoryRu})`}
								>
									+ {p.nameRu}
								</button>
							))}
						</div>
					</div>

					<div className="romi-add-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))" }}>
						<div>
							<label className="romi-form-label">Название канала</label>
							<input
								type="text"
								required
								placeholder="Например: Telegram-канал района"
								value={newChannelName}
								onChange={(e) => setNewChannelName(e.target.value)}
								className="romi-input"
							/>
						</div>
						<div>
							<label className="romi-form-label">Категория</label>
							<input
								type="text"
								placeholder="Соцсети / Промо"
								value={newChannelCategory}
								onChange={(e) => setNewChannelCategory(e.target.value)}
								className="romi-input"
							/>
						</div>
						<div>
							<label className="romi-form-label">Потрачено (₽)</label>
							<input
								type="number"
								min="0"
								step="100"
								placeholder="0"
								value={newChannelSpentRub}
								onChange={(e) => setNewChannelSpentRub(e.target.value)}
								className="romi-input"
							/>
						</div>
						<div>
							<label className="romi-form-label">Лидов (чел)</label>
							<input
								type="number"
								min="0"
								step="1"
								placeholder="0"
								value={newChannelLeads}
								onChange={(e) => setNewChannelLeads(e.target.value)}
								className="romi-input"
							/>
						</div>
						<div>
							<label className="romi-form-label">Первичных (чел)</label>
							<input
								type="number"
								min="0"
								step="1"
								placeholder="0"
								value={newChannelPatients}
								onChange={(e) => setNewChannelPatients(e.target.value)}
								className="romi-input"
							/>
						</div>
						<div>
							<label className="romi-form-label">Повторных (чел)</label>
							<input
								type="number"
								min="0"
								step="1"
								placeholder="0"
								value={newChannelRepeatVisits}
								onChange={(e) => setNewChannelRepeatVisits(e.target.value)}
								className="romi-input"
							/>
						</div>
						<div>
							<label className="romi-form-label">Выручка (₽)</label>
							<input
								type="number"
								min="0"
								step="1000"
								placeholder="0"
								value={newChannelRevenueRub}
								onChange={(e) => setNewChannelRevenueRub(e.target.value)}
								className="romi-input"
							/>
						</div>
					</div>
					<div className="romi-add-actions">
						<button type="submit" className="romi-action-btn primary">
							Сохранить канал
						</button>
						<button
							type="button"
							className="romi-action-btn secondary"
							onClick={() => setIsAddingChannel(false)}
						>
							Отмена
						</button>
					</div>
				</form>
			)}

			{/* MAIN OWNER ROMI TABLE OR HONEST EMPTY STATE */}
			{channels.length === 0 && !isAddingChannel ? (
				<div className="romi-empty-container" data-testid="romi-empty-state">
					<div className="romi-empty-icon-wrap">
						<BarChart3 className="w-6 h-6 text-[var(--teal,#0f766e)]" aria-hidden="true" />
					</div>
					<h4 className="romi-empty-title">Нет данных о расходах по рекламным каналам</h4>
					<p className="romi-empty-desc">
						Добавьте используемые каналы привлечения пациентов клиники вручную, синхронизируйте показатели с визитами CRM или загрузите типовой справочник каналов StomX с нулевым балансом.
					</p>
					<div className="romi-empty-actions">
						<button
							type="button"
							className="romi-action-btn primary"
							onClick={() => setIsAddingChannel(true)}
						>
							<Plus className="w-3.5 h-3.5" aria-hidden="true" />
							Добавить первый канал
						</button>
						<button
							type="button"
							className="romi-action-btn secondary"
							onClick={handleSyncWithCrm}
						>
							<Sparkles className="w-3.5 h-3.5 text-[var(--teal,#0f766e)]" aria-hidden="true" />
							Загрузить из CRM
						</button>
						<button
							type="button"
							className="romi-action-btn secondary"
							onClick={handleResetDefaults}
							title="Загрузить стандартный справочник каналов StomX с нулевым балансом"
						>
							<RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
							Загрузить шаблон StomX
						</button>
					</div>
				</div>
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
						{calculatedMetrics.map((metric) => {
							const spentRub = (metric.spentKopecks / 100).toString();
							const revenueRub = (metric.revenueKopecks / 100).toString();

							return (
								<tr key={metric.id} className="romi-row" data-testid={`romi-row-${metric.id}`}>
									{/* Channel info */}
									<td className="romi-cell-channel">
										<div className="romi-channel-info">
											<strong className="romi-channel-name">{metric.nameRu}</strong>
											<span className="romi-channel-badge">{metric.categoryRu}</span>
										</div>
									</td>

									{/* Spend (editable) */}
									<td className="romi-cell-num">
										<div className="romi-cell-input-wrapper">
											<input
												type="number"
												min="0"
												step="500"
												value={spentRub}
												onChange={(e) =>
													handleUpdateField(metric.id, "spentRub", e.target.value)
												}
												aria-label={`Затраты на ${metric.nameRu}`}
												className="romi-table-input text-right"
											/>
										</div>
									</td>

									{/* Leads (editable) */}
									<td className="romi-cell-num">
										<div className="romi-cell-input-wrapper">
											<input
												type="number"
												min="0"
												step="1"
												value={metric.leadsCount.toString()}
												onChange={(e) =>
													handleUpdateField(metric.id, "leads", e.target.value)
												}
												aria-label={`Лиды ${metric.nameRu}`}
												className="romi-table-input text-center"
											/>
										</div>
									</td>

									{/* Show-up rate (calculated) */}
									<td className="romi-cell-center font-bold text-[var(--teal-dark,#0f766e)]">
										{metric.showUpRatePercent}%
									</td>

									{/* Primary patients (editable) */}
									<td className="romi-cell-num">
										<div className="romi-cell-input-wrapper">
											<input
												type="number"
												min="0"
												step="1"
												value={metric.primaryPatientsCount.toString()}
												onChange={(e) =>
													handleUpdateField(metric.id, "patients", e.target.value)
												}
												aria-label={`Первичные ${metric.nameRu}`}
												className="romi-table-input text-center"
											/>
										</div>
									</td>

									{/* Primary revenue (editable) */}
									<td className="romi-cell-num">
										<div className="romi-cell-input-wrapper">
											<input
												type="number"
												min="0"
												step="1000"
												value={revenueRub}
												onChange={(e) =>
													handleUpdateField(metric.id, "revenueRub", e.target.value)
												}
												aria-label={`Выручка ${metric.nameRu}`}
												className="romi-table-input text-right"
											/>
										</div>
									</td>

									{/* Average check (calculated) */}
									<td className="romi-cell-num text-right font-medium">
										{metric.averageCheckFormatted}
									</td>

									{/* Repeat visits (editable) */}
									<td className="romi-cell-num">
										<div className="romi-cell-input-wrapper">
											<input
												type="number"
												min="0"
												step="1"
												value={metric.repeatVisitsCount.toString()}
												onChange={(e) =>
													handleUpdateField(metric.id, "repeatVisits", e.target.value)
												}
												aria-label={`Повторные визиты ${metric.nameRu}`}
												className="romi-table-input text-center"
											/>
										</div>
									</td>

									{/* Repeat rate % */}
									<td className="romi-cell-center text-[var(--muted,#64748b)]">
										{metric.repeatRatePercent}%
									</td>

									{/* LTV revenue (calculated) */}
									<td className="romi-cell-num text-right font-semibold text-[var(--teal-dark,#0f766e)]">
										{metric.ltvFormatted}
									</td>

									{/* ROMI badge */}
									<td className="romi-cell-center">
										<span
											className={`romi-badge ${
												metric.romiStatus === "organic"
													? "organic"
													: metric.romiStatus === "super_profitable" ||
													    metric.romiStatus === "profitable"
													  ? "positive"
													  : metric.romiStatus === "loss"
													    ? "negative"
													    : "neutral"
											}`}
										>
											{metric.romiFormatted}
										</span>
									</td>

									{/* CAC */}
									<td className="romi-cell-num text-right font-medium text-[var(--muted,#64748b)]">
										{metric.cacFormatted}
									</td>

									{/* Delete action */}
									<td className="romi-cell-center">
										<button
											type="button"
											onClick={() => handleRemoveChannel(metric.id)}
											className="romi-delete-btn"
											title={`Удалить канал ${metric.nameRu}`}
											aria-label={`Удалить канал ${metric.nameRu}`}
										>
											<Trash2 className="w-4 h-4" aria-hidden="true" />
										</button>
									</td>
								</tr>
							);
						})}
					</tbody>

					{/* TOTALS SUMMARY FOOTER */}
					<tfoot>
						<tr className="romi-total-row">
							<td className="romi-total-title">
								ИТОГО ПО ВСЕМ КАНАЛАМ:
							</td>
							<td className="romi-total-num text-right">
								{summary.totalSpentFormatted}
							</td>
							<td className="romi-total-num text-center font-bold">
								{summary.totalLeadsCount} чел.
							</td>
							<td className="romi-total-center font-bold text-[var(--teal-dark,#0f766e)]">
								{summary.overallShowUpRatePercent}%
							</td>
							<td className="romi-total-num text-center font-bold">
								{summary.totalPrimaryPatientsCount} чел.
							</td>
							<td className="romi-total-num text-right font-bold text-[var(--teal-dark,#0f766e)]">
								{summary.totalRevenueFormatted}
							</td>
							<td className="romi-total-num text-right font-medium">
								{summary.overallAverageCheckFormatted}
							</td>
							<td className="romi-total-num text-center font-bold">
								{summary.totalRepeatVisitsCount} чел.
							</td>
							<td className="romi-total-center font-bold text-[var(--teal-dark,#0f766e)]">
								{summary.overallRepeatRatePercent}%
							</td>
							<td className="romi-total-num text-right font-bold text-[var(--teal-dark,#0f766e)]">
								{summary.overallLtvFormatted}
							</td>
							<td className="romi-total-center">
								<span
									className={`romi-badge total ${
										(summary.overallRomiPercent ?? 0) >= 0 ? "positive" : "negative"
									}`}
								>
									{summary.overallRomiFormatted}
								</span>
							</td>
							<td className="romi-total-num text-right">
								{summary.overallCacFormatted}
							</td>
							<td></td>
						</tr>
					</tfoot>
				</table>
			</div>
			)}

			{/* EXPLANATORY HINT */}
			<div className="romi-footer-hint">
				<HelpCircle className="w-4 h-4 flex-shrink-0 text-[var(--teal,#0f766e)]" aria-hidden="true" />
				<p>
					<strong>Справочник StomX:</strong> 10 канонических каналов (2GIS, Яндекс Карты, ПроДокторов, Сарафанное радио, СберЗдоровье, ВКонтакте, Наружная реклама, Сайт, Инстаграм, Листовки). Кнопка «Синхронизировать с CRM» автоматически рассчитывает доходимость, первичных и повторных пациентов, выручку и LTV по реальным медицинским картам и чекам оплат клиники.
				</p>
			</div>
		</section>
	);
}
