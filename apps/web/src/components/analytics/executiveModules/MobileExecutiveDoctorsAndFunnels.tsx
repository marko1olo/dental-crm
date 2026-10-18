import React, { useMemo } from "react";
import type { ExecutiveDashboardPayload } from "@dental/shared";
import { Trophy } from "lucide-react";
import type { TopDoctorPerformanceRow } from "./executiveAnalyticsTypes";
import {
	MobileDepartmentItem,
	MobileExecutiveDepartmentsSection,
} from "./MobileExecutiveDepartmentsSection";
import { MobileExecutiveFunnelSection } from "./MobileExecutiveFunnelSection";

export interface MobileExecutiveDoctorsAndFunnelsProps {
	readonly topDoctors: TopDoctorPerformanceRow[];
	readonly payload: ExecutiveDashboardPayload | null;
}

export const MobileExecutiveDoctorsAndFunnels: React.FC<MobileExecutiveDoctorsAndFunnelsProps> = ({
	topDoctors,
	payload,
}) => {
	const departmentsData: MobileDepartmentItem[] = useMemo(() => {
		if (payload?.departments && payload.departments.length > 0) {
			return payload.departments.map((dept) => ({
				key: dept.departmentKey,
				title: dept.titleRu,
				sub: dept.departmentKey === "therapy"
					? "Лечение кариеса, пульпита, эстетическая реставрация"
					: dept.departmentKey === "orthopedics"
						? "Циркониевые коронки, виниры E.max, протезирование"
						: dept.departmentKey === "surgery_implantation"
							? "Имплантаты, синус-лифтинг, сложное удаление"
							: dept.departmentKey === "orthodontics"
								? "Брекеты Damon, прозрачные элайнеры"
								: "Молочные зубы, цветные пломбы, адаптация",
				fact: dept.factRevenueFormatted,
				percent: dept.planFulfillmentPercent,
				status: dept.status === "ahead" || dept.status === "on_track" ? "success" : dept.status === "behind" ? "neutral" : "warning",
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
			{/* 4. ТОП ВРАЧЕЙ (APPLE GROUPED INSET CARDS) */}
			<section className="mobile-exec-section" aria-label="Топ врачей по выработке">
				<div className="mobile-exec-section-header">
					<span className="mobile-exec-section-title">Топ врачей по выработке</span>
					<span className="mobile-exec-section-count">{topDoctors.length} {topDoctors.length === 1 ? "врач" : "врачей"}</span>
				</div>
				<div className="mobile-exec-grouped-card">
					{topDoctors.length > 0 ? (
						topDoctors.map((doc) => (
							<div key={doc.id} className="mobile-exec-grouped-row">
								<div className="grouped-row-left">
									<div className="mobile-exec-avatar" style={{ backgroundColor: `color-mix(in srgb, ${doc.badgeColor} 18%, transparent)` }}>
										{doc.rank === 1 ? (
											<Trophy size={16} style={{ color: "var(--teal, #0d9488)" }} aria-hidden="true" />
										) : (
											<span className="avatar-initials" style={{ color: doc.badgeColor }}>{doc.initials}</span>
										)}
									</div>
									<div className="grouped-row-meta">
										<div className="grouped-row-name">{doc.name}</div>
										<div className="grouped-row-sub">{doc.specialty} • {doc.visits} виз. • Ср. чек {doc.averageCheckFormatted}</div>
									</div>
								</div>
								<div className="grouped-row-right">
									<div className="grouped-row-amount font-mono">{doc.billed}</div>
									<div className="grouped-row-status">Доходимость {doc.attendance} • Планы {doc.complexPlansShare}</div>
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

			<MobileExecutiveDepartmentsSection departmentsData={departmentsData} />
			<MobileExecutiveFunnelSection funnelStages={funnelStages} />
		</>
	);
};
