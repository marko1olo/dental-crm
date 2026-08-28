import { AnimatePresence, motion } from "framer-motion";
import {
	AlertTriangle,
	ArrowRight,
	Award,
	BarChart3,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	Copy,
	DollarSign,
	Download,
	Flame,
	Globe,
	Heart,
	HelpCircle,
	MapPin,
	MessageSquare,
	Phone,
	RefreshCw,
	Sliders,
	Sparkles,
	TrendingUp,
	Users,
	X,
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { showToast } from "../GlobalToast";
import {
	type CanonicalMarketingChannelKey,
	type ChannelSpendMap,
	FUNNEL_PERIOD_OPTIONS,
	type FunnelLead,
	type FunnelTimePeriod,
	MARKETING_CHANNELS,
	calculateFunnelAnalysis,
	exportFunnelReportCsv,
	exportFunnelReportSummaryText,
	getDefaultChannelSpendMap,
} from "./leadsFunnelEngine";

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
					maxWidth: "96vw",
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
								color: "var(--brand-500, #0f766e)",
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
										background: "var(--brand-500, #0f766e)",
										color: "#ffffff",
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
											? "1px solid var(--brand-500, #0f766e)"
											: "1px solid var(--line)",
									background:
										period === opt.id
											? "rgba(15, 118, 110, 0.12)"
											: "var(--paper-soft)",
									color:
										period === opt.id
											? "var(--brand-500, #0f766e)"
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
									? "var(--accent, #3b82f6)"
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
				<AnimatePresence>
					{isBudgetDrawerOpen && (
						<motion.div
							initial={{ height: 0, opacity: 0 }}
							animate={{ height: "auto", opacity: 1 }}
							exit={{ height: 0, opacity: 0 }}
							transition={{ duration: 0.2 }}
							style={{
								overflow: "hidden",
								background: "var(--paper-soft)",
								borderBottom: "1px solid var(--line)",
								padding: "16px 24px",
							}}
						>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
									marginBottom: 12,
								}}
							>
								<div style={{ display: "flex", alignItems: "center", gap: 6 }}>
									<span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
										Маркетинговые расходы за период (₽)
									</span>
									<span style={{ fontSize: 11, color: "var(--muted)" }}>
										— введите реальные затраты клиники для точного расчета CAC и ROMI
									</span>
								</div>
								<button
									type="button"
									onClick={handleResetBudgets}
									style={{
										background: "none",
										border: "none",
										color: "var(--muted)",
										fontSize: 11,
										cursor: "pointer",
										display: "flex",
										alignItems: "center",
										gap: 4,
									}}
								>
									<RefreshCw size={12} /> Сбросить по умолчанию
								</button>
							</div>

							<div
								style={{
									display: "grid",
									gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
									gap: "10px",
								}}
							>
								{MARKETING_CHANNELS.map((ch) => {
									const currentVal = customSpends[ch.key] ?? 0;
									return (
										<div
											key={ch.key}
											style={{
												background: "var(--paper)",
												border: "1px solid var(--line)",
												borderRadius: 8,
												padding: "8px 10px",
												display: "flex",
												flexDirection: "column",
												gap: 4,
											}}
										>
											<label
												htmlFor={`budget-input-${ch.key}`}
												style={{
													fontSize: 11,
													fontWeight: 600,
													color: "var(--muted)",
													display: "flex",
													alignItems: "center",
													gap: 4,
												}}
											>
												<span
													style={{
														width: 8,
														height: 8,
														borderRadius: "50%",
														background: ch.color,
														display: "inline-block",
													}}
												/>
												{ch.label}
											</label>
											<div style={{ position: "relative" }}>
												<input
													id={`budget-input-${ch.key}`}
													type="text"
													value={currentVal.toLocaleString("ru-RU")}
													onChange={(e) =>
														handleBudgetChange(ch.key, e.target.value)
													}
													style={{
														width: "100%",
														padding: "4px 24px 4px 8px",
														borderRadius: 6,
														border: "1px solid var(--line)",
														background: "var(--paper-soft)",
														color: "var(--ink)",
														fontSize: 13,
														fontWeight: 600,
														boxSizing: "border-box",
													}}
												/>
												<span
													style={{
														position: "absolute",
														right: 8,
														top: "50%",
														transform: "translateY(-50%)",
														fontSize: 12,
														color: "var(--muted)",
														pointerEvents: "none",
													}}
												>
													₽
												</span>
											</div>
										</div>
									);
								})}
							</div>
						</motion.div>
					)}
				</AnimatePresence>

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
								<CheckCircle2 size={13} color="var(--warning, #f59e0b)" /> Дошли (Show-up)
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
											? "var(--success, #10b981)"
											: "var(--warning, #f59e0b)",
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
								<Award size={13} color="var(--success, #10b981)" /> Оплатили
							</div>
							<div
								style={{
									fontSize: 22,
									fontWeight: 700,
									color: "var(--success, #10b981)",
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
								<TrendingUp size={13} color="var(--indigo, #6366f1)" /> CAC (Стоимость клика)
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
								<Flame size={13} color="var(--brand-500, #0f766e)" /> ROMI (Окупаемость)
							</div>
							<div
								style={{
									fontSize: 20,
									fontWeight: 700,
									color:
										summary.romiPercent >= 100
											? "var(--success, #10b981)"
											: summary.romiPercent >= 0
												? "var(--warning, #f59e0b)"
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
					<div
						style={{
							background: "var(--paper)",
							border: "1px solid var(--line)",
							borderRadius: 14,
							padding: "20px",
						}}
					>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								marginBottom: 16,
							}}
						>
							<div>
								<h3
									style={{
										margin: 0,
										fontSize: 15,
										fontWeight: 700,
										color: "var(--ink)",
										display: "flex",
										alignItems: "center",
										gap: 6,
									}}
								>
									<BarChart3 size={18} color="var(--brand-500)" />
									Клиническая Сквозная Воронка Пациентов
								</h3>
								<p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--muted)" }}>
									Абсолютное количество и пошаговая конверсия между этапами
								</p>
							</div>
							<div
								style={{
									fontSize: 12,
									fontWeight: 600,
									color: "var(--muted)",
									background: "var(--paper-soft)",
									padding: "4px 10px",
									borderRadius: 8,
									border: "1px solid var(--line)",
								}}
							>
								Выборка: {summary.totalLeads} обращений
							</div>
						</div>

						<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
							{stages.map((st, idx) => {
								const maxCount = summary.totalLeads > 0 ? summary.totalLeads : 1;
								const barWidthPercent = Math.max(
									8,
									Math.round((st.count / maxCount) * 100),
								);

								return (
									<div
										key={st.key}
										style={{
											display: "flex",
											flexDirection: "column",
											gap: 4,
										}}
									>
										<div
											style={{
												display: "flex",
												alignItems: "center",
												justifyContent: "space-between",
												fontSize: 12,
											}}
										>
											<div
												style={{
													display: "flex",
													alignItems: "center",
													gap: 8,
													fontWeight: 600,
													color: "var(--ink)",
												}}
											>
												<span
													style={{
														width: 10,
														height: 10,
														borderRadius: "50%",
														background: st.color,
														display: "inline-block",
													}}
												/>
												{st.label}
											</div>
											<div style={{ display: "flex", alignItems: "center", gap: 12 }}>
												<span style={{ fontWeight: 700, color: "var(--ink)", fontSize: 13 }}>
													{st.count} чел.
												</span>
												<span
													style={{
														fontSize: 11,
														fontWeight: 600,
														color: "var(--brand-500, #0f766e)",
														background: st.badgeColor,
														padding: "2px 6px",
														borderRadius: 6,
													}}
												>
													{st.conversionFromFirstPercent}% от входа
												</span>
												{idx > 0 && (
													<span
														style={{
															fontSize: 11,
															color: "var(--muted)",
															minWidth: 100,
															textAlign: "right",
														}}
													>
														Шаг: {st.conversionFromPrevPercent}%
													</span>
												)}
											</div>
										</div>

										{/* Progress Track */}
										<div
											style={{
												width: "100%",
												height: 24,
												background: "var(--paper-soft)",
												borderRadius: 6,
												overflow: "hidden",
												position: "relative",
												border: "1px solid var(--line)",
											}}
										>
											<motion.div
												initial={{ width: 0 }}
												animate={{ width: `${barWidthPercent}%` }}
												transition={{ duration: 0.4, delay: idx * 0.05 }}
												style={{
													height: "100%",
													background: st.color,
													opacity: 0.85,
													borderRadius: 5,
													display: "flex",
													alignItems: "center",
													paddingLeft: 8,
													color: "#ffffff",
													fontSize: 11,
													fontWeight: 600,
												}}
											/>
										</div>

										{/* Drop-off notice if applicable */}
										{st.dropCount > 0 && idx < stages.length - 1 && (
											<div
												style={{
													fontSize: 11,
													color: "var(--rust)",
													paddingLeft: 18,
													display: "flex",
													alignItems: "center",
													gap: 4,
												}}
											>
												<ArrowRight size={11} />
												Отвал на этапе: {st.dropCount} чел. ({st.dropRatePercent}%)
											</div>
										)}
									</div>
								);
							})}
						</div>
					</div>

					{/* ------------------------------------------------------------ */}
					{/* MARKETING CHANNELS BREAKDOWN TABLE */}
					{/* ------------------------------------------------------------ */}
					<div
						style={{
							background: "var(--paper)",
							border: "1px solid var(--line)",
							borderRadius: 14,
							padding: "20px",
						}}
					>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								marginBottom: 16,
								flexWrap: "wrap",
								gap: 8,
							}}
						>
							<div>
								<h3
									style={{
										margin: 0,
										fontSize: 15,
										fontWeight: 700,
										color: "var(--ink)",
										display: "flex",
										alignItems: "center",
										gap: 6,
									}}
								>
									<Globe size={18} color="var(--brand-500)" />
									Эффективность Рекламных Каналов
								</h3>
								<p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--muted)" }}>
									Сравнение CPL, CAC, среднего чека и окупаемости инвестиций (ROMI)
								</p>
							</div>
						</div>

						<div style={{ overflowX: "auto" }}>
							<table
								style={{
									width: "100%",
									borderCollapse: "collapse",
									fontSize: 12,
									textAlign: "left",
								}}
							>
								<thead>
									<tr
										style={{
											borderBottom: "1px solid var(--line)",
											color: "var(--muted)",
											fontSize: 11,
											textTransform: "uppercase",
											letterSpacing: "0.03em",
										}}
									>
										<th style={{ padding: "10px 8px" }}>Канал</th>
										<th style={{ padding: "10px 8px" }}>Расход (₽)</th>
										<th style={{ padding: "10px 8px" }}>Лиды</th>
										<th style={{ padding: "10px 8px" }}>Записи</th>
										<th style={{ padding: "10px 8px" }}>Дошли</th>
										<th style={{ padding: "10px 8px" }}>Оплатили</th>
										<th style={{ padding: "10px 8px" }}>Конв. (%)</th>
										<th style={{ padding: "10px 8px" }}>Выручка (₽)</th>
										<th style={{ padding: "10px 8px" }}>CAC (₽)</th>
										<th style={{ padding: "10px 8px" }}>ROMI (%)</th>
										<th style={{ padding: "10px 8px" }}>Статус & Рекомендация</th>
									</tr>
								</thead>
								<tbody>
									{channels.map((ch) => {
										return (
											<tr
												key={ch.channelKey}
												style={{
													borderBottom: "1px solid var(--line)",
													transition: "background 0.15s",
												}}
											>
												<td style={{ padding: "10px 8px", fontWeight: 600 }}>
													<div
														style={{
															display: "flex",
															alignItems: "center",
															gap: 6,
														}}
													>
														<span
															style={{
																width: 8,
																height: 8,
																borderRadius: "50%",
																background: ch.color,
																display: "inline-block",
															}}
														/>
														{ch.channelLabel}
													</div>
												</td>
												<td style={{ padding: "10px 8px", fontWeight: 500 }}>
													{ch.spendRub.toLocaleString("ru-RU")} ₽
												</td>
												<td style={{ padding: "10px 8px", fontWeight: 600 }}>
													{ch.leadsCount}
												</td>
												<td style={{ padding: "10px 8px" }}>{ch.bookedCount}</td>
												<td style={{ padding: "10px 8px" }}>{ch.showUpCount}</td>
												<td
													style={{
														padding: "10px 8px",
														fontWeight: 700,
														color:
															ch.paidCount > 0
																? "var(--success, #10b981)"
																: "var(--ink)",
													}}
												>
													{ch.paidCount}
												</td>
												<td style={{ padding: "10px 8px", fontWeight: 600 }}>
													{ch.conversionRatePercent}%
												</td>
												<td style={{ padding: "10px 8px", fontWeight: 700 }}>
													{ch.revenueRub.toLocaleString("ru-RU")} ₽
												</td>
												<td style={{ padding: "10px 8px", color: "var(--muted)" }}>
													{ch.cacRub > 0 ? `${ch.cacRub.toLocaleString("ru-RU")} ₽` : "—"}
												</td>
												<td style={{ padding: "10px 8px" }}>
													<span
														style={{
															fontWeight: 700,
															color:
																ch.romiPercent >= 100
																	? "var(--success, #10b981)"
																	: ch.romiPercent >= 0
																		? "var(--warning, #f59e0b)"
																		: "var(--rust)",
														}}
													>
														{ch.spendRub > 0 ? `${ch.romiPercent}%` : "Органика"}
													</span>
												</td>
												<td style={{ padding: "10px 8px", fontSize: 11 }}>
													<div
														style={{
															display: "flex",
															alignItems: "center",
															gap: 6,
														}}
													>
														{ch.efficiencyRating === "excellent" && (
															<span
																style={{
																	background: "rgba(16, 185, 129, 0.15)",
																	color: "var(--success, #10b981)",
																	padding: "2px 6px",
																	borderRadius: 4,
																	fontWeight: 700,
																}}
															>
																ТОП 🚀
															</span>
														)}
														{ch.efficiencyRating === "good" && (
															<span
																style={{
																	background: "rgba(59, 130, 246, 0.15)",
																	color: "var(--accent, #3b82f6)",
																	padding: "2px 6px",
																	borderRadius: 4,
																	fontWeight: 600,
																}}
															>
																В плюсе ✅
															</span>
														)}
														{ch.efficiencyRating === "warning" && (
															<span
																style={{
																	background: "rgba(245, 158, 11, 0.15)",
																	color: "var(--warning, #f59e0b)",
																	padding: "2px 6px",
																	borderRadius: 4,
																	fontWeight: 600,
																}}
															>
																В ноль ⚠️
															</span>
														)}
														{ch.efficiencyRating === "critical" && (
															<span
																style={{
																	background: "rgba(239, 68, 68, 0.15)",
																	color: "var(--rust)",
																	padding: "2px 6px",
																	borderRadius: 4,
																	fontWeight: 600,
																}}
															>
																Убыток 🔻
															</span>
														)}
														{ch.efficiencyRating === "organic" && (
															<span
																style={{
																	background: "rgba(139, 92, 246, 0.15)",
																	color: "var(--purple, #8b5cf6)",
																	padding: "2px 6px",
																	borderRadius: 4,
																	fontWeight: 600,
																}}
															>
																Сарафан 💎
															</span>
														)}
														<span style={{ color: "var(--muted)" }}>
															{ch.recommendation}
														</span>
													</div>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					</div>

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
						<Sparkles size={20} color="var(--brand-500, #0f766e)" style={{ flexShrink: 0, marginTop: 2 }} />
						<div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--ink)" }}>
							<strong style={{ color: "var(--brand-500, #0f766e)", display: "block", marginBottom: 2 }}>
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
									• <strong>Согласование планов ({summary.planAcceptanceRatePercent}%):</strong> Рекомендуется внедрить демонстрацию 3D/КЛКТ визуализации на консультациях куратора лечения.
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
