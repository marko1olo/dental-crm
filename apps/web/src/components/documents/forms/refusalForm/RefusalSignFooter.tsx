import React from "react";

interface RefusalSignFooterProps {
	refusalDoctorFullName: string;
	setRefusalDoctorFullName: (v: string) => void;
	activeDoctorFullName?: string | null | undefined;
	refusalConfirmedAt: string;
	setRefusalConfirmedAt: (v: string) => void;
	refusalConsequencesUnderstood: boolean;
	setRefusalConsequencesUnderstood: (v: boolean) => void;
	refusalSecondOpinionOffered: boolean;
	setRefusalSecondOpinionOffered: (v: boolean) => void;
	refusalEmergencyCareExplained: boolean;
	setRefusalEmergencyCareExplained: (v: boolean) => void;
}

export const RefusalSignFooter: React.FC<RefusalSignFooterProps> = ({
	refusalDoctorFullName,
	setRefusalDoctorFullName,
	activeDoctorFullName,
	refusalConfirmedAt,
	setRefusalConfirmedAt,
	refusalConsequencesUnderstood,
	setRefusalConsequencesUnderstood,
	refusalSecondOpinionOffered,
	setRefusalSecondOpinionOffered,
	refusalEmergencyCareExplained,
	setRefusalEmergencyCareExplained,
}) => (
	<>
		<div className="document-payload-row">
			<label>
				Врач
				<input
					value={refusalDoctorFullName}
					onChange={(e) => setRefusalDoctorFullName(e.target.value)}
					placeholder={activeDoctorFullName ?? "врач, проводивший разъяснение"}
				/>
			</label>
			<label>
				Дата подтверждения
				<input
					value={refusalConfirmedAt}
					onChange={(e) => setRefusalConfirmedAt(e.target.value)}
				/>
			</label>
		</div>
		<label className="document-payload-checkbox">
			<input
				checked={refusalConsequencesUnderstood}
				type="checkbox"
				onChange={(e) => setRefusalConsequencesUnderstood(e.target.checked)}
			/>
			Пациент понял последствия отказа
		</label>
		<label className="document-payload-checkbox">
			<input
				checked={refusalSecondOpinionOffered}
				type="checkbox"
				onChange={(e) => setRefusalSecondOpinionOffered(e.target.checked)}
			/>
			Пациенту предложено второе мнение или альтернатива
		</label>
		<label className="document-payload-checkbox">
			<input
				checked={refusalEmergencyCareExplained}
				type="checkbox"
				onChange={(e) => setRefusalEmergencyCareExplained(e.target.checked)}
			/>
			Пациенту объяснено, когда нужна экстренная помощь
		</label>
	</>
);
