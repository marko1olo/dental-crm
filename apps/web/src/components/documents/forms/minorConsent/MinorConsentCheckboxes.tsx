import React from "react";

interface MinorConsentCheckboxesProps {
	minorConsentIdentityVerified: boolean;
	setMinorConsentIdentityVerified: (v: boolean) => void;
	minorConsentAuthorityVerified: boolean;
	setMinorConsentAuthorityVerified: (v: boolean) => void;
	minorConsentExplained: boolean;
	setMinorConsentExplained: (v: boolean) => void;
	minorConsentStored: boolean;
	setMinorConsentStored: (v: boolean) => void;
	minorConsentAgeExplanation: boolean;
	setMinorConsentAgeExplanation: (v: boolean) => void;
}

export const MinorConsentCheckboxes: React.FC<MinorConsentCheckboxesProps> = ({
	minorConsentIdentityVerified, setMinorConsentIdentityVerified,
	minorConsentAuthorityVerified, setMinorConsentAuthorityVerified,
	minorConsentExplained, setMinorConsentExplained,
	minorConsentStored, setMinorConsentStored,
	minorConsentAgeExplanation, setMinorConsentAgeExplanation,
}) => (
	<div className="document-payload-checkboxes">
		<label className="document-payload-checkbox">
			<input
				checked={minorConsentIdentityVerified}
				type="checkbox"
				onChange={(e) => setMinorConsentIdentityVerified(e.target.checked)}
			/>
			Личность законного представителя проверена по паспорту
		</label>
		<label className="document-payload-checkbox">
			<input
				checked={minorConsentAuthorityVerified}
				type="checkbox"
				onChange={(e) => setMinorConsentAuthorityVerified(e.target.checked)}
			/>
			Полномочия законного представителя подтверждены документом
		</label>
		<label className="document-payload-checkbox">
			<input
				checked={minorConsentExplained}
				type="checkbox"
				onChange={(e) => setMinorConsentExplained(e.target.checked)}
			/>
			Цель, риски, анестезия и уход разъяснены родителю/представителю
		</label>
		<label className="document-payload-checkbox">
			<input
				checked={minorConsentStored}
				type="checkbox"
				onChange={(e) => setMinorConsentStored(e.target.checked)}
			/>
			Согласие подшивается в медицинскую карту приёма
		</label>
		<label className="document-payload-checkbox">
			<input
				checked={minorConsentAgeExplanation}
				type="checkbox"
				onChange={(e) => setMinorConsentAgeExplanation(e.target.checked)}
			/>
			Ребенку даны понятные адаптационные разъяснения по возрасту
		</label>
	</div>
);
