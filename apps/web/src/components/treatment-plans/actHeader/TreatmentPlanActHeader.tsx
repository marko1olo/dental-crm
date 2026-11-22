/**
 * TreatmentPlanActHeader.tsx — Официальная шапка, реквизиты клиники и паспорта пациента
 * для печатной формы Акта сдачи-приемки оказанных стоматологических услуг.
 */

import React from "react";
import { ActClinicHeader } from "./ActClinicHeader";
import { ActDocumentTitleBanner } from "./ActDocumentTitleBanner";
import { ActRequisitesTable } from "./ActRequisitesTable";
import type { TreatmentPlanActHeaderProps } from "./types";

export type { TreatmentPlanActHeaderProps };

export const TreatmentPlanActHeader: React.FC<TreatmentPlanActHeaderProps> = ({
	actData,
	palette,
	headerStyle,
	showClinicLogo,
	logoUrl,
	showClinicRequisites,
	clinicName,
	slogan,
	legalName,
	inn,
	kpp,
	ogrn,
	address,
	license,
	phone,
	website,
	email,
	patientDob,
	patientGenderText,
	patientPass,
	patientRegAddress,
	patientContactPhone,
	patientSnilsVal,
	patientOmsVal,
	patientMedCard,
	doctorSpec,
	doctorSnilsVal,
	contractDateFormatted,
}) => {
	return (
		<>
			<ActClinicHeader
				headerStyle={headerStyle}
				palette={palette}
				clinicName={actData.clinicName || clinicName}
				slogan={slogan}
				showClinicLogo={showClinicLogo}
				logoUrl={logoUrl}
				showClinicRequisites={showClinicRequisites}
				legalName={legalName}
				inn={inn}
				kpp={kpp}
				ogrn={ogrn}
				address={address}
				license={license}
				phone={phone}
				website={website}
				email={email}
			/>

			<ActDocumentTitleBanner
				actData={actData}
				palette={palette}
				contractDateFormatted={contractDateFormatted}
				address={address}
			/>

			<ActRequisitesTable
				actData={actData}
				legalName={legalName}
				inn={inn}
				kpp={kpp}
				ogrn={ogrn}
				license={license}
				patientDob={patientDob}
				patientGenderText={patientGenderText}
				patientPass={patientPass}
				patientRegAddress={patientRegAddress}
				patientContactPhone={patientContactPhone}
				patientSnilsVal={patientSnilsVal}
				patientOmsVal={patientOmsVal}
				patientMedCard={patientMedCard}
				doctorSpec={doctorSpec}
				doctorSnilsVal={doctorSnilsVal}
			/>
		</>
	);
};
