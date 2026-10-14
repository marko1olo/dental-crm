import React, { useMemo } from "react";
import type { ExecutiveDashboardPayload, ExecutiveKpisSummary } from "@dental/shared";
import { Activity, Sparkles, Trophy, Users } from "lucide-react";
import {
	computeChairEconomicsSummary,
	type MobileAnalyticsPeriod,
	type TopDoctorPerformanceRow,
} from "./executiveAnalyticsTypes";

export function buildTopDoctorsPerformanceRows(
	doctorsReport: any[],
	activePeriod: MobileAnalyticsPeriod,
	isDemo: boolean,
): TopDoctorPerformanceRow[] {
	if (doctorsReport && doctorsReport.length > 0) {
		return doctorsReport.slice(0, 5).map((doc: any, idx: number) => {
			const appts = doc.appointments || {};
			const total = Number(appts.total || 0);
			const completed = Number(appts.completed || 0);
			const visitsCount = Math.max(1, completed || total || 1);
			const revenueRub = Math.round(Number(doc.revenueRub || 0));
			const avgCheckRub = Math.round(revenueRub / visitsCount);
			const attendance = total > 0 ? `${Math.round((completed / total) * 100)}%` : "—";
			const name = doc.doctorName || "Врач клиники";
			const initials = name
				.split(" ")
				.filter(Boolean)
				.map((w: string) => w[0])
				.slice(0, 2)
				.join("")
				.toUpperCase();
			return {
				id: doc.doctorUserId || `doc-${idx}`,
				name,
				specialty: "Стоматолог",
				initials: initials || "ВК",
				billed: `${revenueRub.toLocaleString("ru-RU")} ₽`,
				averageCheckFormatted: `${avgCheckRub.toLocaleString("ru-RU")} ₽`,
				visits: completed || total,
				attendance,
				complexPlansShare: doc.complexPlansShare || "65%",
				rank: idx + 1,
				badgeColor: "var(--teal, #0d9488)",
			};
		});
	}

	if (isDemo) {
		return [
			{
				id: "doc-1",
				name: "Д-р Воронов А. В.",
				specialty: "Терапия, Ортопедия",
				initials: "ВА",
				billed: activePeriod === "day" ? "68 000 ₽" : activePeriod === "week" ? "420 000 ₽" : "1 580 000 ₽",
				averageCheckFormatted: "32 900 ₽",
				visits: activePeriod === "day" ? 5 : activePeriod === "week" ? 22 : 48,
				attendance: "96%",
				complexPlansShare: "74%",
				rank: 1,
				badgeColor: "var(--teal, #0d9488)",
			},
			{
				id: "doc-2",
				name: "Д-р Соколова Е. И.",
				specialty: "Ортодонтия",
				initials: "СЕ",
				billed: activePeriod === "day" ? "45 000 ₽" : activePeriod === "week" ? "310 000 ₽" : "1 240 000 ₽",
				averageCheckFormatted: "34 400 ₽",
				visits: activePeriod === "day" ? 4 : activePeriod === "week" ? 18 : 36,
				attendance: "92%",
				complexPlansShare: "82%",
				rank: 2,
				badgeColor: "var(--teal, #0d9488)",
			},
			{
				id: "doc-3",
				name: "Д-р Морозов Д. С.",
				specialty: "Хирургия, Имплантация",
				initials: "МД",
				billed: activePeriod === "day" ? "38 000 ₽" : activePeriod === "week" ? "290 000 ₽" : "1 150 000 ₽",
				averageCheckFormatted: "41 000 ₽",
				visits: activePeriod === "day" ? 3 : activePeriod === "week" ? 14 : 28,
				attendance: "89%",
				complexPlansShare: "78%",
				rank: 3,
				badgeColor: "var(--teal, #0d9488)",
			},
			{
				id: "doc-4",
				name: "Д-р Кузнецова А. П.",
				specialty: "Детская стоматология",
				initials: "КА",
				billed: activePeriod === "day" ? "24 000 ₽" : activePeriod === "week" ? "160 000 ₽" : "880 000 ₽",
				averageCheckFormatted: "20 950 ₽",
				visits: activePeriod === "day" ? 4 : activePeriod === "week" ? 16 : 42,
				attendance: "94%",
				complexPlansShare: "62%",
				rank: 4,
				badgeColor: "var(--teal, #0d9488)",
			},
		];
	}

	return [];
}

export interface MobileExecutiveDoctorsAndFunnelsProps {
	readonly topDoctors: TopDoctorPerformanceRow[];
	readonly payload: ExecutiveDashboardPayload | null;
}

