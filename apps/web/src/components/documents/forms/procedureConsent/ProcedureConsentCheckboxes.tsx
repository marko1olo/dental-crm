/**
 * forms/procedureConsent/ProcedureConsentCheckboxes.tsx
 * Statutory confirmation checkboxes for procedure consent (Mandate 8b <= 120 lines)
 */

import React from "react";

interface ProcedureConsentCheckboxesProps {
	localFormAttached: boolean;
	setLocalFormAttached: (val: boolean) => void;
	questionsAnswered: boolean;
	setQuestionsAnswered: (val: boolean) => void;
	exactProcedureConfirmed: boolean;
	setExactProcedureConfirmed: (val: boolean) => void;
	risksUnderstood: boolean;
	setRisksUnderstood: (val: boolean) => void;
}

export const ProcedureConsentCheckboxes: React.FC<ProcedureConsentCheckboxesProps> = React.memo(
	function ProcedureConsentCheckboxes(props) {
		const {
			localFormAttached,
			setLocalFormAttached,
			questionsAnswered,
			setQuestionsAnswered,
			exactProcedureConfirmed,
			setExactProcedureConfirmed,
			risksUnderstood,
			setRisksUnderstood,
		} = props;

		return (
			<>
				<label className="document-payload-checkbox">
					<input checked={localFormAttached} type="checkbox" onChange={(e) => setLocalFormAttached(e.target.checked)} />
					Локальная форма клиники приложена или включена в пакет
				</label>
				<label className="document-payload-checkbox">
					<input checked={questionsAnswered} type="checkbox" onChange={(e) => setQuestionsAnswered(e.target.checked)} />
					Пациент получил ответы на вопросы по процедуре
				</label>
				<label className="document-payload-checkbox">
					<input checked={exactProcedureConfirmed} type="checkbox" onChange={(e) => setExactProcedureConfirmed(e.target.checked)} />
					Конкретная процедура, зона и объем названы пациенту
				</label>
				<label className="document-payload-checkbox">
					<input checked={risksUnderstood} type="checkbox" onChange={(e) => setRisksUnderstood(e.target.checked)} />
					Пациент понял процедурные риски и ограничения
				</label>
			</>
		);
	},
);
