/**
 * Карточка пациента в очереди куратора.
 * Отображает статус этапа, флаги внимания, финансовую сводку и действия куратора.
 */

import {
	CURATOR_STAGE_DEFINITIONS,
	type CuratorPatientQueueItem,
} from "@dental/shared";
import {
	Award,
	CheckCircle2,
	Clock,
	DollarSign,
	Layers,
	MoreVertical,
	Phone,
	UserPlus,
} from "lucide-react";
import React from "react";

export interface CuratorQueueCardProps {
	readonly item: CuratorPatientQueueItem;
	readonly isOpenMenu: boolean;
	readonly onToggleMenu: () => void;
	readonly onCloseMenu: () => void;
	readonly onOpenPatientCard?: (patientId: string) => void;
	readonly onOpenPatientPlan?: (patientId: string, planId: string) => void;
	readonly onAdvanceStage: (item: CuratorPatientQueueItem) => void;
	readonly onAssignCurator: (target: {
		patientId: string;
		patientName: string;
		planId: string;
		planTitle: string;
		currentCuratorId?: string | null;
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
	const stageDef = CURATOR_STAGE_DEFINITIONS.find(
		(d) => d.stage === item.funnelStage,
	);
	const initials = item.patientFullName
		.split(" ")
		.map((n) => n[0])
		.slice(0, 2)
		.join("");

	return (
		<div className="curator-patient-card">
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

			{/* Кнопки действий */}
			<div className="curator-patient-actions">
				{stageDef?.nextStage ? (
					<>
						<button
							type="button"
							onClick={() => onAdvanceStage(item)}
							className="curator-action-btn curator-action-primary"
						>
							<CheckCircle2 className="w-4 h-4" />
							{stageDef.targetActionLabel}
						</button>

						<button
							type="button"
							onClick={() => onOpenPatientPlan?.(item.patientId, item.treatmentPlanId)}
							className="curator-action-btn curator-action-secondary"
						>
							<Layers className="w-4 h-4" />
							Смета и 3 тарифа
						</button>
					</>
				) : (
					<>
						<button
							type="button"
							onClick={() => onOpenPatientPlan?.(item.patientId, item.treatmentPlanId)}
							className="curator-action-btn curator-action-primary"
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
					</>
				)}

				{/* Меню дополнительных действий (...) */}
				<div className="relative" style={{ position: "relative" }}>
					<button
						type="button"
						onClick={onToggleMenu}
						className="curator-action-btn curator-action-secondary"
						style={{ minWidth: "44px", width: "44px", padding: 0, justifyContent: "center" }}
						title="Дополнительные действия"
					>
						<MoreVertical className="w-4 h-4" />
					</button>
					{isOpenMenu && (
						<div
							className="curator-card-dropdown"
							style={{
								position: "absolute",
								right: 0,
								bottom: "calc(100% + 4px)",
								minWidth: "180px",
								background: "var(--paper, #fff)",
								border: "1px solid var(--line, #e2e8f0)",
								borderRadius: "10px",
								boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
								padding: "4px",
								zIndex: 30,
								display: "flex",
								flexDirection: "column",
								gap: "2px",
							}}
						>
							{item.patientPhone && stageDef?.nextStage && (
								<a
									href={`tel:${item.patientPhone}`}
									style={{
										display: "flex",
										alignItems: "center",
										gap: "8px",
										padding: "8px 12px",
										fontSize: "13px",
										color: "var(--ink, #0f172a)",
										textDecoration: "none",
										borderRadius: "6px",
										minHeight: "44px",
									}}
									onClick={onCloseMenu}
								>
									<Phone className="w-4 h-4 text-[var(--teal)]" />
									<span>Позвонить</span>
								</a>
							)}
							<button
								type="button"
								onClick={() => {
									onCloseMenu();
									onAssignCurator({
										patientId: item.patientId,
										patientName: item.patientFullName,
										planId: item.treatmentPlanId,
										planTitle: item.treatmentPlanTitle,
										currentCuratorId: item.curatorId,
									});
								}}
								style={{
									display: "flex",
									alignItems: "center",
									gap: "8px",
									padding: "8px 12px",
									fontSize: "13px",
									color: "var(--ink, #0f172a)",
									background: "transparent",
									border: 0,
									borderRadius: "6px",
									cursor: "pointer",
									textAlign: "left",
									minHeight: "44px",
								}}
							>
								<UserPlus className="w-4 h-4 text-[var(--teal)]" />
								<span>Сменить куратора</span>
							</button>
							{onOpenPatientCard && (
								<button
									type="button"
									onClick={() => {
										onCloseMenu();
										onOpenPatientCard(item.patientId);
									}}
									style={{
										display: "flex",
										alignItems: "center",
										gap: "8px",
										padding: "8px 12px",
										fontSize: "13px",
										color: "var(--ink, #0f172a)",
										background: "transparent",
										border: 0,
										borderRadius: "6px",
										cursor: "pointer",
										textAlign: "left",
										minHeight: "44px",
									}}
								>
									<span>Карта пациента</span>
								</button>
							)}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};