export const MobileExecutiveDoctorsAndFunnels: React.FC<MobileExecutiveDoctorsAndFunnelsProps> = ({
	topDoctors,
	payload,
}) => {
	const departmentsData = useMemo(() => {
		if (payload?.departments && payload.departments.length > 0) {
			return payload.departments.map((dept) => ({
				key: dept.departmentKey,
				title: dept.titleRu,
				sub:
					dept.departmentKey === "therapy"
						? "Лечение кариеса, пульпита, эстетическая реставрация"
						: dept.departmentKey === "orthopedics"
							? "Циркониевые коронки, виниры E.max, протезирование"
							: dept.departmentKey === "surgery_implantation"
								? "Имплантаты, синус-лифтинг, сложное удаление"
								: dept.departmentKey === "orthodontics"
									? "Брекеты Damon, прозрачные элайнеры"
									: "Молочные зубы, цветные пломбы, адаптация",
				fact: dept.factRevenueFormatted,
				plan: dept.planRevenueFormatted,
				percent: dept.planFulfillmentPercent,
				share: dept.shareOfTotalRevenuePercent,
				status:
					dept.status === "ahead" || dept.status === "on_track"
						? "success"
						: dept.status === "behind"
							? "neutral"
							: "warning",
			}));
		}
		return [];
	}, [payload]);

	const funnelStages = useMemo(() => {
		if (payload?.funnelStages && payload.funnelStages.length > 0) {
			return payload.funnelStages.map((st) => ({
				num: st.stepNumber,
				title: st.shortTitle || st.title,
				count: st.count,
				conversion: st.conversionFromPreviousPercent,
				isAi: Boolean(st.isAiAssisted),
				volume: st.totalVolumeFormatted,
			}));
		}
		return [];
	}, [payload]);

	return (
		<>
			{/* ─── 4. ТОП ВРАЧЕЙ (APPLE GROUPED INSET CARDS) ─────────────────────────── */}
			<section className="mobile-exec-section" aria-label="Топ врачей по выработке">
				<div className="mobile-exec-section-header">
					<span className="mobile-exec-section-title">Топ врачей по выработке</span>
					<span className="mobile-exec-section-count">
						{topDoctors.length} {topDoctors.length === 1 ? "врач" : "врачей"}
					</span>
				</div>

				<div className="mobile-exec-grouped-card">
					{topDoctors.length > 0 ? (
						topDoctors.map((doc) => (
							<div key={doc.id} className="mobile-exec-grouped-row">
								<div className="grouped-row-left">
									<div
										className="mobile-exec-avatar"
										style={{ backgroundColor: `color-mix(in srgb, ${doc.badgeColor} 18%, transparent)` }}
									>
										{doc.rank === 1 ? (
											<Trophy size={16} style={{ color: "var(--teal, #0d9488)" }} aria-hidden="true" />
										) : (
											<span className="avatar-initials" style={{ color: doc.badgeColor }}>
												{doc.initials}
											</span>
										)}
									</div>

									<div className="grouped-row-meta">
										<div className="grouped-row-name">{doc.name}</div>
										<div className="grouped-row-sub">
											{doc.specialty} • {doc.visits} виз. • Ср. чек {doc.averageCheckFormatted}
										</div>
									</div>
								</div>

								<div className="grouped-row-right">
									<div className="grouped-row-amount font-mono">{doc.billed}</div>
									<div className="grouped-row-status">
										Доходимость {doc.attendance} • Планы {doc.complexPlansShare}
									</div>
								</div>
							</div>
						))
					) : (
						<div style={{ padding: "1.25rem", textAlign: "center", fontSize: "0.8125rem", color: "var(--muted, #64748b)" }}>
							Данные о выработке врачей появятся после закрытия смен в выбранном периоде
						</div>
					)}
				</div>
			</section>

			{/* ─── 5. ТОП НАПРАВЛЕНИЙ КЛИНИКИ (APPLE GROUPED INSET CARDS) ────────────── */}
			<section className="mobile-exec-section" aria-label="План и факт по направлениям">
				<div className="mobile-exec-section-header">
					<span className="mobile-exec-section-title">План / факт по отделениям</span>
					<span className="mobile-exec-section-count">{departmentsData.length} отделений</span>
				</div>

				<div className="mobile-exec-grouped-card">
					{departmentsData.length > 0 ? (
						departmentsData.map((dept) => (
							<div key={dept.key} className="mobile-exec-grouped-row">
								<div className="grouped-row-left">
									<div className="grouped-row-meta">
										<div className="grouped-row-name">{dept.title}</div>
										<div className="grouped-row-sub">{dept.sub}</div>
									</div>
								</div>

								<div className="grouped-row-right">
									<div className="grouped-row-amount font-mono">{dept.fact}</div>
									<div className="grouped-row-status">
										<span
											className={`kpi-pill-mini ${
												dept.status === "success"
													? "kpi-badge-success"
													: dept.status === "warning"
														? "kpi-badge-warning"
														: "kpi-badge-neutral"
											}`}
										>
											{dept.percent}% плана
										</span>
									</div>
								</div>
							</div>
						))
					) : (
						<div style={{ padding: "1.25rem", textAlign: "center", fontSize: "0.8125rem", color: "var(--muted, #64748b)" }}>
							Показатели отделений появятся после оказания услуг
						</div>
					)}
				</div>
			</section>

			{/* ─── 6. СКВОЗНАЯ 8-ЭТАПНАЯ ВОРОНКА ПАЦИЕНТОВ ───────────────────────────── */}
			<section className="mobile-exec-section" aria-label="Сквозная воронка первичных пациентов">
				<div className="mobile-exec-section-header">
					<span className="mobile-exec-section-title">Сквозная воронка пациентов</span>
					<span className="mobile-exec-badge-funnel">{funnelStages.length} этапов</span>
				</div>

				<div className="mobile-exec-grouped-card">
					{funnelStages.length > 0 ? (
						funnelStages.map((st) => (
							<div key={st.num} className="mobile-exec-grouped-row">
								<div className="grouped-row-left">
									<div className="funnel-step-badge">{st.num}</div>
									<div className="grouped-row-meta">
										<div className="grouped-row-name flex items-center gap-1.5">
											<span>{st.title}</span>
											{st.isAi && (
												<span className="funnel-ai-tag">
													<Sparkles size={11} aria-hidden="true" />
													Diagnocat
												</span>
											)}
										</div>
										{st.volume && (
											<div className="grouped-row-sub font-mono text-[var(--teal)]">
												Объем: {st.volume}
											</div>
										)}
									</div>
								</div>

								<div className="grouped-row-right">
									<div className="grouped-row-amount font-mono">{st.count} пац.</div>
									<div className="grouped-row-status">Конверсия {st.conversion}%</div>
								</div>
							</div>
						))
					) : (
						<div style={{ padding: "1.25rem", textAlign: "center", fontSize: "0.8125rem", color: "var(--muted, #64748b)" }}>
							Воронка формируется на основе лидов и консультаций
						</div>
					)}
				</div>
			</section>
		</>
	);
};

