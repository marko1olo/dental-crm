/**
 * apps/web/src/components/analytics/CuratorDashboard.tsx
 *
 * Главный дашборд и рабочее место выделенной роли «Куратор пациентов» (Фича #27) DENTE CRM.
 *  - Закрепление куратора за пациентом и планом лечения.
 *  - 5-этапная воронка куратора: Консультация -> Согласование -> Предоплата -> Старт -> Завершение.
 *  - Расчет конверсии планов и сдельной комиссии в копейках и рублях.
 *  - Управление очередью пациентов куратора с фильтрами по статусам, суммам и флагам внимания.
 *  - Эргономика тач-таргетов >= 44x44px, Apple Mac HIG, WCAG 4.5:1.
 */

import React, { useMemo, useState, useEffect } from "react";
import {
	type CuratorConversionMetrics,
	type CuratorFunnelStage,
	type CuratorPatientQueueItem,
	type CuratorPlanAssignmentPayload,
	type CuratorQueueFilterOptions,
	advancePatientFunnelStage,
	calculateCuratorMetrics,
	CURATOR_STAGE_DEFINITIONS,
	filterAndSortCuratorQueue,
} from "@dental/shared";
import {
	AlertTriangle,
	Award,
	CheckCircle,
	CheckCircle2,
	ChevronRight,
	Clock,
	Coins,
	DollarSign,
	Filter,
	Layers,
	MessageCircle,
	Phone,
	RefreshCw,
	Search,
	TrendingUp,
	UserCheck,
	UserPlus,
	Users,
	Zap,
} from "lucide-react";
import { showToast } from "../GlobalToast";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { CuratorConversionFunnel } from "./CuratorConversionFunnel";
import { CuratorPlanAssignmentModal } from "../treatment-plans/CuratorPlanAssignmentModal";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import "./curatorDashboard.css";

export interface CuratorDashboardProps {
	readonly onOpenPatientPlan?: (patientId: string, planId: string) => void;
	readonly onOpenPatientCard?: (patientId: string) => void;
	readonly className?: string;
}

