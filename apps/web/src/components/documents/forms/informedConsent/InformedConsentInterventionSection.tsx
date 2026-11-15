import React from "react";

export interface InformedConsentInterventionStoreSlice {
	informedConsentIntervention: string;
	setInformedConsentIntervention: (val: string) => void;
	informedConsentToothOrArea: string;
	setInformedConsentToothOrArea: (val: string) => void;
	informedConsentDoctorFullName: string;
	setInformedConsentDoctorFullName: (val: string) => void;
	informedConsentDiagnosisOrIndication: string;
	setInformedConsentDiagnosisOrIndication: (val: string) => void;
	informedConsentExpectedBenefit: string;
	setInformedConsentExpectedBenefit: (val: string) => void;
	informedConsentAnesthesia: string;
	setInformedConsentAnesthesia: (val: string) => void;
	informedConsentConfirmedAt: string;
	setInformedConsentConfirmedAt: (val: string) => void;
}

export interface InformedConsentInterventionSectionProps {
	docStore: InformedConsentInterventionStoreSlice;
	inferredTreatmentArea?: string | null | undefined;
	activeDoctorFullName?: string | null | undefined;
	activeVisitComplaint?: string | null | undefined;
}

export const InformedConsentInterventionSection: React.FC<InformedConsentInterventionSectionProps> = React.memo(
	function InformedConsentInterventionSection({
		docStore,
		inferredTreatmentArea,
		activeDoctorFullName,
		activeVisitComplaint,
	}) {
		return (
			<>
				<label>
					Планируемое вмешательство
					<textarea
						value={docStore.informedConsentIntervention}
						onChange={(e) => docStore.setInformedConsentIntervention(e.target.value)}
						placeholder="что именно делаем: например, лечение кариеса зуба 36 с постановкой пломбы"
						rows={2}
					/>
				</label>
				<div className="document-payload-row">
					<label>
						Область или зубы
						<input
							value={docStore.informedConsentToothOrArea}
							onChange={(e) => docStore.setInformedConsentToothOrArea(e.target.value)}
							placeholder={inferredTreatmentArea || "FDI / зона лечения"}
						/>
					</label>
					<label>
						Врач
						<input
							value={docStore.informedConsentDoctorFullName}
							onChange={(e) => docStore.setInformedConsentDoctorFullName(e.target.value)}
							placeholder={activeDoctorFullName ?? "врач, проводивший разъяснение"}
						/>
					</label>
				</div>
				<label>
					Диагноз или клиническое показание
					<textarea
						value={docStore.informedConsentDiagnosisOrIndication}
						onChange={(e) => docStore.setInformedConsentDiagnosisOrIndication(e.target.value)}
						placeholder={activeVisitComplaint ?? "показание к вмешательству"}
						rows={2}
					/>
				</label>
				<label>
					Ожидаемая польза
					<textarea
						value={docStore.informedConsentExpectedBenefit}
						onChange={(e) => docStore.setInformedConsentExpectedBenefit(e.target.value)}
						rows={2}
					/>
				</label>
				<div className="document-payload-row">
					<label>
						Анестезия
						<input
							value={docStore.informedConsentAnesthesia}
							onChange={(e) => docStore.setInformedConsentAnesthesia(e.target.value)}
						/>
					</label>
					<label>
						Дата подтверждения
						<input
							value={docStore.informedConsentConfirmedAt}
							onChange={(e) => docStore.setInformedConsentConfirmedAt(e.target.value)}
						/>
					</label>
				</div>
			</>
		);
	},
);
