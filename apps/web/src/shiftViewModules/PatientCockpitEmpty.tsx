import React from "react";

export const PatientCockpitEmpty: React.FC = () => (
	<section className="patient-cockpit dnt-cockpit" aria-label="Карточка пациента">
		<div className="patient-summary-card">
			<p className="eyebrow" style={{ margin: "0 0 8px" }}>Карточка пациента</p>
			<h2>Пациент не выбран</h2>
			<div className="patient-facts" style={{ marginTop: "8px", fontSize: "13px", color: "var(--muted)" }}>
				<span>Выберите пациента в списке или расписании, чтобы увидеть его данные.</span>
			</div>
			<div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "10px" }}>
				<a className="secondary-button min-h-[44px] px-3 py-2 flex items-center justify-center" href="#patients">
					Выбрать пациента
				</a>
				<a className="secondary-button min-h-[44px] px-3 py-2 flex items-center justify-center" href="#schedule">
					Открыть записи
				</a>
			</div>
		</div>
	</section>
);