export const CuratorDashboard: React.FC<CuratorDashboardProps> = ({
	onOpenPatientPlan,
	onOpenPatientCard,
	className = "",
}) => {
	const { dashboard, auth } = useAppLogicContext();

	const [selectedCuratorId, setSelectedCuratorId] = useState<string>("all");
	const [selectedStage, setSelectedStage] = useState<CuratorFunnelStage | "all">("all");
	const [selectedPriceRange, setSelectedPriceRange] = useState<"all" | "low" | "medium" | "high">("all");
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [onlyAttentionFlags, setOnlyAttentionFlags] = useState<boolean>(false);
	const [sortBy, setSortBy] = useState<"priority" | "sum_desc" | "days_in_stage_desc" | "assigned_at_desc">("priority");

	// State for assignment modal
	const [assignmentTarget, setAssignmentTarget] = useState<{
		patientId: string;
		patientName: string;
		planId: string;
		planTitle: string;
		currentCuratorId?: string;
	} | null>(null);

	// Local queue state (can be advanced interactively)
	const [queueItems, setQueueItems] = useState<CuratorPatientQueueItem[]>([]);
	const [isLoading, setIsLoading] = useState<boolean>(false);

	// Extract staff curators from dashboard
	const staffCurators = useMemo(() => {
		const staff = (dashboard?.clinicSettings?.staff ?? []) as any[];
		return staff.filter(
			(s) =>
				s.active &&
				(s.role === "curator" ||
					s.role === "administrator" ||
					s.role === "manager" ||
					s.role === "owner"),
		);
	}, [dashboard?.clinicSettings?.staff]);

	// Build queue items from treatment plans & patients in dashboard context
	useEffect(() => {
		const plans = (dashboard?.treatmentPlans ?? []) as any[];
		const patients = (dashboard?.patients ?? []) as any[];
		const staff = (dashboard?.clinicSettings?.staff ?? []) as any[];
		const staffMap = new Map<string, string>(staff.map((s: any) => [s.id, s.fullName || s.name]));

		const defaultCurator = staffCurators[0] || {
			id: "00000000-0000-0000-0000-000000000001",
			fullName: "Куратор клиники",
		};

		if (plans.length > 0) {
			const items: CuratorPatientQueueItem[] = plans.map((plan: any) => {
				const patient = patients.find((p: any) => p.id === plan.patientId);
				const adminProf = patient?.administrativeProfile;
				const curatorId = adminProf?.curatorId || defaultCurator.id;
				const curatorName =
					adminProf?.curatorFullName || staffMap.get(curatorId) || defaultCurator.fullName || "Куратор";

				const priceRub = Number(plan.totalPriceRub || plan.totalPrice || 0);
				const paidRub = Math.max(0, Number(plan.paidAmountRub || patient?.balanceRub || 0));
				const remainingRub = Math.max(0, priceRub - paidRub);

				let stage: CuratorFunnelStage = "consultation";
				if (adminProf?.curatorFunnelStage) {
					stage = adminProf.curatorFunnelStage;
				} else if (plan.status === "Completed") {
					stage = "completed";
				} else if (plan.status === "Active") {
					stage = "treatment_start";
				} else if (paidRub > 0) {
					stage = "prepayment";
				} else if (plan.status === "Approved") {
					stage = "plan_negotiation";
				}

				const days = Math.max(
					1,
					Math.floor(
						(Date.now() - new Date(plan.createdAt || Date.now()).getTime()) /
							(1000 * 60 * 60 * 24),
					),
				);

				const tier =
					priceRub >= 150_000
						? "premium"
						: priceRub < 50_000
							? "basic"
							: "optimum";

				const attentionFlags: any[] = [];
				if (days > 5 && stage !== "completed") attentionFlags.push("stagnant_plan");
				if (priceRub >= 150_000) attentionFlags.push("high_value_plan");
				if (stage === "plan_negotiation" && days >= 3 && paidRub === 0) {
					attentionFlags.push("pending_prepayment");
					attentionFlags.push("requires_followup_call");
				}

				return {
					patientId: plan.patientId || patient?.id || "00000000-0000-0000-0000-000000000000",
					patientFullName: patient?.fullName || "Пациент клиники",
					patientPhone: patient?.phone || null,
					patientEmail: patient?.email || null,
					treatmentPlanId: plan.id,
					treatmentPlanTitle: plan.name || plan.title || "Комплексный план лечения",
					planTier: tier,
					planTotalPriceRub: priceRub,
					planTotalPriceKopecks: Math.round(priceRub * 100),
					paidAmountRub: paidRub,
					paidAmountKopecks: Math.round(paidRub * 100),
					remainingAmountRub: remainingRub,
					remainingAmountKopecks: Math.round(remainingRub * 100),
					funnelStage: stage,
					curatorId,
					curatorFullName: curatorName,
					assignedAt: adminProf?.curatorAssignedAt || new Date().toISOString(),
					stageUpdatedAt: new Date().toISOString(),
					daysInStage: days,
					doctorId: plan.doctorId || null,
					doctorFullName: plan.doctorId ? staffMap.get(plan.doctorId) : "Врач-куратор",
					priorityScore: Math.min(100, Math.max(10, 50 + (days > 4 ? 20 : 0) + (priceRub > 150_000 ? 15 : 0))),
					attentionFlags,
					notes: adminProf?.curatorNotes || null,
				};
			});

			setQueueItems(items);
		} else {
			setQueueItems([]);
		}
	}, [dashboard?.treatmentPlans, dashboard?.patients, dashboard?.clinicSettings?.staff, staffCurators]);

	// Filtered items
	const filteredQueue = useMemo(() => {
		return filterAndSortCuratorQueue(queueItems, {
			curatorId: selectedCuratorId,
			stage: selectedStage,
			priceRange: selectedPriceRange,
			searchQuery,
			onlyWithAttentionFlags: onlyAttentionFlags,
			sortBy,
		});
	}, [queueItems, selectedCuratorId, selectedStage, selectedPriceRange, searchQuery, onlyAttentionFlags, sortBy]);

	// Calculate metrics for selected curator (or all)
	const currentMetrics = useMemo(() => {
		const activeCurator = staffCurators.find((c) => c.id === selectedCuratorId);
		return calculateCuratorMetrics(
			queueItems,
			selectedCuratorId,
			activeCurator?.fullName || "Все кураторы клиники",
		);
	}, [queueItems, selectedCuratorId, staffCurators]);

	// Advance stage handler
	const handleAdvanceStage = async (item: CuratorPatientQueueItem) => {
		const currentDef = CURATOR_STAGE_DEFINITIONS.find((d) => d.stage === item.funnelStage);
		const nextStage = currentDef?.nextStage;

		if (!nextStage) {
			showToast(`План пациента ${item.patientFullName} уже завершен`, "info");
			return;
		}

		let additionalPaid = 0;
		if (nextStage === "prepayment" && item.paidAmountRub === 0) {
			// Auto deposit suggestion 30%
			additionalPaid = Math.round(item.planTotalPriceRub * 0.3);
		} else if (nextStage === "completed") {
			additionalPaid = item.remainingAmountRub;
		}

		try {
			const res = await fetch(`/api/patients/${encodeURIComponent(item.patientId)}/administrative-profile`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					...denteAdminSecretRequestHeaders(),
				},
				body: JSON.stringify({ curatorFunnelStage: nextStage }),
			});
			if (!res.ok) {
				showToast("Не удалось сохранить этап воронки на сервере", "warning");
			}
		} catch (err) {
			console.error("Failed to persist curator funnel stage:", err);
		}

		const updated = queueItems.map((q) => {
			if (q.treatmentPlanId === item.treatmentPlanId) {
				return advancePatientFunnelStage(q, nextStage, additionalPaid);
			}
			return q;
		});

		setQueueItems(updated);
		const nextDef = CURATOR_STAGE_DEFINITIONS.find((d) => d.stage === nextStage);
		showToast(
			`Пациент переведен на этап: «${nextDef?.title}»${additionalPaid > 0 ? ` (+${additionalPaid.toLocaleString("ru-RU")} ₽)` : ""}`,
			"success",
		);
	};

	return (
		<div className={`curator-dashboard-container ${className}`}>
			{/* 1. Верхняя панель управления */}
			<div className="curator-dashboard-header">
				<div className="curator-header-title-group">
					<div className="curator-header-icon">
						<UserCheck className="w-6 h-6" />
					</div>
					<div>
						<h2 className="curator-header-title">Кабинет куратора лечения</h2>
						<p className="curator-header-subtitle">
							Управление конверсией планов, очередью пациентов и сдельной комиссией
						</p>
					</div>
				</div>

				<div className="curator-header-controls">
					<select
						value={selectedCuratorId}
						onChange={(e) => setSelectedCuratorId(e.target.value)}
						className="curator-select-input"
						aria-label="Выбор куратора"
					>
						<option value="all">Все кураторы клиники</option>
						{staffCurators.map((cur) => (
							<option key={cur.id} value={cur.id}>
								{cur.fullName || cur.name} ({cur.role})
							</option>
						))}
					</select>
				</div>
			</div>

			{/* 2. Сетка KPI карточек */}
			<div className="curator-kpi-grid">
				{/* Пациенты в воронке */}
				<div className="curator-kpi-card">
					<div className="curator-kpi-header">
						<span className="curator-kpi-label">Пациенты в работе</span>
						<span className="curator-kpi-badge curator-badge-blue">
							<Users className="w-3.5 h-3.5" /> В пайплайне
						</span>
					</div>
					<div className="curator-kpi-value">{currentMetrics.activePipelinePatientsCount}</div>
					<div className="curator-kpi-subtext">
						Всего закреплено: <strong>{currentMetrics.totalPlansCount}</strong> планов
					</div>
				</div>

				{/* Сумма смет в согласовании */}
				<div className="curator-kpi-card">
					<div className="curator-kpi-header">
						<span className="curator-kpi-label">Объем смет в работе</span>
						<span className="curator-kpi-badge curator-badge-purple">
							<DollarSign className="w-3.5 h-3.5" /> Сметы
						</span>
					</div>
					<div className="curator-kpi-value">
						{currentMetrics.totalPlansSumRub.toLocaleString("ru-RU")} ₽
					</div>
					<div className="curator-kpi-subtext">
						Оплачено: <strong>{currentMetrics.totalCollectedRevenueRub.toLocaleString("ru-RU")} ₽</strong>
					</div>
				</div>

				{/* Конверсия планов */}
				<div className="curator-kpi-card">
					<div className="curator-kpi-header">
						<span className="curator-kpi-label">Конверсия куратора</span>
						<span
							className={`curator-kpi-badge ${
								currentMetrics.overallConversionPercent >= 60
									? "curator-badge-emerald"
									: currentMetrics.overallConversionPercent >= 40
										? "curator-badge-blue"
										: "curator-badge-amber"
							}`}
						>
							<TrendingUp className="w-3.5 h-3.5" />
							{currentMetrics.overallConversionPercent >= 60 ? "Высокая" : "Стандарт"}
						</span>
					</div>
					<div className="curator-kpi-value">
						{currentMetrics.overallConversionPercent.toFixed(1)}%
					</div>
					<div className="curator-kpi-subtext">
						Завершено планов: <strong>{currentMetrics.completedPlansCount}</strong> из{" "}
						{currentMetrics.totalPlansCount}
					</div>
				</div>

				{/* Сдельная комиссия */}
				<div className="curator-kpi-card">
					<div className="curator-kpi-header">
						<span className="curator-kpi-label">Сдельная комиссия</span>
						<span className="curator-kpi-badge curator-badge-emerald">
							<Coins className="w-3.5 h-3.5" /> {currentMetrics.effectiveCommissionRatePercent.toFixed(1)}%
						</span>
					</div>
					<div className="curator-kpi-value" style={{ color: "var(--teal, #0d9488)" }}>
						{currentMetrics.commissionEarnedRub.toLocaleString("ru-RU")} ₽
					</div>
					<div className="curator-kpi-subtext">
						{currentMetrics.commissionTierLabel}
					</div>
				</div>
			</div>

			{/* 3. Визуальная 5-этапная воронка конверсии */}
			<CuratorConversionFunnel
				metrics={currentMetrics}
				selectedStage={selectedStage}
				onSelectStage={(st) => setSelectedStage(st)}
			/>

			{/* 4. Очередь пациентов куратора */}
			<div className="curator-queue-section">
				<div className="curator-queue-toolbar">
					{/* Поиск */}
					<div className="curator-search-input-wrapper">
						<Search className="curator-search-icon w-4 h-4" />
						<input
							type="text"
							placeholder="Поиск по пациенту, телефону, плану, врачу..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="curator-search-input"
						/>
					</div>

					{/* Фильтры этапов */}
					<div className="curator-filter-pills">
						<button
							type="button"
							onClick={() => setSelectedStage("all")}
							className={`curator-pill-btn ${selectedStage === "all" ? "active" : ""}`}
						>
							Все этапы ({queueItems.length})
						</button>
						{CURATOR_STAGE_DEFINITIONS.map((def) => {
							const cnt = queueItems.filter((q) => q.funnelStage === def.stage).length;
							return (
								<button
									key={def.stage}
									type="button"
									onClick={() => setSelectedStage(def.stage)}
									className={`curator-pill-btn ${selectedStage === def.stage ? "active" : ""}`}
								>
									{def.shortTitle} ({cnt})
								</button>
							);
						})}
					</div>
				</div>

				{/* Вторичные фильтры и сортировка */}
				<div
					style={{
						display: "flex",
						alignItems: "center",
						flexWrap: "wrap",
						justifyContent: "space-between",
						gap: "12px",
						paddingTop: "4px",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
						<span style={{ fontSize: "12px", color: "var(--ink-muted, #64748b)", fontWeight: 600 }}>
							Сумма:
						</span>
						<button
							type="button"
							onClick={() => setSelectedPriceRange("all")}
							className={`curator-pill-btn ${selectedPriceRange === "all" ? "active" : ""}`}
							style={{ minHeight: "36px", padding: "4px 10px", fontSize: "12px" }}
						>
							Все суммы
						</button>
						<button
							type="button"
							onClick={() => setSelectedPriceRange("low")}
							className={`curator-pill-btn ${selectedPriceRange === "low" ? "active" : ""}`}
							style={{ minHeight: "36px", padding: "4px 10px", fontSize: "12px" }}
						>
							&lt; 50 тыс. ₽
						</button>
						<button
							type="button"
							onClick={() => setSelectedPriceRange("medium")}
							className={`curator-pill-btn ${selectedPriceRange === "medium" ? "active" : ""}`}
							style={{ minHeight: "36px", padding: "4px 10px", fontSize: "12px" }}
						>
							50–150 тыс. ₽
						</button>
						<button
							type="button"
							onClick={() => setSelectedPriceRange("high")}
							className={`curator-pill-btn ${selectedPriceRange === "high" ? "active" : ""}`}
							style={{ minHeight: "36px", padding: "4px 10px", fontSize: "12px" }}
						>
							&gt; 150 тыс. ₽
						</button>

						<button
							type="button"
							onClick={() => setOnlyAttentionFlags(!onlyAttentionFlags)}
							className={`curator-pill-btn ${onlyAttentionFlags ? "active" : ""}`}
							style={{ minHeight: "36px", padding: "4px 10px", fontSize: "12px", marginLeft: "8px" }}
						>
							<AlertTriangle className="w-3.5 h-3.5" />
							Только требующие внимания
						</button>
					</div>

					<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
						<span style={{ fontSize: "12px", color: "var(--ink-muted, #64748b)", fontWeight: 600 }}>
							Сортировка:
						</span>
						<select
							value={sortBy}
							onChange={(e: any) => setSortBy(e.target.value)}
							className="curator-select-input"
							style={{ minHeight: "36px", padding: "4px 10px", fontSize: "12px" }}
						>
							<option value="priority">По приоритету</option>
							<option value="sum_desc">По сумме сметы</option>
							<option value="days_in_stage_desc">По дням на этапе</option>
							<option value="assigned_at_desc">По дате назначения</option>
						</select>
					</div>
				</div>

				{/* Список карточек очереди */}
				{filteredQueue.length === 0 ? (
					<div
						style={{
							padding: "40px 20px",
							textAlign: "center",
							color: "var(--ink-muted, #64748b)",
							backgroundColor: "var(--paper, #f8fafc)",
							borderRadius: "12px",
						}}
					>
						<CheckCircle className="w-8 h-8" style={{ margin: "0 auto 10px", color: "var(--teal, #0d9488)" }} />
						<div style={{ fontSize: "15px", fontWeight: 700 }}>Все пациенты обработаны</div>
						<p style={{ fontSize: "13px", marginTop: "4px" }}>
							По выбранным фильтрам нет пациентов, ожидающих действий куратора.
						</p>
					</div>
				) : (
					<div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
						{filteredQueue.map((item) => {
							const stageDef = CURATOR_STAGE_DEFINITIONS.find((d) => d.stage === item.funnelStage);
							const initials = item.patientFullName
								.split(" ")
								.map((n) => n[0])
								.slice(0, 2)
								.join("");

							return (
								<div key={item.treatmentPlanId} className="curator-patient-card">
									<div className="curator-patient-card-header">
										<div className="curator-patient-info">
											<div className="curator-patient-avatar">{initials}</div>
											<div>
												<h4
													className="curator-patient-name"
													style={{ cursor: "pointer" }}
													onClick={() => onOpenPatientCard?.(item.patientId)}
												>
													{item.patientFullName}
												</h4>
												<p className="curator-patient-phone">
													{item.patientPhone || "Телефон не указан"}
													{item.doctorFullName ? ` • Врач: ${item.doctorFullName}` : ""}
												</p>
											</div>
										</div>

										<div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
											{/* Бейдж этапа */}
											<span
												className={`curator-kpi-badge curator-badge-${stageDef?.colorTheme || "blue"}`}
												style={{ fontSize: "12px", padding: "4px 10px" }}
											>
												Этап {stageDef?.stepNumber}: {stageDef?.title}
											</span>

											<span
												style={{
													fontSize: "12px",
													color: "var(--ink-muted, #64748b)",
													display: "inline-flex",
													alignItems: "center",
													gap: "4px",
												}}
											>
												<Clock className="w-3.5 h-3.5" />
												{item.daysInStage} дн.
											</span>
										</div>
									</div>

									{/* Флаги внимания */}
									{item.attentionFlags.length > 0 && (
										<div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
											{item.attentionFlags.includes("stagnant_plan") && (
												<span className="curator-kpi-badge curator-badge-amber">
													<Clock className="w-3 h-3" /> Застрял на этапе &gt; нормы
												</span>
											)}
											{item.attentionFlags.includes("high_value_plan") && (
												<span className="curator-kpi-badge curator-badge-purple">
													<Award className="w-3 h-3" /> Крупная смета &gt; 150к
												</span>
											)}
											{item.attentionFlags.includes("pending_prepayment") && (
												<span className="curator-kpi-badge curator-badge-amber">
													<DollarSign className="w-3 h-3" /> Ожидает аванс
												</span>
											)}
											{item.attentionFlags.includes("requires_followup_call") && (
												<span className="curator-kpi-badge curator-badge-blue">
													<Phone className="w-3 h-3" /> Нужен звонок
												</span>
											)}
										</div>
									)}

									{/* Финансовая сводка по плану */}
									<div className="curator-patient-financials">
										<div className="curator-fin-item" style={{ flex: 1 }}>
											<span className="curator-fin-label">План лечения</span>
											<span className="curator-fin-value" style={{ fontSize: "13px" }}>
												{item.treatmentPlanTitle}
											</span>
										</div>
										<div className="curator-fin-item">
											<span className="curator-fin-label">Итого по смете</span>
											<span className="curator-fin-value">
												{item.planTotalPriceRub.toLocaleString("ru-RU")} ₽
											</span>
										</div>
										<div className="curator-fin-item">
											<span className="curator-fin-label">Внесено</span>
											<span className="curator-fin-value" style={{ color: "var(--teal, #0d9488)" }}>
												{item.paidAmountRub.toLocaleString("ru-RU")} ₽
											</span>
										</div>
										<div className="curator-fin-item">
											<span className="curator-fin-label">Остаток</span>
											<span className="curator-fin-value" style={{ color: item.remainingAmountRub > 0 ? "var(--accent, #6366f1)" : "var(--ink-muted, #64748b)" }}>
												{item.remainingAmountRub.toLocaleString("ru-RU")} ₽
											</span>
										</div>
										<div className="curator-fin-item">
											<span className="curator-fin-label">Куратор</span>
											<span className="curator-fin-value" style={{ fontSize: "13px" }}>
												{item.curatorFullName}
											</span>
										</div>
									</div>

									{/* Кнопки действий (тач-таргеты >= 44px) */}
									<div className="curator-patient-actions">
										{stageDef?.nextStage && (
											<button
												type="button"
												onClick={() => handleAdvanceStage(item)}
												className="curator-action-btn curator-action-primary"
											>
												<CheckCircle2 className="w-4 h-4" />
												{stageDef.targetActionLabel}
											</button>
										)}

										<button
											type="button"
											onClick={() => onOpenPatientPlan?.(item.patientId, item.treatmentPlanId)}
											className="curator-action-btn curator-action-secondary"
										>
											<Layers className="w-4 h-4" />
											Смета и 3 тарифа
										</button>

										{item.patientPhone && (
											<a
												href={`tel:${item.patientPhone}`}
												className="curator-action-btn curator-action-secondary"
												style={{ textDecoration: "none" }}
											>
												<Phone className="w-4 h-4" />
												Позвонить
											</a>
										)}

										<button
											type="button"
											onClick={() =>
												setAssignmentTarget({
													patientId: item.patientId,
													patientName: item.patientFullName,
													planId: item.treatmentPlanId,
													planTitle: item.treatmentPlanTitle,
													currentCuratorId: item.curatorId,
												})
											}
											className="curator-action-btn curator-action-secondary"
											title="Сменить куратора или параметры"
										>
											<UserPlus className="w-4 h-4" />
											Куратор
										</button>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>

			{/* Модалка закрепления / смены куратора */}
			{assignmentTarget && (
				<CuratorPlanAssignmentModal
					isOpen={Boolean(assignmentTarget)}
					patientId={assignmentTarget.patientId}
					patientName={assignmentTarget.patientName}
					treatmentPlanId={assignmentTarget.planId}
					treatmentPlanTitle={assignmentTarget.planTitle}
					{...(assignmentTarget.currentCuratorId ? { currentCuratorId: assignmentTarget.currentCuratorId } : {})}
					onClose={() => setAssignmentTarget(null)}
					onAssigned={(assignedData: CuratorPlanAssignmentPayload) => {
						// Update local state
						setQueueItems((prev) =>
							prev.map((it) => {
								if (it.treatmentPlanId === assignmentTarget.planId) {
									return {
										...it,
										curatorId: assignedData.curatorId,
										curatorFullName: assignedData.curatorFullName,
										funnelStage: assignedData.initialStage,
										notes: assignedData.notes || it.notes,
									};
								}
								return it;
							}),
						);
						setAssignmentTarget(null);
					}}
				/>
			)}
		</div>
	);
};
