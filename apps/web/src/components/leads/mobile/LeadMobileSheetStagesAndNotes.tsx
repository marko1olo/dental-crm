/**
 * DENTE Dental CRM — Leads Mobile Bottom Sheet Stages & Notes
 * 1-Tap Stage Switcher in Natural Thumb Zone & Curator Notes
 * Mandate 8b (<= 120 lines)
 */

import { Check } from "lucide-react";
import React from "react";
import type { Lead, LeadStatus } from "../../../store/leadsStore";
import { COLUMNS, isLeadInKanbanColumn } from "../leadsKanbanTypes";

interface LeadMobileSheetStagesAndNotesProps {
	lead: Lead;
	notesText: string;
	setNotesText: (txt: string) => void;
	isSavingNotes: boolean;
	onSaveNotes: () => void;
	onStageClick: (e: React.MouseEvent, status: LeadStatus) => void;
}

export const LeadMobileSheetStagesAndNotes: React.FC<
	LeadMobileSheetStagesAndNotesProps
> = ({
	lead,
	notesText,
	setNotesText,
	isSavingNotes,
	onSaveNotes,
	onStageClick,
}) => {
	return (
		<>
			<div className="rounded-[16px] bg-[var(--paper-soft)] border border-[var(--line)] p-3.5 space-y-2">
				<div className="flex items-center justify-between">
					<span className="text-[12px] font-semibold uppercase tracking-wider text-[var(--muted)]">
						Заметки куратора
					</span>
					<button
						type="button"
						onClick={onSaveNotes}
						disabled={isSavingNotes || notesText === (lead.notes || "")}
						className="min-h-[32px] px-2.5 rounded-[6px] text-[12px] font-semibold bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal)] disabled:opacity-40 transition-all cursor-pointer"
					>
						{isSavingNotes ? "Сохранение..." : "Сохранить"}
					</button>
				</div>
				<textarea
					rows={3}
					value={notesText}
					onChange={(e) => setNotesText(e.target.value)}
					placeholder="Заметки по пациенту, жалобы, удобное время визита..."
					className="w-full p-2.5 rounded-[10px] bg-[var(--paper)] border border-[var(--line)] text-[13px] text-[var(--ink)] focus:outline-none focus:border-[var(--teal)] resize-y"
				/>
			</div>

			<div className="rounded-[16px] bg-[var(--paper-soft)] border border-[var(--line)] p-3.5 space-y-2.5">
				<div className="text-[12px] font-semibold uppercase tracking-wider text-[var(--muted)]">
					Перевести на этап воронки (1 тап)
				</div>
				<div className="grid grid-cols-2 gap-2">
					{COLUMNS.map((col) => {
						const isCurrent = isLeadInKanbanColumn(lead.status, col.id);
						return (
							<button
								key={col.id}
								type="button"
								onClick={(e) => onStageClick(e, col.id)}
								className={`min-h-[44px] px-3 rounded-[12px] text-[13px] font-medium border flex items-center justify-between gap-2 transition-all ${
									isCurrent
										? "bg-[var(--paper)] border-[var(--teal)] text-[var(--teal-dark,var(--teal))] font-bold shadow-xs"
										: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] active:bg-[var(--paper-soft)]"
								}`}
								data-testid={`stage-switch-btn-${col.id}`}
							>
								<div className="flex items-center gap-2 truncate">
									<span
										className="w-2.5 h-2.5 rounded-full shrink-0"
										style={{ background: col.color }}
									/>
									<span className="truncate">{col.label}</span>
								</div>
								{isCurrent && (
									<Check size={15} className="shrink-0 text-[var(--teal)]" />
								)}
							</button>
						);
					})}
				</div>
			</div>
		</>
	);
};
