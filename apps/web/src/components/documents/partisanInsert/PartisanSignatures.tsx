import React from "react";
import type { FastPrintDoctorInfo, FastPrintPatientInfo } from "../FastClinicalPrintEngine";

export interface PartisanSignaturesProps {
	doctor?: FastPrintDoctorInfo | undefined;
	patient: FastPrintPatientInfo;
}

export const PartisanSignatures: React.FC<PartisanSignaturesProps> = ({ doctor, patient }) => {
	return (
		<div className="partisan-signature-row">
			<div className="partisan-sign-block">
				<div className="partisan-sign-role">
					Лечащий врач: <strong>{doctor?.fullName || "Лечащий врач"}</strong> ({doctor?.specialty || "Врач-стоматолог"})
				</div>
				<div className="partisan-sign-line" />
				<div className="partisan-sign-caption">(подпись / личная печать врача)</div>
			</div>
			<div className="partisan-sign-block">
				<div className="partisan-sign-role">
					Пациент (с планом и лечением ознакомлен): <strong>{patient.fullName}</strong>
				</div>
				<div className="partisan-sign-line" />
				<div className="partisan-sign-caption">(личная подпись пациента)</div>
			</div>
		</div>
	);
};
