import React from "react";

interface MinorConsentChildFieldsProps {
	childFullName: string;
	setChildFullName: (v: string) => void;
	childFullNamePlaceholder: string;
	childBirthDate: string;
	setChildBirthDate: (v: string) => void;
	childBirthDatePlaceholder: string;
	interventionScope: string;
	setInterventionScope: (v: string) => void;
	interventionPlaceholder: string;
	diagnosisOrIndication: string;
	setDiagnosisOrIndication: (v: string) => void;
	diagnosisPlaceholder: string;
	risks: string;
	setRisks: (v: string) => void;
	alternatives: string;
	setAlternatives: (v: string) => void;
	doctorFullName: string;
	setDoctorFullName: (v: string) => void;
	doctorPlaceholder: string;
	signedAt: string;
	setSignedAt: (v: string) => void;
}

export const MinorConsentChildFields: React.FC<MinorConsentChildFieldsProps> = ({
	childFullName, setChildFullName, childFullNamePlaceholder,
	childBirthDate, setChildBirthDate, childBirthDatePlaceholder,
	interventionScope, setInterventionScope, interventionPlaceholder,
	diagnosisOrIndication, setDiagnosisOrIndication, diagnosisPlaceholder,
	risks, setRisks, alternatives, setAlternatives,
	doctorFullName, setDoctorFullName, doctorPlaceholder,
	signedAt, setSignedAt,
}) => (
	<>
		<div className="document-payload-row">
			<label>
				Пациент (ребенок)
				<input
					value={childFullName}
					onChange={(e) => setChildFullName(e.target.value)}
					placeholder={childFullNamePlaceholder}
				/>
			</label>
			<label>
				Дата рождения ребенка
				<input
					value={childBirthDate}
					onChange={(e) => setChildBirthDate(e.target.value)}
					placeholder={childBirthDatePlaceholder}
				/>
			</label>
		</div>
		<label>
			Объем вмешательства
			<textarea
				value={interventionScope}
				onChange={(e) => setInterventionScope(e.target.value)}
				placeholder={interventionPlaceholder}
				rows={2}
			/>
		</label>
		<label>
			Диагноз или клиническое показание
			<textarea
				value={diagnosisOrIndication}
				onChange={(e) => setDiagnosisOrIndication(e.target.value)}
				placeholder={diagnosisPlaceholder}
				rows={2}
			/>
		</label>
		<label>
			Разъясненные риски и особенности детского возраста
			<textarea value={risks} onChange={(e) => setRisks(e.target.value)} rows={3} />
		</label>
		<label>
			Альтернативы лечения
			<textarea value={alternatives} onChange={(e) => setAlternatives(e.target.value)} rows={2} />
		</label>
		<div className="document-payload-row">
			<label>
				Лечащий врач
				<input
					value={doctorFullName}
					onChange={(e) => setDoctorFullName(e.target.value)}
					placeholder={doctorPlaceholder}
				/>
			</label>
			<label>
				Дата и время оформления
				<input value={signedAt} onChange={(e) => setSignedAt(e.target.value)} />
			</label>
		</div>
	</>
);
