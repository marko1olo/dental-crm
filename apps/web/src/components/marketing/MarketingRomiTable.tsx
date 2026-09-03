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
	DEFAULT_DENTAL_ADVERTISING_CHANNELS,
} from "@dental/shared";
import { safeLocalStorageGetItem, safeLocalStorageSetItem } from "../../lib/safeLocalStorage";

const STORAGE_KEY = "dental_crm_mkt_romi_channels_v2";

const QUICK_CHANNEL_PRESETS = [
	{ nameRu: "Яндекс.Карты (Гео)", categoryRu: "Гео-сервисы", spentRub: 25000, leadsCount: 20, patients: 18, revenueRub: 210000 },
	{ nameRu: "2ГИС (Справочник)", categoryRu: "Гео-сервисы", spentRub: 18000, leadsCount: 15, patients: 12, revenueRub: 142000 },
	{ nameRu: "ПроДокторов / СберЗдоровье", categoryRu: "Мед-агрегаторы", spentRub: 15000, leadsCount: 11, patients: 9, revenueRub: 115000 },
	{ nameRu: "Telegram-канал клиники", categoryRu: "Мессенджеры", spentRub: 12000, leadsCount: 16, patients: 10, revenueRub: 95000 },
	{ nameRu: "ВКонтакте (Таргет района)", categoryRu: "Соцсети", spentRub: 22000, leadsCount: 14, patients: 8, revenueRub: 78000 },
	{ nameRu: "Сарафанное радио (Органика)", categoryRu: "Органика", spentRub: 0, leadsCount: 36, patients: 35, revenueRub: 580000 },
];

export function MarketingRomiTable() {
	// Channels state loaded from safe storage
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
			// Fall back to default preset
		}
		return [...DEFAULT_DENTAL_ADVERTISING_CHANNELS];
	});

	// New channel creation modal/form state
	const [isAddingChannel, setIsAddingChannel] = useState(false);
	const [newChannelName, setNewChannelName] = useState("");
	const [newChannelCategory, setNewChannelCategory] = useState("Таргет / Медиа");
	const [newChannelSpentRub, setNewChannelSpentRub] = useState("");
	const [newChannelLeads, setNewChannelLeads] = useState("");
	const [newChannelPatients, setNewChannelPatients] = useState("");
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
		field: "spentRub" | "leads" | "patients" | "revenueRub",
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
			return ch;
		});
		persistChannels(updated);
	};

	// 1-Click quick channel preset creation
	const handleAddPreset = (preset: {
		nameRu: string;
		categoryRu: string;
		spentRub: number;
		leadsCount: number;
		patients: number;
		revenueRub: number;
	}) => {
		const newEntry: AdvertisingChannelInput = {
			id: `ch_preset_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
			channelKey: `channel_${Date.now()}`,
			nameRu: preset.nameRu,
			categoryRu: preset.categoryRu,
			spentKopecks: Math.round(preset.spentRub * 100),
			leadsCount: preset.leadsCount,
			primaryPatientsCount: preset.patients,
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
		const revenueRub = Math.max(0, parseFloat(newChannelRevenueRub) || 0);

		const newEntry: AdvertisingChannelInput = {
			id: `ch_custom_${Date.now()}`,
			channelKey: `custom_${Date.now()}`,
			nameRu: newChannelName.trim(),
			categoryRu: newChannelCategory.trim() || "Реклама",
			spentKopecks: Math.round(spentRub * 100),
			leadsCount: leads,
			primaryPatientsCount: patients,
			revenueKopecks: Math.round(revenueRub * 100),
		};

		const updated = [...channels, newEntry];
		persistChannels(updated);

		// Reset form
		setNewChannelName("");
		setNewChannelSpentRub("");
		setNewChannelLeads("");
		setNewChannelPatients("");
		setNewChannelRevenueRub("");
		setIsAddingChannel(false);
	};

	// Remove channel
	const handleRemoveChannel = (channelId: string) => {
		const updated = channels.filter((ch) => ch.id !== channelId);
		persistChannels(updated);
	};

	// Reset to standard defaults
	const handleResetDefaults = () => {
		persistChannels([...DEFAULT_DENTAL_ADVERTISING_CHANNELS]);
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
						Сводная таблица для владельца: реальные затраты, количество первичных пациентов, выручка и чистый возврат инвестиций.
					</p>
				</div>

				<div className="marketing-romi-header-actions">
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
							Быстрое добавление типового канала (в 1 клик):
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

					<div className="romi-add-grid" style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr" }}>
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

			{/* MAIN OWNER ROMI TABLE */}
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

									{/* Patients (editable) */}
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
												aria-label={`Первичные пациенты ${metric.nameRu}`}
												className="romi-table-input text-center font-bold"
											/>
										</div>
									</td>

									{/* Revenue (editable) */}
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
												aria-label={`Выручка от ${metric.nameRu}`}
												className="romi-table-input text-right"
											/>
										</div>
									</td>

									{/* Average check */}
									<td className="romi-cell-num text-right font-medium text-[var(--ink)]">
										{metric.averageCheckFormatted}
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

			{/* EXPLANATORY HINT */}
			<div className="romi-footer-hint">
				<HelpCircle className="w-4 h-4 flex-shrink-0 text-[var(--teal,#0f766e)]" aria-hidden="true" />
				<p>
					<strong>Правило владельца:</strong> ROMI выше 300% означает высокоэффективный канал (на 1 ₽ вложений получено от 3 ₽ выручки). Для сарафанного радио затраты равны 0 ₽ (чистая органика с нулевой стоимостью привлечения CAC).
				</p>
			</div>
		</section>
	);
}
