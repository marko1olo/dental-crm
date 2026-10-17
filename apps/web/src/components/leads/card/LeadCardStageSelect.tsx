/**
 * DENTE Dental CRM — Lead Card Stage Select & Next Stage Advancer
 * Mandate 8b (<= 120 lines)
 */

import React from "react";
import { ArrowRight, Check } from "lucide-react";
import type { Lead } from "../../../store/leadsStore";
import { NEXT_STAGE_MAP } from "../leadsKanbanConstants";

interface LeadCardStageSelectProps {
	lead: Lead;
	borderColor: string;
	onStatusChange: (
		e: React.MouseEvent | React.ChangeEvent<HTMLSelectElement>,
		leadId: string,
		nextStatus: Lead["status"],
		options?: { reason?: string; dropReason?: string },
	) => void;
}

export const LeadCardStageSelect: React.FC<LeadCardStageSelectProps> = ({
	lead,
	borderColor,
	onStatusChange,
}) => {
	const currentSelectValue =
		lead.status === "new"
			? "new"
			: lead.status === "contacted"
				? "contacted"
				: lead.status === "consult_booked" ||
						lead.status === "showed_up" ||
						lead.status === "converted"
					? "consult_booked"
					: "trash";

	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				gap: 6,
				marginTop: "4px",
				paddingTop: "6px",
				borderTop: `1px solid ${borderColor}`,
			}}
			onClick={(e) => e.stopPropagation()}
		>
			<select
				value={currentSelectValue}
				onClick={(e) => e.stopPropagation()}
				onChange={(e) => {
					const nextVal = e.target.value as Lead["status"];
					if (nextVal === "trash") {
						onStatusChange(e, lead.id, nextVal, {
							dropReason: lead.dropReason || "Отказ / Неактуально",
						});
					} else {
						onStatusChange(e, lead.id, nextVal);
					}
				}}
				className="h-8 min-h-[32px] text-[12px] font-medium px-2 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] cursor-pointer outline-none flex-1 min-w-0 hover:border-[var(--line-strong,var(--line))]"
				title="Сменить статус обращения"
				aria-label="Выбрать статус обращения"
			>
				<option value="new">Новые обращения</option>
				<option value="contacted">Думают / Перезвонить</option>
				<option value="consult_booked">Записаны на приём</option>
				<option value="trash">Не дошли / Архив</option>
			</select>

			{NEXT_STAGE_MAP[lead.status] ? (
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onStatusChange(e, lead.id, NEXT_STAGE_MAP[lead.status]!.status);
					}}
					className="secondary-button h-8 min-h-[32px] px-2.5 rounded-lg text-[11px] font-semibold bg-[var(--paper-soft)] text-[var(--teal)] border border-[var(--line)] inline-flex items-center justify-center gap-1 cursor-pointer transition-all hover:border-[var(--teal)] shrink-0"
					title={`Перевести на этап ${NEXT_STAGE_MAP[lead.status]!.label}`}
					data-testid={`advance-stage-btn-${lead.id}`}
				>
					<span>Далее</span>
					<ArrowRight size={12} className="shrink-0" />
				</button>
			) : lead.status === "showed_up" ? (
				<span
					className="h-8 min-h-[32px] px-2.5 rounded-lg text-[11px] font-semibold bg-[var(--teal-soft)] text-[var(--teal)] border border-[var(--line)] inline-flex items-center justify-center gap-1 shrink-0"
					title="Пациент пришёл в клинику"
				>
					<Check size={12} className="shrink-0" />
					<span>В клинике</span>
				</span>
			) : null}
		</div>
	);
};
