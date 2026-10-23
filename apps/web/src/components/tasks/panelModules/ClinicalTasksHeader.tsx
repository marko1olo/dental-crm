import React from "react";

export interface ClinicalTasksHeaderProps {
	readonly openTasksCount: number | null;
}

export const ClinicalTasksHeader: React.FC<ClinicalTasksHeaderProps> = ({
	openTasksCount,
}) => {
	return (
		<>
			<div className="panel-heading">
				<h2>Передача между этапами</h2>
				{openTasksCount !== null ? (
					<span
						className={`status-pill ${openTasksCount > 0 ? "status-arrived" : "status-planned"}`}
					>
						{openTasksCount}
					</span>
				) : null}
			</div>

			<p className="ops-hint">
				Когда терапевтический или хирургический этап закончен, зафиксируйте это
				здесь — ортопед получит задачу в карте пациента. Приём, подпись и оплату
				закрывайте своими шагами ниже.
			</p>
		</>
	);
};
