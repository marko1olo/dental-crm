import React from "react";
import { User } from "lucide-react";

export interface PayrollEmptyDoctorStateProps {
	readonly doctorsList: readonly { readonly id: string; readonly name: string; readonly specialtyId: string }[];
	readonly selectedDoctorId: string;
	readonly onSelectDoctorId: (id: string) => void;
}

export const PayrollEmptyDoctorState: React.FC<PayrollEmptyDoctorStateProps> = ({
	doctorsList,
	selectedDoctorId,
	onSelectDoctorId,
}) => {
	return (
		<div className="flex flex-col items-center justify-center p-8 bg-[var(--paper-soft,#f8fafc)] rounded-2xl border border-[var(--line,#e2e8f0)] text-center my-auto min-h-[300px]">
			<div className="w-14 h-14 rounded-2xl bg-[var(--teal-soft,#ccfbf1)] flex items-center justify-center text-[var(--teal,#0d9488)] mb-4">
				<User className="w-7 h-7" />
			</div>
			<h3 className="text-base font-bold text-[var(--ink,#0f172a)] mb-1.5">
				Выберите врача для формирования расчетного листа
			</h3>
			<p className="text-xs text-[var(--muted,#64748b)] max-w-md mb-5 leading-relaxed">
				{doctorsList.length > 0
					? "Выберите специалиста из списка ниже или в шапке окна, чтобы рассчитать сдельную оплату, комиссию и сгенерировать ведомость."
					: "В штате клиники пока нет зарегистрированных врачей. Добавьте персонал в настройках клиники или используйте профиль соло-врача."}
			</p>
			{doctorsList.length > 0 && (
				<div className="w-full max-w-xs">
					<select
						value={selectedDoctorId}
						onChange={(e) => onSelectDoctorId(e.target.value)}
						data-testid="payroll-empty-state-doctor-select"
						className="w-full h-10 px-3 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-sm font-semibold text-[var(--ink,#0f172a)] focus:outline-none focus:ring-2 focus:ring-[var(--teal,#0d9488)] shadow-sm cursor-pointer"
					>
						<option value="">— Выберите врача из списка —</option>
						{doctorsList.map((doc) => (
							<option key={doc.id} value={doc.id}>
								{doc.name}
							</option>
						))}
					</select>
				</div>
			)}
		</div>
	);
};
