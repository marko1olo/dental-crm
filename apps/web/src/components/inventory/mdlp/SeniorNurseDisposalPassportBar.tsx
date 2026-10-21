import { CheckCircle2 } from "lucide-react";
import type React from "react";

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
		<div className="p-3 rounded-lg border border-line bg-paper-soft space-y-3">
			<div className="flex items-center justify-between flex-wrap gap-2">
				<div className="flex items-center gap-2">
					<span className="text-xs font-bold text-ink">Параметры списания карпул</span>
					{isApproved && (
						<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 border border-teal-300 text-teal-800 text-[11px] font-bold">
							<CheckCircle2 size={13} className="text-teal-600" />
							{paperJournalAcknowledged ? "Акт утверждён (бумажный журнал учтён)" : "Акт утверждён единолично"}
						</span>
					)}
				</div>
				<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-50 dark:bg-teal-950/30 border border-teal-300 dark:border-teal-800 text-teal-800 dark:text-teal-200 text-xs font-bold">
					<CheckCircle2 size={13} className="text-teal-600" />
					<span>Единоличное утверждение (без комиссии из 3 человек)</span>
				</span>
			</div>

			<div className="text-[11px] text-teal-700 dark:text-teal-300 bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200/60 dark:border-teal-800/50 rounded px-2.5 py-1.5 leading-relaxed">
				<strong>СанПиН 3.3686-21:</strong> Списание использованных карпул анестетиков проводится уполномоченным сотрудником клиники в оперативном порядке.
			</div>

			<div className="grid grid-cols-1 md:grid-cols-4 gap-3">
				<div>
					<label htmlFor="act-approver-role" className="text-xs font-semibold text-muted block mb-1">
						Кто утверждает списание
					</label>
					<select
						id="act-approver-role"
						value={approverRole}
						onChange={(e) => onApproverRoleChange(e.target.value as typeof approverRole)}
						className="w-full min-h-[44px] px-2.5 rounded border border-line bg-paper text-xs font-bold text-ink"
					>
						<option value="doctor">Врач-стоматолог (дежурный)</option>
						<option value="senior_nurse">Старшая медсестра</option>
						<option value="administrator">Администратор клиники</option>
						<option value="authorized_staff">Уполномоченный сотрудник</option>
					</select>
				</div>

				<div>
					<label htmlFor="act-approver-name" className="text-xs font-semibold text-muted block mb-1">
						ФИО утверждающего лица
					</label>
					<input
						id="act-approver-name"
						type="text"
						value={approverName}
						onChange={(e) => onApproverNameChange(e.target.value)}
						placeholder="ФИО сотрудника..."
						className="w-full min-h-[44px] px-2.5 rounded border border-line bg-paper text-xs font-semibold text-ink"
					/>
				</div>

				<div>
					<label htmlFor="act-number-input" className="text-xs font-semibold text-muted block mb-1">
						Номер акта
					</label>
					<input
						id="act-number-input"
						type="text"
						value={actNumber}
						onChange={(e) => onActNumberChange(e.target.value)}
						className="w-full min-h-[44px] px-2.5 rounded border border-line bg-paper text-xs font-mono font-bold text-ink"
					/>
				</div>

				<div>
					<label htmlFor="act-date-input" className="text-xs font-semibold text-muted block mb-1">
						Дата акта
					</label>
					<input
						id="act-date-input"
						type="date"
						value={actDate}
						onChange={(e) => onActDateChange(e.target.value)}
						className="w-full min-h-[44px] px-2.5 rounded border border-line bg-paper text-xs text-ink"
					/>
				</div>

				<div className="col-span-1 md:col-span-4">
					<label htmlFor="act-notes-input" className="text-xs font-semibold text-muted block mb-1">
						Примечание
					</label>
					<input
						id="act-notes-input"
						type="text"
						placeholder="Плановое списание карпул..."
						value={notes}
						onChange={(e) => onNotesChange(e.target.value)}
						className="w-full min-h-[44px] px-2.5 rounded border border-line bg-paper text-xs text-ink"
					/>
				</div>
			</div>
		</div>
	);
};