export interface DesktopExecutiveTelemetryBarProps {
	readonly kpis: ExecutiveKpisSummary;
}

export const DesktopExecutiveTelemetryBar: React.FC<DesktopExecutiveTelemetryBarProps> = ({
	kpis,
}) => {
	const chairEcon = computeChairEconomicsSummary(kpis);

	return (
		<footer className="executive-telemetry-bar" aria-label="Операционная телеметрия">
			<div className="telemetry-item">
				<Users size={15} aria-hidden="true" />
				<span>Активных врачей:</span>
				<span className="telemetry-val">{kpis.activeDoctorsCount ?? 0}</span>
			</div>

			<div className="telemetry-item">
				<Activity size={15} aria-hidden="true" />
				<span>Завершено визитов:</span>
				<span className="telemetry-val">{kpis.totalCompletedVisits ?? 0}</span>
			</div>

			<div className="telemetry-item">
				<span>Первичные / Повторные:</span>
				<span className="telemetry-val">
					{kpis.primaryPatientsCount ?? 0} ({kpis.primaryPatientsPercent ?? 0}%) / {kpis.repeatPatientsCount ?? 0}
				</span>
			</div>

			<div className="telemetry-item">
				<span>Средний чек:</span>
				<span className="telemetry-val">{kpis.averageCheckFormatted || "0 ₽"}</span>
			</div>

			<div className="telemetry-item">
				<span>Себестоимость кресло-часа:</span>
				<span className="telemetry-val">{chairEcon.chairHourlyCostRub.toLocaleString("ru-RU")} ₽/ч</span>
			</div>

			<div className="telemetry-item">
				<span>Потери от неявок (No-Show):</span>
				<span className="telemetry-val">{chairEcon.noShowLostRevenueRub.toLocaleString("ru-RU")} ₽</span>
			</div>

			<div className="telemetry-item">
				<span>Маркетинговый бюджет:</span>
				<span className="telemetry-val">{kpis.totalMarketingSpendFormatted || "0 ₽"}</span>
			</div>
		</footer>
	);
};
