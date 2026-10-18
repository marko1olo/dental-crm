import { Clock, Stethoscope, Users } from "lucide-react";
import React from "react";
import type { PublicBookingWidgetConfig } from "./bookingConfigTypes";

interface Props {
	config: PublicBookingWidgetConfig;
	onChange: (updated: PublicBookingWidgetConfig) => void;
}

export const BookingDoctorsAndServicesCard: React.FC<Props> = ({ config, onChange }) => {
	const update = (partial: Partial<PublicBookingWidgetConfig>) => onChange({ ...config, ...partial });

	return (
		<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-card)] space-y-4">
			<div className="flex items-center gap-2">
				<Stethoscope size={18} className="text-[var(--teal)]" />
				<h4 className="m-0 text-sm font-semibold text-[var(--ink)]">Врачи и услуги для записи</h4>
			</div>

			<div className="space-y-3">
				<label className="flex items-center gap-2.5 text-xs text-[var(--ink)] cursor-pointer">
					<input
						type="checkbox"
						checked={config.onlyDoctorsWithActiveShifts}
						onChange={(e) => update({ onlyDoctorsWithActiveShifts: e.target.checked })}
						className="rounded border-[var(--line)] text-teal-600"
					/>
					<span>Показывать только врачей с открытыми сменами в расписании</span>
				</label>

				<label className="flex items-center gap-2.5 text-xs text-[var(--ink)] cursor-pointer">
					<input
						type="checkbox"
						checked={config.showDoctorExperience}
						onChange={(e) => update({ showDoctorExperience: e.target.checked })}
						className="rounded border-[var(--line)] text-teal-600"
					/>
					<span>Отображать стаж и специализацию врача</span>
				</label>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[var(--line-subtle)]">
					<div>
						<label className="block text-xs font-medium text-[var(--muted)] mb-1">
							Доступные услуги для записи
						</label>
						<select
							value={config.allowedServicesMode}
							onChange={(e) => update({ allowedServicesMode: e.target.value as any })}
							className="w-full h-9 px-3 text-xs rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
						>
							<option value="consultations_only">Только первичные консультации</option>
							<option value="basic_treatments">Консультации + гигиена и терапия</option>
							<option value="all_services">Все услуги прейскуранта</option>
						</select>
					</div>

					<div>
						<label className="block text-xs font-medium text-[var(--muted)] mb-1">
							Длительность слота визита
						</label>
						<select
							value={config.slotDurationMinutes}
							onChange={(e) => update({ slotDurationMinutes: Number(e.target.value) })}
							className="w-full h-9 px-3 text-xs rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
						>
							<option value={30}>30 минут</option>
							<option value={45}>45 минут</option>
							<option value={60}>60 минут (1 час)</option>
						</select>
					</div>
				</div>
			</div>
		</div>
	);
};
