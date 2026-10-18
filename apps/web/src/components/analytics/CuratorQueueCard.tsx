import {
	CURATOR_STAGE_DEFINITIONS,
	type CuratorPatientQueueItem,
} from "@dental/shared";
import { CheckCircle2, Clock, Layers, Phone } from "lucide-react";
import React from "react";
import { CuratorCardActionsMenu } from "./curatorModules/CuratorCardActionsMenu";
import { CuratorCardAttentionBadges } from "./curatorModules/CuratorCardAttentionBadges";
import { CuratorCardFinancials } from "./curatorModules/CuratorCardFinancials";

export interface CuratorQueueCardProps {
	readonly item: CuratorPatientQueueItem;
	readonly isOpenMenu: boolean;
	readonly onToggleMenu: () => void;
	readonly onCloseMenu: () => void;
	readonly onOpenPatientCard?: ((patientId: string) => void) | undefined;
	readonly onOpenPatientPlan?: ((patientId: string, planId: string) => void) | undefined;
	readonly onAdvanceStage: (item: CuratorPatientQueueItem) => void;
	readonly onAssignCurator: (target: {
		patientId: string;
		patientName: string;
		planId: string;
		planTitle: string;
		currentCuratorId?: string | null | undefined;
	}) => void;
}

export const CuratorQueueCard: React.FC<CuratorQueueCardProps> = ({
	item,
	isOpenMenu,
	onToggleMenu,
	onCloseMenu,
	onOpenPatientCard,
	onOpenPatientPlan,
	onAdvanceStage,
	onAssignCurator,
}) => {
	const stageDef = CURATOR_STAGE_DEFINITIONS.find((d) => d.stage === item.funnelStage);
	const initials = item.patientFullName.split(" ").map((n) => n[0]).slice(0, 2).join("");

	return (
		<div className="curator-patient-card">
			<div className="curator-patient-card-header">
				<div className="curator-patient-info">
					<div className="curator-patient-avatar">{initials}</div>
					<div>
						<h4 className="curator-patient-name" style={{ cursor: "pointer" }} onClick={() => onOpenPatientCard?.(item.patientId)}>
							{item.patientFullName}
						</h4>
						<p className="curator-patient-phone">
							{item.patientPhone || "Телефон не указан"}
							{item.doctorFullName ? ` • Врач: ${item.doctorFullName}` : ""}
						</p>
					</div>
				</div>

				<div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
					<span className={`curator-kpi-badge curator-badge-${stageDef?.colorTheme || "blue"}`} style={{ fontSize: "12px", padding: "4px 10px" }}>
						Этап {stageDef?.stepNumber}: {stageDef?.title}
					</span>
					<span style={{ fontSize: "12px", color: "var(--ink-muted, #64748b)", display: "inline-flex", alignItems: "center", gap: "4px" }}>
						<Clock className="w-3.5 h-3.5" />
						{item.daysInStage} дн.
					</span>
				</div>
			</div>

			<CuratorCardAttentionBadges flags={item.attentionFlags} />
			<CuratorCardFinancials item={item} />

			<div className="curator-patient-actions">
				{stageDef?.nextStage ? (
					<>
						<button type="button" onClick={() => onAdvanceStage(item)} className="curator-action-btn curator-action-primary">
							<CheckCircle2 className="w-4 h-4" />
							{stageDef.targetActionLabel}
						</button>
						<button type="button" onClick={() => onOpenPatientPlan?.(item.patientId, item.treatmentPlanId)} className="curator-action-btn curator-action-secondary">
							<Layers className="w-4 h-4" />
							Смета и 3 тарифа
						</button>
					</>
				) : (
					<>
						<button type="button" onClick={() => onOpenPatientPlan?.(item.patientId, item.treatmentPlanId)} className="curator-action-btn curator-action-primary">
							<Layers className="w-4 h-4" />
							Смета и 3 тарифа
						</button>
						{item.patientPhone && (
							<a href={`tel:${item.patientPhone}`} className="curator-action-btn curator-action-secondary" style={{ textDecoration: "none" }}>
								<Phone className="w-4 h-4" />
								Позвонить
							</a>
						)}
					</>
				)}

				<CuratorCardActionsMenu
					item={item}
					isOpenMenu={isOpenMenu}
					onToggleMenu={onToggleMenu}
					onCloseMenu={onCloseMenu}
					onOpenPatientCard={onOpenPatientCard}
					onAssignCurator={onAssignCurator}
				/>
			</div>
		</div>
	);
};
