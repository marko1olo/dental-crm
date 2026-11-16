import { CheckCircle2 } from "lucide-react";
import React from "react";

export interface SeniorNurseDisposalPassportBarProps {
	readonly isApproved: boolean;
	readonly paperJournalAcknowledged: boolean;
	readonly approverRole: "doctor" | "senior_nurse" | "administrator" | "authorized_staff";
	readonly onApproverRoleChange: (role: "doctor" | "senior_nurse" | "administrator" | "authorized_staff") => void;
	readonly approverName: string;
	readonly onApproverNameChange: (name: string) => void;
	readonly actNumber: string;
	readonly onActNumberChange: (num: string) => void;
	readonly actDate: string;
	readonly onActDateChange: (date: string) => void;
	readonly notes: string;
	readonly onNotesChange: (notes: string) => void;
}

export const SeniorNurseDisposalPassportBar: React.FC<SeniorNurseDisposalPassportBarProps> = ({
	isApproved, paperJournalAcknowledged, approverRole, onApproverRoleChange,
	approverName, onApproverNameChange, actNumber, onActNumberChange, actDate, onActDateChange, notes, onNotesChange,
}) => {
	return (
		<div className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] space-y-3">
			<div className="flex items-center justify-between flex-wrap gap-2">
				<div className="flex items-center gap-2">
					<span className="text-xs font-bold text-[var(--ink)]">Параметры списания карпул</span>
					{isApproved && (
						<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--success-soft)] border border-[var(--success-line)] text-[var(--success-ink)] text-[11px] font-semibold">
							<CheckCircle2 size={13} className="text-[var(--success-ink)]" />
							{paperJournalAcknowledged ? "Акт утверждён (бумажный журнал учтён)" : "Акт списания утверждён"}
						</span>
					)}
				</div>
				<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] text-xs font-semibold">
					<CheckCircle2 size={13} className="text-[var(--primary)]" />
					<span>Единоличное утверждение МОЛ</span>
				</span>
			</div>

			<div className="text-xs text-[var(--ink-muted)] bg-[var(--paper)] border border-[var(--line)] rounded-lg px-3 py-2 leading-relaxed">
				<strong>СанПиН 3.3686-21:</strong> Списание использованных карпул анестетиков проводится уполномоченным сотрудником клиники в оперативном порядке.
			</div>

			<div className="grid grid-cols-1 md:grid-cols-4 gap-3">
				<div>
					<label htmlFor="act-approver-role" className="text-xs font-semibold text-[var(--muted)] block mb-1">
						Кто утверждает списание
					</label>
					<select
						id="act-approver-role"
						value={approverRole}
						onChange={(e) => onApproverRoleChange(e.target.value as typeof approverRole)}
						className="w-full h-9 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold text-[var(--ink)] outline-none focus:border-[var(--primary)]"
					>
						<option value="doctor">Врач-стоматолог (дежурный)</option>
						<option value="senior_nurse">Старшая медсестра</option>
						<option value="administrator">Администратор клиники</option>
						<option value="authorized_staff">Уполномоченный сотрудник</option>
					</select>
				</div>

				<div>
					<label htmlFor="act-approver-name" className="text-xs font-semibold text-[var(--muted)] block mb-1">
						ФИО утверждающего лица
					</label>
					<input
						id="act-approver-name"
						type="text"
						value={approverName}
						onChange={(e) => onApproverNameChange(e.target.value)}
						placeholder="ФИО сотрудника..."
						className="w-full h-9 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold text-[var(--ink)] outline-none focus:border-[var(--primary)]"
					/>
				</div>

				<div>
					<label htmlFor="act-number-input" className="text-xs font-semibold text-[var(--muted)] block mb-1">
						Номер акта
					</label>
					<input
						id="act-number-input"
						type="text"
						value={actNumber}
						onChange={(e) => onActNumberChange(e.target.value)}
						className="w-full h-9 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs font-mono font-bold text-[var(--ink)] outline-none focus:border-[var(--primary)]"
					/>
				</div>

				<div>
					<label htmlFor="act-date-input" className="text-xs font-semibold text-[var(--muted)] block mb-1">
						Дата акта
					</label>
					<input
						id="act-date-input"
						type="date"
						value={actDate}
						onChange={(e) => onActDateChange(e.target.value)}
						className="w-full h-9 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--ink)] outline-none focus:border-[var(--primary)]"
					/>
				</div>

				<div className="col-span-1 md:col-span-4">
					<label htmlFor="act-notes-input" className="text-xs font-semibold text-[var(--muted)] block mb-1">
						Примечание
					</label>
					<input
						id="act-notes-input"
						type="text"
						placeholder="Плановое списание карпул..."
						value={notes}
						onChange={(e) => onNotesChange(e.target.value)}
						className="w-full h-9 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--ink)] outline-none focus:border-[var(--primary)]"
					/>
				</div>
			</div>
		</div>
	);
};

export default SeniorNurseDisposalPassportBar;
