import React from "react";
import { CLINIC_REQUISITES_LOCATION } from "../../personalDataOperatorRequisites";
import type { DocumentClinicOperator } from "../PersonalDataProcessingConsentForm";

interface PersonalDataOperatorSectionProps {
	safeOperator: DocumentClinicOperator;
	problems: Array<{ field: string; label: string; hint: string }>;
	requiredCount: number;
}

export const PersonalDataOperatorSection: React.FC<PersonalDataOperatorSectionProps> = ({
	safeOperator,
	problems,
	requiredCount,
}) => {
	return (
		<>
			{problems.length > 0 && (
				<div
					className="schedule-create-missing document-operator-requisites-missing"
					role="status"
					aria-live="polite"
					style={{ marginTop: "12px" }}
				>
					<strong>
						Согласие на обработку данных не создастся: у клиники не хватает {problems.length} из {requiredCount} реквизитов оператора:
					</strong>
					<ul>
						{problems.map((problem) => (
							<li key={problem.field}>
								{problem.label} — {problem.hint}
							</li>
						))}
					</ul>
					<small>
						Заполните их в «{CLINIC_REQUISITES_LOCATION}», сохраните и вернитесь сюда.
					</small>
				</div>
			)}
			<div className="document-payload-row">
				<label>
					Оператор
					<input
						value={safeOperator.legalName || safeOperator.clinicName}
						readOnly
						placeholder={`пусто — заполните в «${CLINIC_REQUISITES_LOCATION}»`}
					/>
				</label>
				<label>
					ИНН оператора
					<input
						value={safeOperator.inn}
						readOnly
						placeholder={`пусто — заполните в «${CLINIC_REQUISITES_LOCATION}»`}
					/>
				</label>
			</div>
			<label>
				Адрес оператора
				<input
					value={safeOperator.address}
					readOnly
					placeholder={`пусто — заполните в «${CLINIC_REQUISITES_LOCATION}»`}
				/>
			</label>
		</>
	);
};
