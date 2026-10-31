/**
 * apps/web/src/components/lab/studioModal/LabStagesTimelineView.tsx
 *
 * DENTE Dental CRM — Dental Lab Order Card & 5-Stage Timeline View.
 * Displays orthopedic order details, stage progress bar, and 1-click stage advancement.
 * Mandate 8b modular design, Mandate 8e doctor autonomy, Mandate 8am secondary action.
 */

import React from "react";
import {
	CANONICAL_LAB_STAGES,
	type DentalLabOrderEntry,
	formatKopecksToRubles,
	getStageMeta,
	getMaterialMeta,
	isOrderOverdue,
} from "../dentalLabCatalogData";

export interface LabStagesTimelineViewProps {
	readonly order: DentalLabOrderEntry;
	readonly onAdvanceStage: (orderId: string) => void;
}

export const LabStagesTimelineView: React.FC<LabStagesTimelineViewProps> = ({
	order,
	onAdvanceStage,
}) => {
	const stageMeta = getStageMeta(order.stage);
	const matMeta = getMaterialMeta(order.materialId);
	const overdue = isOrderOverdue(order);

	return (
		<article
			data-testid={`lab-order-card-${order.id}`}
			className="bg-[var(--paper-strong)] border border-[var(--line)] rounded-2xl p-3 sm:p-3.5 hover:border-[var(--line-strong)] transition-all space-y-2 shadow-2xs"
		>
			{/* Верхняя строка карточки: Номер, Срочность и Статус */}
			<div className="flex items-center justify-between gap-1.5 flex-wrap">
				<div className="flex items-center gap-1.5">
					<span className="text-xs font-bold font-mono px-2 py-0.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]">
						{order.orderNumber}
					</span>
					{order.isUrgent && (
						<span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[var(--rose-surface,#fee2e2)] text-[var(--rose-ink,#991b1b)] border border-[var(--rose,#ef4444)]/40">
							СРОЧНО
						</span>
					)}
					<span className="text-[11px] text-[var(--ink-muted)] truncate max-w-[180px]">
						{order.laboratoryName}
					</span>
				</div>

				{/* Бейдж этапа */}
				<span
					data-testid={`order-stage-badge-${order.id}`}
					className="text-[11px] font-bold px-2.5 py-0.5 rounded-xl border flex items-center gap-1.5 shrink-0"
					style={{
						backgroundColor: stageMeta.bgToken,
						borderColor: stageMeta.borderToken,
						color: stageMeta.textToken,
					}}
				>
					<span
						className="w-1.5 h-1.5 rounded-full"
						style={{ backgroundColor: stageMeta.borderToken }}
					/>
					{stageMeta.labelRu}
				</span>
			</div>

			{/* Данные пациента и зубов */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
				<div className="min-w-0">
					<strong className="text-[var(--ink)] text-xs sm:text-sm block truncate">
						{order.patientName}
					</strong>
					<div className="text-[11px] text-[var(--ink-muted)] truncate">
						{matMeta.titleRu} • Оттенок Vita:{" "}
						<strong className="text-[var(--ink)]">{order.shadeCode}</strong>
					</div>
				</div>
				<div className="text-left sm:text-right shrink-0">
					<span className="font-bold text-[11px] bg-[var(--teal-surface)] text-[var(--teal)] px-2 py-0.5 rounded-lg border border-[var(--teal)]/30">
						Зубы FDI: {order.teeth.join(", ")}
					</span>
				</div>
			</div>

			{/* Прогресс-бар 5 этапов изготовления */}
			<div className="grid grid-cols-5 gap-1 pt-0.5">
				{CANONICAL_LAB_STAGES.map((st) => {
					const isDone = st.stepNumber <= stageMeta.stepNumber;
					const isCurrent = st.id === order.stage;
					return (
						<div
							key={st.id}
							title={st.labelRu}
							className={`h-1.5 rounded-full transition-all ${
								isCurrent
									? "bg-[var(--teal)] ring-1 ring-[var(--teal)]"
									: isDone
										? "bg-[var(--teal)]/70"
										: "bg-[var(--line)]"
							}`}
						/>
					);
				})}
			</div>

			{/* Нижняя информационная строка и действие */}
			<div className="flex items-center justify-between pt-1.5 border-t border-[var(--line)] flex-wrap gap-2 text-xs">
				<div className="flex items-center gap-2.5">
					<span
						className={
							overdue
								? "font-bold text-[var(--rose-ink,#991b1b)]"
								: "text-[var(--ink-muted)]"
						}
					>
						Срок: {order.dueDate} {overdue && "(Просрочен)"}
					</span>
					<span className="text-[var(--ink-muted)] hidden sm:inline text-[11px]">
						Себестоимость:{" "}
						<strong className="text-[var(--ink)]">
							{formatKopecksToRubles(order.labCostKopecks)}
						</strong>
					</span>
				</div>

				{/* Кнопка смены этапа (Вторичная нейтральная кнопка без #0d9488 — Мандат 8am) */}
				{order.stage !== "seated" && (
					<button
						type="button"
						data-testid={`advance-stage-btn-${order.id}`}
						onClick={() => onAdvanceStage(order.id)}
						className="px-2.5 py-1 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] font-semibold text-xs transition-colors flex items-center gap-1 min-h-[32px] cursor-pointer"
					>
						<span>Перевести этап →</span>
					</button>
				)}
			</div>
		</article>
	);
};

export default LabStagesTimelineView;
