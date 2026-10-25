import React from "react";

interface PersonalDataTermsSectionProps {
	personalDataCrossBorderAllowed: boolean;
	setPersonalDataCrossBorderAllowed: (v: boolean) => void;
	personalDataAutomatedDecisionAllowed: boolean;
	setPersonalDataAutomatedDecisionAllowed: (v: boolean) => void;
	personalDataRetentionPeriod: string;
	setPersonalDataRetentionPeriod: (v: string) => void;
	personalDataRevocationChannel: string;
	setPersonalDataRevocationChannel: (v: string) => void;
	personalDataConsentGivenAt: string;
	setPersonalDataConsentGivenAt: (v: string) => void;
	personalDataVoluntaryConsentConfirmed: boolean;
	setPersonalDataVoluntaryConsentConfirmed: (v: boolean) => void;
	personalDataMedicalProcessingAcknowledged: boolean;
	setPersonalDataMedicalProcessingAcknowledged: (v: boolean) => void;
}

export const PersonalDataTermsSection: React.FC<PersonalDataTermsSectionProps> = ({
	personalDataCrossBorderAllowed,
	setPersonalDataCrossBorderAllowed,
	personalDataAutomatedDecisionAllowed,
	setPersonalDataAutomatedDecisionAllowed,
	personalDataRetentionPeriod,
	setPersonalDataRetentionPeriod,
	personalDataRevocationChannel,
	setPersonalDataRevocationChannel,
	personalDataConsentGivenAt,
	setPersonalDataConsentGivenAt,
	personalDataVoluntaryConsentConfirmed,
	setPersonalDataVoluntaryConsentConfirmed,
	personalDataMedicalProcessingAcknowledged,
	setPersonalDataMedicalProcessingAcknowledged,
}) => {
	return (
		<>
			<div className="document-payload-row">
				<label className="document-payload-checkbox">
					<input
						checked={personalDataCrossBorderAllowed}
						type="checkbox"
						onChange={(event) => setPersonalDataCrossBorderAllowed(event.target.checked)}
					/>
					Разрешена трансграничная передача
				</label>
				<label className="document-payload-checkbox">
					<input
						checked={personalDataAutomatedDecisionAllowed}
						type="checkbox"
						onChange={(event) => setPersonalDataAutomatedDecisionAllowed(event.target.checked)}
					/>
					Разрешены автоматизированные решения
				</label>
			</div>
			<label>
				Срок хранения
				<textarea
					value={personalDataRetentionPeriod}
					onChange={(event) => setPersonalDataRetentionPeriod(event.target.value)}
					rows={2}
				/>
			</label>
			<div className="document-payload-row">
				<label>
					Порядок отзыва
					<textarea
						value={personalDataRevocationChannel}
						onChange={(event) => setPersonalDataRevocationChannel(event.target.value)}
						rows={2}
					/>
				</label>
				<label>
					Дата согласия
					<input
						value={personalDataConsentGivenAt}
						onChange={(event) => setPersonalDataConsentGivenAt(event.target.value)}
					/>
				</label>
			</div>
			<label className="document-payload-checkbox">
				<input
					checked={personalDataVoluntaryConsentConfirmed}
					type="checkbox"
					onChange={(event) => setPersonalDataVoluntaryConsentConfirmed(event.target.checked)}
				/>
				Пациент добровольно согласен на обработку персональных данных
			</label>
			<label className="document-payload-checkbox">
				<input
					checked={personalDataMedicalProcessingAcknowledged}
					type="checkbox"
					onChange={(event) => setPersonalDataMedicalProcessingAcknowledged(event.target.checked)}
				/>
				Пациент понимает обработку медицинских данных
			</label>
		</>
	);
};
