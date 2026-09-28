import { motion } from "framer-motion";
import {
	Award,
	BarChart3,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	Copy,
	DollarSign,
	Download,
	Flame,
	Sliders,
	Sparkles,
	TrendingUp,
	Users,
	X,
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { showToast } from "../GlobalToast";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import {
	type CanonicalMarketingChannelKey,
	type ChannelSpendMap,
	FUNNEL_PERIOD_OPTIONS,
	type FunnelLead,
	type FunnelTimePeriod,
	calculateFunnelAnalysis,
	exportFunnelReportCsv,
	exportFunnelReportSummaryText,
	getDefaultChannelSpendMap,
} from "./leadsFunnelEngine";
import { FunnelBudgetAdjuster } from "./FunnelBudgetAdjuster";
import { FunnelWaterfallSection } from "./FunnelWaterfallSection";
import { FunnelChannelsTableSection } from "./FunnelChannelsTableSection";

export interface LeadsFunnelAnalyticsModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly leads: readonly FunnelLead[];
}

export function LeadsFunnelAnalyticsModal({
	isOpen,
	onClose,
	leads,
}: LeadsFunnelAnalyticsModalProps) {
	// Selected time period
	const [period, setPeriod] = useState<FunnelTimePeriod>("all");

	// Channel spend customizations
	const [customSpends, setCustomSpends] = useState<ChannelSpendMap>(() =>
		getDefaultChannelSpendMap(),
	);
	const [isBudgetDrawerOpen, setIsBudgetDrawerOpen] = useState(false);

	// Collapsible analytics panels (Frontend Rule 3.1 & Mandate 8d)
	const [isWaterfallOpen, setIsWaterfallOpen] = useState(false);
	const [isChannelsTableOpen, setIsChannelsTableOpen] = useState(false);

	// Fetch live marketing attribution spends
	useEffect(() => {
		if (!isOpen) return;
		let cancelled = false;

		async function fetchLiveSpends() {
			try {
				const res = await fetch("/api/marketing/attribution", {
					headers: denteAdminSecretRequestHeaders(),
				});
				if (!res.ok) return;
				const data = await res.json();
				if (cancelled || !data) return;

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
					liveSpends.other = Math.round((data.telephonyAdminFunnel.spentKopecks || 0) / 100);
				}

				if (!cancelled && Object.keys(liveSpends).length > 0) {
					setCustomSpends((prev) => ({
						...prev,
						...liveSpends,
					}));
				}
			} catch {
				// Silently fallback to defaults
			}
		}

		fetchLiveSpends();
		return () => {
			cancelled = true;
		};
	}, [isOpen]);

	// Keyboard ESC listener
	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onClose();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	// Recalculate analysis
	const analysis = useMemo(() => {
		return calculateFunnelAnalysis(leads, period, customSpends);
	}, [leads, period, customSpends]);

	// Update individual channel budget
	const handleBudgetChange = (
		channelKey: CanonicalMarketingChannelKey,
		valueStr: string,
	) => {
		const num = Number(valueStr.replace(/[^0-9]/g, ""));
		setCustomSpends((prev) => ({
			...prev,
			[channelKey]: Number.isFinite(num) ? num : 0,
		}));
	};

	// Reset budgets to defaults
	const handleResetBudgets = () => {
		setCustomSpends(getDefaultChannelSpendMap());
		showToast("Рекламные бюджеты сброшены к стандартным", "info");
	};

	// Export CSV action
	const handleExportCsv = () => {
		try {
			const csvData = exportFunnelReportCsv(analysis);
			const blob = new Blob([csvData], {
				type: "text/csv;charset=utf-8;",
			});
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.setAttribute(
				"download",
				`Dente_Leads_Funnel_Report_${period}_${new Date().toISOString().slice(0, 10)}.csv`,
			);
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);
			showToast("Отчет успешно экспортирован в CSV (Excel)", "success");
		} catch {
			showToast("Не удалось экспортировать отчет", "error");
		}
	};

	// Copy Text summary
	const handleCopySummary = async () => {
		try {
			const text = exportFunnelReportSummaryText(analysis);
			await navigator.clipboard.writeText(text);
			showToast("Дайджест воронки скопирован в буфер обмена", "success");
		} catch {
			showToast("Не удалось скопировать сводку", "error");
		}
	};

	if (!isOpen) return null;

	const { summary, stages, channels } = analysis;

	return (
		<div
			style={{
				position: "fixed",
				inset: 0,
				zIndex: 150,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				background: "rgba(0, 0, 0, 0.65)",
				backdropFilter: "blur(6px)",
				padding: "16px",
			}}
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<motion.div
				initial={{ opacity: 0, scale: 0.96, y: 15 }}
				animate={{ opacity: 1, scale: 1, y: 0 }}
				exit={{ opacity: 0, scale: 0.96, y: 15 }}
				transition={{ duration: 0.2 }}
				style={{
					background: "var(--paper-strong)",
					color: "var(--ink)",
					width: "1100px",
					maxWidth: "calc(100% - 32px)",
					maxHeight: "92vh",
					borderRadius: "16px",
					border: "1px solid var(--line)",
					boxShadow: "0 24px 64px rgba(0, 0, 0, 0.3)",
					display: "flex",
					flexDirection: "column",
					overflow: "hidden",
				}}
			>
				{/* ---------------------------------------------------------------- */}
				{/* 1. HEADER & ACTIONS */}
				{/* ---------------------------------------------------------------- */}
				<header
					style={{
						padding: "18px 24px",
						borderBottom: "1px solid var(--line)",
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						flexWrap: "wrap",
						gap: "12px",
						background: "var(--paper-soft)",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
						<div
							style={{
								width: 40,
								height: 40,
								borderRadius: 10,
								background: "rgba(15, 118, 110, 0.15)",
								color: "var(--teal)",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
							}}
						>
							<BarChart3 size={22} />
						</div>
						<div>
							<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
								<h2
									style={{
										margin: 0,
										fontSize: 18,
										fontWeight: 700,
										color: "var(--ink)",
										letterSpacing: "-0.01em",
									}}
								>
									Сквозная Воронка & Маркетинг
								</h2>
								<span
									style={{
										fontSize: 10,
										fontWeight: 700,
										padding: "2px 8px",
										borderRadius: 12,
										background: "var(--teal)",
										color: "var(--on-teal, var(--paper))",
										textTransform: "uppercase",
										letterSpacing: "0.05em",
									}}
								>
									CRM Intelligence
								</span>
							</div>
							<p
								style={{
									margin: "2px 0 0",
									fontSize: 12,
									color: "var(--muted)",
								}}
							>
								Конверсии от лида до оплаты в кассу • Юнит-экономика CAC/LTV • Маркетинговые каналы
							</p>
						</div>
					</div>

					<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
						<button
							type="button"
							onClick={handleCopySummary}
							className="secondary-button"
							style={{
								height: 34,
								padding: "0 12px",
								fontSize: 12,
								display: "flex",
								alignItems: "center",
								gap: 6,
							}}
							title="Скопировать текстовую сводку для руководителя / Telegram"
							aria-label="Скопировать сводку"
						>
							<Copy size={14} /> Скопировать дайджест
						</button>

						<button
							type="button"
							onClick={handleExportCsv}
							className="secondary-button"
							style={{
								height: 34,
								padding: "0 12px",
								fontSize: 12,
								display: "flex",
								alignItems: "center",
								gap: 6,
							}}
							title="Выгрузить полный отчет в формате CSV (Excel)"
							aria-label="Экспорт в CSV"
						>
							<Download size={14} /> Экспорт CSV
						</button>

						<button
							type="button"
							onClick={onClose}
							style={{
								background: "none",
								border: "none",
								color: "var(--muted)",
								cursor: "pointer",
								padding: 6,
								borderRadius: 8,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
							}}
							aria-label="Закрыть окно"
						>
							<X size={20} />
						</button>
					</div>
				</header>

				{/* ---------------------------------------------------------------- */}
				{/* 2. 0-CLICK PERIOD SELECTOR & QUICK STATS */}
				{/* ---------------------------------------------------------------- */}
				<div
					style={{
						padding: "12px 24px",
						background: "var(--paper)",
						borderBottom: "1px solid var(--line)",
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						flexWrap: "wrap",
						gap: "12px",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
						<span
							style={{
								fontSize: 12,
								fontWeight: 600,
								color: "var(--muted)",
								marginRight: 4,
							}}
						>
							Период:
						</span>
						{FUNNEL_PERIOD_OPTIONS.map((opt) => (
							<button
								key={opt.id}
								type="button"
								onClick={() => setPeriod(opt.id)}
								style={{
									padding: "6px 12px",
									fontSize: 12,
									fontWeight: period === opt.id ? 600 : 500,
									borderRadius: 8,
									border:
										period === opt.id
											? "1px solid var(--teal)"
											: "1px solid var(--line)",
									background:
										period === opt.id
											? "rgba(15, 118, 110, 0.12)"
											: "var(--paper-soft)",
									color:
										period === opt.id
											? "var(--teal)"
											: "var(--ink)",
									cursor: "pointer",
									transition: "all 0.15s ease",
								}}
							>
								{opt.label}
							</button>
						))}
					</div>

					<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
						<button
							type="button"
							onClick={() => setIsBudgetDrawerOpen(!isBudgetDrawerOpen)}
							style={{
								display: "flex",
								alignItems: "center",
								gap: 6,
								fontSize: 12,
								fontWeight: 600,
								padding: "6px 12px",
								borderRadius: 8,
								border: "1px solid var(--line)",
								background: isBudgetDrawerOpen
									? "rgba(59, 130, 246, 0.1)"
									: "var(--paper-soft)",
								color: isBudgetDrawerOpen
									? "var(--accent)"
									: "var(--ink)",
								cursor: "pointer",
							}}
						>
							<Sliders size={14} />
							Настроить рекламные бюджеты
							{isBudgetDrawerOpen ? (
								<ChevronUp size={14} />
							) : (
								<ChevronDown size={14} />
							)}
						</button>
					</div>
				</div>

				{/* ---------------------------------------------------------------- */}
				{/* 3. BUDGET ADJUSTER ACCORDION */}
				{/* ---------------------------------------------------------------- */}
				<FunnelBudgetAdjuster
					isOpen={isBudgetDrawerOpen}
					customSpends={customSpends}
					onBudgetChange={handleBudgetChange}
					onResetBudgets={handleResetBudgets}
				/>

				{/* ---------------------------------------------------------------- */}
				{/* 4. SCROLLABLE BODY */}
				{/* ---------------------------------------------------------------- */}
				<div
					style={{
						flex: 1,
						overflowY: "auto",
						padding: "20px 24px",
						display: "flex",
						flexDirection: "column",
						gap: "24px",
					}}
				>
					{/* TOP KPI CARDS */}
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
							gap: "12px",
						}}
					>
						{/* 1. Лиды */}
						<div
							style={{
								background: "var(--paper)",
								border: "1px solid var(--line)",
								borderRadius: 12,
								padding: "14px",
							}}
						>
							<div
								style={{
									fontSize: 11,
									fontWeight: 600,
									color: "var(--muted)",
									marginBottom: 4,
									display: "flex",
									alignItems: "center",
									gap: 4,
								}}
							>
								<Users size={13} color="var(--brand-500)" /> Всего лидов
							</div>
							<div
								style={{
									fontSize: 22,
									fontWeight: 700,
									color: "var(--ink)",
								}}
							>
								{summary.totalLeads}
							</div>
							<div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
								Конверсия в запись: {summary.bookingRatePercent}%
							</div>
						</div>

						{/* 2. Show-up (Дошли) */}
						<div
							style={{
								background: "var(--paper)",
								border: "1px solid var(--line)",
								borderRadius: 12,
								padding: "14px",
							}}
						>
							<div
								style={{
									fontSize: 11,
									fontWeight: 600,
									color: "var(--muted)",
									marginBottom: 4,
									display: "flex",
									alignItems: "center",
									gap: 4,
								}}
							>
								<CheckCircle2 size={13} color="var(--warn-fg)" /> Дошли (Show-up)
							</div>
							<div
								style={{
									fontSize: 22,
									fontWeight: 700,
									color: "var(--ink)",
								}}
							>
								{summary.showUpLeads}
							</div>
							<div
								style={{
									fontSize: 11,
									fontWeight: 600,
									color:
										summary.showUpRatePercent >= 75
											? "var(--ok-fg)"
											: "var(--warn-fg)",
									marginTop: 2,
								}}
							>
								Доходимость: {summary.showUpRatePercent}%
							</div>
						</div>

						{/* 3. Оплатили (Клиенты) */}
						<div
							style={{
								background: "var(--paper)",
								border: "1px solid var(--line)",
								borderRadius: 12,
								padding: "14px",
							}}
						>
							<div
								style={{
									fontSize: 11,
									fontWeight: 600,
									color: "var(--muted)",
									marginBottom: 4,
									display: "flex",
									alignItems: "center",
									gap: 4,
								}}
							>
								<Award size={13} color="var(--ok-fg)" /> Оплатили
							</div>
							<div
								style={{
									fontSize: 22,
									fontWeight: 700,
									color: "var(--ok-fg)",
								}}
							>
								{summary.paidLeads}
							</div>
							<div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
								Итог. конверсия: {summary.overallConversionPercent}%
							</div>
						</div>

						{/* 4. Выручка */}
						<div
							style={{
								background: "var(--paper)",
								border: "1px solid var(--line)",
								borderRadius: 12,
								padding: "14px",
							}}
						>
							<div
								style={{
									fontSize: 11,
									fontWeight: 600,
									color: "var(--muted)",
									marginBottom: 4,
									display: "flex",
									alignItems: "center",
									gap: 4,
								}}
							>
								<DollarSign size={13} color="var(--teal)" /> Выручка
							</div>
							<div
								style={{
									fontSize: 20,
									fontWeight: 700,
									color: "var(--ink)",
								}}
							>
								{summary.totalRevenueRub.toLocaleString("ru-RU")} ₽
							</div>
							<div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
								Ср. чек: {summary.avgBillRub.toLocaleString("ru-RU")} ₽
							</div>
						</div>

						{/* 5. CAC */}
						<div
							style={{
								background: "var(--paper)",
								border: "1px solid var(--line)",
								borderRadius: 12,
								padding: "14px",
							}}
						>
							<div
								style={{
									fontSize: 11,
									fontWeight: 600,
									color: "var(--muted)",
									marginBottom: 4,
									display: "flex",
									alignItems: "center",
									gap: 4,
								}}
							>
								<TrendingUp size={13} color="var(--accent)" /> CAC (Стоимость клика)
							</div>
							<div
								style={{
									fontSize: 20,
									fontWeight: 700,
									color: "var(--ink)",
								}}
							>
								{summary.cacRub.toLocaleString("ru-RU")} ₽
							</div>
							<div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
								CPL: {summary.cplRub.toLocaleString("ru-RU")} ₽ | CPS: {summary.cpsRub.toLocaleString("ru-RU")} ₽
							</div>
						</div>

						{/* 6. ROMI */}
						<div
							style={{
								background: "var(--paper)",
								border: "1px solid var(--line)",
								borderRadius: 12,
								padding: "14px",
							}}
						>
							<div
								style={{
									fontSize: 11,
									fontWeight: 600,
									color: "var(--muted)",
									marginBottom: 4,
									display: "flex",
									alignItems: "center",
									gap: 4,
								}}
							>
								<Flame size={13} color="var(--teal)" /> ROMI (Окупаемость)
							</div>
							<div
								style={{
									fontSize: 20,
									fontWeight: 700,
									color:
										summary.romiPercent >= 100
											? "var(--ok-fg)"
											: summary.romiPercent >= 0
												? "var(--warn-fg)"
												: "var(--rust)",
								}}
							>
								{summary.romiPercent}%
							</div>
							<div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
								LTV/CAC: {summary.ltvToCacRatio}x
							</div>
						</div>
					</div>

					{/* ------------------------------------------------------------ */}
					{/* VISUAL FUNNEL WATERFALL */}
					{/* ------------------------------------------------------------ */}
					<FunnelWaterfallSection
						stages={stages}
						totalLeads={summary.totalLeads}
						isOpen={isWaterfallOpen}
						onToggle={() => setIsWaterfallOpen(!isWaterfallOpen)}
					/>

					{/* ------------------------------------------------------------ */}
					{/* MARKETING CHANNELS BREAKDOWN TABLE */}
					{/* ------------------------------------------------------------ */}
					<FunnelChannelsTableSection
						channels={channels}
						summary={summary}
						isOpen={isChannelsTableOpen}
						onToggle={() => setIsChannelsTableOpen(!isChannelsTableOpen)}
					/>

					{/* ------------------------------------------------------------ */}
					{/* MARKETING GROWTH INSIGHTS */}
					{/* ------------------------------------------------------------ */}
					<div
						style={{
							background: "rgba(15, 118, 110, 0.06)",
							border: "1px solid rgba(15, 118, 110, 0.2)",
							borderRadius: 14,
							padding: "16px 20px",
							display: "flex",
							alignItems: "flex-start",
							gap: 12,
						}}
					>
						<Sparkles size={20} color="var(--teal)" style={{ flexShrink: 0, marginTop: 2 }} />
						<div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--ink)" }}>
							<strong style={{ color: "var(--teal)", display: "block", marginBottom: 2 }}>
								Маркетинговые рекомендации CRM ДЕНТЕ
							</strong>
							{summary.showUpRatePercent < 70 ? (
								<div>
									• <strong>Низкая доходимость ({summary.showUpRatePercent}%):</strong> Внедрите авто-напоминания по WhatsApp/SMS за 24 часа и за 2 часа до приема для роста Show-up до 80%+.
								</div>
							) : (
								<div>
									• <strong>Высокая доходимость ({summary.showUpRatePercent}%):</strong> Регистратура эффективно подтверждает записи.
								</div>
							)}
							{summary.planAcceptanceRatePercent < 60 ? (
								<div>
									• <strong>Согласование планов ({summary.planAcceptanceRatePercent}%):</strong> Рекомендуется демонстрация снимков радиовизиографа и интраоральной камеры на консультации врача у кресла.
								</div>
							) : (
								<div>
									• <strong>Конверсия планов ({summary.planAcceptanceRatePercent}%):</strong> Отличный показатель доверия пациентов к комплексным планам.
								</div>
							)}
						</div>
					</div>
				</div>

				{/* ---------------------------------------------------------------- */}
				{/* 5. FOOTER */}
				{/* ---------------------------------------------------------------- */}
				<footer
					style={{
						padding: "12px 24px",
						background: "var(--paper-soft)",
						borderTop: "1px solid var(--line)",
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
					}}
				>
					<div style={{ fontSize: 11, color: "var(--muted)" }}>
						Сквозная воронка ДЕНТЕ CRM • 54-ФЗ • Расчет в реальном времени
					</div>
					<button
						type="button"
						className="primary-button"
						onClick={onClose}
						style={{ height: 34, padding: "0 18px", fontSize: 12 }}
					>
						Закрыть
					</button>
				</footer>
			</motion.div>
		</div>
	);
}
