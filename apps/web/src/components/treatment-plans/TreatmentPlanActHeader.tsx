/**
 * TreatmentPlanActHeader.tsx — Официальная шапка, реквизиты клиники и паспорта пациента
 * для печатной формы Акта сдачи-приемки оказанных стоматологических услуг.
 */

import type React from "react";
import { ActClinicHeader } from "./actHeader/ActClinicHeader";
import { ActDocumentTitleBanner } from "./actHeader/ActDocumentTitleBanner";
import { ActRequisitesTable } from "./actHeader/ActRequisitesTable";
import type { TreatmentPlanActHeaderProps } from "./actHeader/types";

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
