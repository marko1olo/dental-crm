import React from "react";
import { CheckCircle2, Printer } from "lucide-react";
import type { BudgetPortalData } from "./budgetSignTypes";
import { formatIsoDateTime } from "./budgetSignTypes";

export interface BudgetAcceptedCardProps {
	readonly budget: BudgetPortalData;
}

export const BudgetAcceptedCard: React.FC<BudgetAcceptedCardProps> = ({ budget }) => {
	return (
		<div className="patient-budget-accepted-card">
			<CheckCircle2 size={40} style={{ margin: "0 auto", color: "var(--teal)" }} />
			<div className="patient-budget-accepted-title">
				Смета успешно согласована
			</div>
			<p className="patient-budget-accepted-desc">
				План лечения утверждён пациентом:{" "}
				<strong>{budget.signerName || budget.patientFirstName || "Пациент"}</strong>
			</p>
			{budget.signedAt && (
				<p className="patient-budget-accepted-date">
					Дата и время: {formatIsoDateTime(budget.signedAt)}
				</p>
			)}
			{budget.documentHash && (
				<div className="patient-budget-hash-box">
					<strong>SHA-256 целостности документа:</strong>
					<br />
					{budget.documentHash}
				</div>
			)}
			<button
				type="button"
				className="patient-budget-print-btn"
				onClick={() => window.print()}
			>
				<Printer size={16} />
				Распечатать / Сохранить в PDF
			</button>
		</div>
	);
};
