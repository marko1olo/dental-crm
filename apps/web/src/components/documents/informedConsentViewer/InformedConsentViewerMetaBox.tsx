import React from "react";

export interface InformedConsentViewerMetaBoxProps {
	readonly clinicName: string;
	readonly patientName: string;
	readonly doctor: string;
	readonly toothOrArea: string;
	readonly diagnosis: string;
}

export const InformedConsentViewerMetaBox: React.FC<
	InformedConsentViewerMetaBoxProps
> = ({ clinicName, patientName, doctor, toothOrArea, diagnosis }) => {
	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] text-[12px]">
			<div>
				<span className="text-[var(--muted)] block">
					Медицинская организация:
				</span>
				<strong>{clinicName}</strong>
			</div>
			<div>
				<span className="text-[var(--muted)] block">Пациент:</span>
				<strong>{patientName}</strong>
			</div>
			<div>
				<span className="text-[var(--muted)] block">Лечащий врач:</span>
				<strong>{doctor}</strong>
			</div>
			<div>
				<span className="text-[var(--muted)] block">
					Область вмешательства:
				</span>
				<strong>{toothOrArea}</strong> (Диагноз: {diagnosis})
			</div>
		</div>
	);
};

InformedConsentViewerMetaBox.displayName = "InformedConsentViewerMetaBox";
