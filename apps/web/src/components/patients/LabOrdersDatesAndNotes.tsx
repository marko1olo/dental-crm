import type React from "react";

interface LabOrdersDatesAndNotesProps {
	fittingDate: string;
	setFittingDate: (v: string) => void;
	dueDate: string;
	setDueDate: (v: string) => void;
	clinicalNotes: string;
	setClinicalNotes: (v: string) => void;
}

export const LabOrdersDatesAndNotes: React.FC<LabOrdersDatesAndNotesProps> = ({
	fittingDate,
	setFittingDate,
	dueDate,
	setDueDate,
	clinicalNotes,
	setClinicalNotes,
}) => (
	<div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
		<div>
			<label className="block text-[11px] font-bold text-[var(--muted)] mb-1">
				Дата примерки (каркас/бисквит)
			</label>
			<input
				type="date"
				value={fittingDate}
				onChange={(e) => setFittingDate(e.target.value)}
				className="w-full h-8 px-2 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--ink)] focus:ring-1 focus:ring-[var(--teal)]"
				data-testid="lab-order-quick-fitting-date-input"
			/>
		</div>

		<div>
			<label className="block text-[11px] font-bold text-[var(--muted)] mb-1">
				Срок сдачи / Дедлайн ЗТЛ
			</label>
			<input
				type="date"
				value={dueDate}
				onChange={(e) => setDueDate(e.target.value)}
				className="w-full h-8 px-2 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--ink)] focus:ring-1 focus:ring-[var(--teal)]"
				data-testid="lab-order-quick-due-date-input"
			/>
		</div>

		<div>
			<label className="block text-[11px] font-bold text-[var(--muted)] mb-1">
				Клинические примечания технику
			</label>
			<input
				type="text"
				placeholder="Контакты, прикус, мамелоны..."
				value={clinicalNotes}
				onChange={(e) => setClinicalNotes(e.target.value)}
				className="w-full h-8 px-2 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--ink)] focus:ring-1 focus:ring-[var(--teal)]"
			/>
		</div>
	</div>
);
