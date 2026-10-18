import React, { useMemo, useState } from "react";
import {
	type CuratorFunnelStage,
	type CuratorPatientQueueItem,
	calculateCuratorMetrics,
	filterAndSortCuratorQueue,
} from "@dental/shared";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { CuratorConversionFunnel } from "./CuratorConversionFunnel";
import { CuratorQueueCard } from "./CuratorQueueCard";
import { CuratorPlanAssignmentModal } from "../treatment-plans/CuratorPlanAssignmentModal";
import { CuratorHeader } from "./curatorModules/CuratorHeader";
import { CuratorKpiCardsGrid } from "./curatorModules/CuratorKpiCardsGrid";
import { CuratorQueueFiltersBar } from "./curatorModules/CuratorQueueFiltersBar";
import { mapDashboardContextToQueue } from "./curatorModules/curatorContextQueueMapper";
import { useCuratorDashboardData } from "./curatorModules/useCuratorDashboardData";
import "./curatorDashboard.css";

export interface CuratorDashboardProps {
	readonly onOpenPatientPlan?: ((patientId: string, planId: string) => void) | undefined;
	readonly onOpenPatientCard?: ((patientId: string) => void) | undefined;
	readonly className?: string | undefined;
}

export const CuratorDashboard: React.FC<CuratorDashboardProps> = ({
	onOpenPatientPlan,
	onOpenPatientCard,
	className = "",
}) => {
	const { dashboard } = useAppLogicContext();
	const [selectedCuratorId, setSelectedCuratorId] = useState<string>("all"); const [selectedStage, setSelectedStage] = useState<CuratorFunnelStage | "all">("all");
	const [selectedPriceRange, setSelectedPriceRange] = useState<"all" | "low" | "medium" | "high">("all"); const [searchQuery, setSearchQuery] = useState<string>("");
	const [onlyAttentionFlags, setOnlyAttentionFlags] = useState<boolean>(false); const [sortBy, setSortBy] = useState<"priority" | "sum_desc" | "days_in_stage_desc" | "assigned_at_desc">("priority");
	const [assignmentTarget, setAssignmentTarget] = useState<any | null>(null); const [openMenuPlanId, setOpenMenuPlanId] = useState<string | null>(null);

	const staffCurators = useMemo(() => {
		const staff = (dashboard?.clinicSettings?.staff ?? []) as any[];
		return staff.filter((s) => s.active && ["curator", "administrator", "manager", "owner"].includes(s.role));
	}, [dashboard?.clinicSettings?.staff]);

	const fallbackQueue = useMemo(
		() => mapDashboardContextToQueue(dashboard?.treatmentPlans ?? [], dashboard?.patients ?? [], dashboard?.clinicSettings?.staff ?? [], staffCurators),
		[dashboard?.treatmentPlans, dashboard?.patients, dashboard?.clinicSettings?.staff, staffCurators],
	);

	const { queueItems, advanceStage } = useCuratorDashboardData(fallbackQueue);

	const filteredQueue = useMemo(
		() => filterAndSortCuratorQueue(queueItems, { curatorId: selectedCuratorId, stage: selectedStage, priceRange: selectedPriceRange, searchQuery, onlyWithAttentionFlags: onlyAttentionFlags, sortBy }),
		[queueItems, selectedCuratorId, selectedStage, selectedPriceRange, searchQuery, onlyAttentionFlags, sortBy],
	);

	const activeCurator = staffCurators.find((c) => c.id === selectedCuratorId);
	const metrics = useMemo(
		() => calculateCuratorMetrics(queueItems, selectedCuratorId, activeCurator?.fullName || "Все кураторы"),
		[queueItems, selectedCuratorId, activeCurator],
	);

	return (
		<div className={`curator-dashboard-container ${className}`}>
			<CuratorHeader staffCurators={staffCurators} selectedCuratorId={selectedCuratorId} onSelectCuratorId={setSelectedCuratorId} />
			<CuratorKpiCardsGrid metrics={metrics} />
			<CuratorConversionFunnel metrics={metrics} selectedStage={selectedStage} onSelectStage={setSelectedStage} />

			<div className="curator-queue-section">
				<CuratorQueueFiltersBar
					searchQuery={searchQuery}
					onSearchChange={setSearchQuery}
					selectedPriceRange={selectedPriceRange}
					onSelectPriceRange={setSelectedPriceRange}
					onlyAttentionFlags={onlyAttentionFlags}
					onToggleAttentionFlags={() => setOnlyAttentionFlags((v) => !v)}
					sortBy={sortBy}
					onSortChange={setSortBy}
				/>

				<div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
					{filteredQueue.length === 0 ? (
						<div style={{ textAlign: "center", padding: "40px 20px", color: "var(--ink-muted, #64748b)" }}>
							Пациентов по выбранным фильтрам не найдено
						</div>
					) : (
						filteredQueue.map((item) => (
							<CuratorQueueCard
								key={item.treatmentPlanId}
								item={item}
								isOpenMenu={openMenuPlanId === item.treatmentPlanId}
								onToggleMenu={() => setOpenMenuPlanId((prev) => (prev === item.treatmentPlanId ? null : item.treatmentPlanId))}
								onCloseMenu={() => setOpenMenuPlanId(null)}
								onOpenPatientCard={onOpenPatientCard}
								onOpenPatientPlan={onOpenPatientPlan}
								onAdvanceStage={(it) => {
									const next = (it.funnelStage === "consultation" ? "plan_negotiation" : it.funnelStage === "plan_negotiation" ? "prepayment" : it.funnelStage === "prepayment" ? "treatment_start" : "completed") as CuratorFunnelStage;
									advanceStage(it.patientId, it.treatmentPlanId, next);
								}}
								onAssignCurator={setAssignmentTarget}
							/>
						))
					)}
				</div>
			</div>

			{assignmentTarget && (
				<CuratorPlanAssignmentModal
					isOpen={Boolean(assignmentTarget)}
					onClose={() => setAssignmentTarget(null)}
					patientId={assignmentTarget.patientId}
					patientName={assignmentTarget.patientFullName}
					treatmentPlanId={assignmentTarget.treatmentPlanId}
					treatmentPlanTitle={assignmentTarget.treatmentPlanTitle}
					currentCuratorId={assignmentTarget.curatorId}
					currentCuratorName={assignmentTarget.curatorFullName}
					currentStage={assignmentTarget.funnelStage}
				/>
			)}
		</div>
	);
};
