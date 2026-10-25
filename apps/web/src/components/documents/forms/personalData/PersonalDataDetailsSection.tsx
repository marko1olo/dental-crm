import React from "react";
import { Lock } from "lucide-react";
import { PERSONAL_DATA_EGISZ_CONSENT_PRESET } from "@dental/shared";

interface PersonalDataDetailsSectionProps {
	personalDataPurposes: string;
	setPersonalDataPurposes: (v: string) => void;
	personalDataCategories: string;
	setPersonalDataCategories: (v: string) => void;
	personalDataActions: string;
	setPersonalDataActions: (v: string) => void;
	personalDataTransferRules: string;
	setPersonalDataTransferRules: (v: string) => void;
	setPersonalDataRetentionPeriod: (v: string) => void;
	setPersonalDataRevocationChannel: (v: string) => void;
}

export const PersonalDataDetailsSection: React.FC<PersonalDataDetailsSectionProps> = ({
	personalDataPurposes,
	setPersonalDataPurposes,
	personalDataCategories,
	setPersonalDataCategories,
	personalDataActions,
	setPersonalDataActions,
	personalDataTransferRules,
	setPersonalDataTransferRules,
	setPersonalDataRetentionPeriod,
	setPersonalDataRevocationChannel,
}) => {
	const handleApplyPreset = () => {
		setPersonalDataPurposes(PERSONAL_DATA_EGISZ_CONSENT_PRESET.purposes.join("\n"));
		setPersonalDataCategories(PERSONAL_DATA_EGISZ_CONSENT_PRESET.categories.join("\n"));
		setPersonalDataActions(PERSONAL_DATA_EGISZ_CONSENT_PRESET.actions.join("\n"));
		setPersonalDataTransferRules(PERSONAL_DATA_EGISZ_CONSENT_PRESET.transferRules);
		setPersonalDataRetentionPeriod(PERSONAL_DATA_EGISZ_CONSENT_PRESET.retentionPeriod);
		setPersonalDataRevocationChannel(PERSONAL_DATA_EGISZ_CONSENT_PRESET.revocationChannel);
	};

	return (
		<>
			<div style={{ marginBottom: "14px" }}>
				<button
					type="button"
					className="secondary-button inline-flex items-center gap-1.5"
					style={{ minHeight: "44px", fontSize: "12px", padding: "8px 14px", borderRadius: "12px" }}
					onClick={handleApplyPreset}
				>
					<Lock size={14} className="text-teal-600 dark:text-teal-400 shrink-0" aria-hidden="true" />
					<span>Заполнить стандартные формулировки (Защита персональных данных)</span>
				</button>
			</div>
			<label>
				Цели обработки
				<textarea value={personalDataPurposes} onChange={(e) => setPersonalDataPurposes(e.target.value)} rows={4} />
			</label>
			<label>
				Категории данных
				<textarea value={personalDataCategories} onChange={(e) => setPersonalDataCategories(e.target.value)} rows={4} />
			</label>
			<label>
				Действия с данными
				<textarea value={personalDataActions} onChange={(e) => setPersonalDataActions(e.target.value)} rows={4} />
			</label>
			<label>
				Передача третьим лицам
				<textarea value={personalDataTransferRules} onChange={(e) => setPersonalDataTransferRules(e.target.value)} rows={3} />
			</label>
		</>
	);
};
