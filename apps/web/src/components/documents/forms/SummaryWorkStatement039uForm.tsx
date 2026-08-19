import React, { useState } from "react";
import { DocumentPayloadCard } from "../DocumentPayloadCard";
import type { SummaryDentistStatement039uPayload } from "@dental/shared";

export interface SummaryWorkStatement039uFormProps {
	initialPayload?: Partial<SummaryDentistStatement039uPayload>;
	onChange?: (payload: SummaryDentistStatement039uPayload) => void;
	disabled?: boolean;
}

export const SummaryWorkStatement039uForm: React.FC<SummaryWorkStatement039uFormProps> = React.memo(
	function SummaryWorkStatement039uForm({ initialPayload, onChange, disabled }) {
		const [periodLabel, setPeriodLabel] = useState(initialPayload?.periodLabel ?? "Август 2026");
		const [workDays, setWorkDays] = useState(initialPayload?.actualWorkDaysCount ?? 21);
		const [totalVisits, setTotalVisits] = useState(initialPayload?.visits?.totalVisits ?? 126);
		const [therapeuticUet, setTherapeuticUet] = useState(initialPayload?.uetBreakdown?.therapeuticUet ?? 245.5);
		const [surgicalUet, setSurgicalUet] = useState(initialPayload?.uetBreakdown?.surgicalUet ?? 62.0);

		const totalUet = therapeuticUet + surgicalUet;

		return (
			<div className="document-form-container form-039u-wrapper">
				<DocumentPayloadCard
					title="Сводная ведомость учета работы врача-стоматолога (Форма № 039/у-88)"
					description="Ежемесячная/квартальная сводка лечебной работы и выработки УЕТ по Приказу Минздрава РФ № 804н"
				>
					<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
						<div>
							<label style={{ fontWeight: 600 }}>Отчетный период</label>
							<input
								type="text"
								className="form-control"
								value={periodLabel}
								onChange={(e) => setPeriodLabel(e.target.value)}
							/>
						</div>
						<div>
							<label style={{ fontWeight: 600 }}>Отработано рабочих дней</label>
							<input
								type="number"
								className="form-control"
								value={workDays}
								onChange={(e) => setWorkDays(Number(e.target.value))}
							/>
						</div>
					</div>

					<div className="alert alert-info" style={{ marginBottom: "16px", padding: "10px" }}>
						<div style={{ fontWeight: 700, marginBottom: "4px" }}>Сводные показатели нагрузки:</div>
						<div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
							<span>Всего посещений: <strong>{totalVisits}</strong></span>
							<span>В среднем в день: <strong>{(totalVisits / Math.max(1, workDays)).toFixed(1)} пац/день</strong></span>
							<span>Терапевтические УЕТ: <strong>{therapeuticUet.toFixed(1)}</strong></span>
							<span>Хирургические УЕТ: <strong>{surgicalUet.toFixed(1)}</strong></span>
							<span><strong>ИТОГО УЕТ: {totalUet.toFixed(1)}</strong></span>
						</div>
					</div>

					<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
						<div style={{ background: "var(--paper-strong, #f8fafc)", padding: "12px", borderRadius: "8px" }}>
							<h4 style={{ margin: "0 0 10px 0" }}>Терапевтический прием</h4>
							<div className="form-group" style={{ marginBottom: "8px" }}>
								<label style={{ fontSize: "12px" }}>Выработано УЕТ (терапия)</label>
								<input
									type="number"
									step="0.5"
									className="form-control form-control-sm"
									value={therapeuticUet}
									onChange={(e) => setTherapeuticUet(Number(e.target.value))}
								/>
							</div>
						</div>

						<div style={{ background: "var(--paper-strong, #f8fafc)", padding: "12px", borderRadius: "8px" }}>
							<h4 style={{ margin: "0 0 10px 0" }}>Хирургический прием</h4>
							<div className="form-group" style={{ marginBottom: "8px" }}>
								<label style={{ fontSize: "12px" }}>Выработано УЕТ (хирургия)</label>
								<input
									type="number"
									step="0.5"
									className="form-control form-control-sm"
									value={surgicalUet}
									onChange={(e) => setSurgicalUet(Number(e.target.value))}
								/>
							</div>
						</div>
					</div>
				</DocumentPayloadCard>
			</div>
		);
	},
);
