import React from "react";
import { Clock, Tablet } from "lucide-react";

export interface PresenterHeaderTitleGroupProps {
	readonly patientName: string;
	readonly doctorFullName: string;
	readonly planAgeDays: number;
}

export const PresenterHeaderTitleGroup: React.FC<PresenterHeaderTitleGroupProps> = ({
	patientName,
	doctorFullName,
	planAgeDays,
}) => {
	return (
		<div className="treatment-presenter-title-group min-w-0 flex-1">
			<div className="treatment-presenter-icon-badge shrink-0">
				<Tablet size={18} />
			</div>
			<div className="treatment-presenter-header-meta min-w-0 flex-1">
				<div className="flex items-center gap-2 flex-wrap">
					<h2 id="treatment-presenter-modal-title" className="treatment-presenter-main-title">
						Презентация планов лечения
					</h2>
					<span className="treatment-presenter-law-badge whitespace-nowrap" title="Прейскурант и стандарты лечения">
						Прейскурант клиники
					</span>
					{planAgeDays > 30 && (
						<span
							className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-800 dark:text-amber-300 font-semibold border border-amber-500/30 text-[11.5px] inline-flex items-center gap-1 shadow-2xs whitespace-nowrap"
							title="План составлен более 30 дней назад, цены могут быть скорректированы. Создание нарядов ЗТЛ, оказание услуг и оплата не блокируются (согласовано врачом)."
							data-testid="presenter-expired-unblocked-badge"
						>
							<Clock size={12} className="text-amber-600 dark:text-amber-400 shrink-0" />
							План составлен более 30 дней назад, цены могут быть скорректированы
						</span>
					)}
				</div>
				<p className="treatment-presenter-subtitle truncate">
					Пациент: <strong className="text-[var(--tp-text-main)] font-semibold">{patientName || "Не указан"}</strong>
					{doctorFullName ? <> · Врач: {doctorFullName}</> : null}
				</p>
			</div>
		</div>
	);
};
