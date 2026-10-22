/**
 * useFnsTaxState.ts — Sub-hook managing FNS Tax Deduction (КНД 1151156) payload.
 * Mandate 8b compliant (<= 120 lines).
 */

import { useMemo, useState } from "react";
import { isDemoShowcaseMode } from "../../../lib/demoMode.js";
import {
	SAMPLE_FNS_TAX_1151156_PRESET,
	type EgiszClinicInfo,
	type EgiszDoctorInfo,
	type FnsTaxCertificatePayload,
	type FnsTaxPaymentItem,
	type GostSignatureInfo,
	parseRublesToKopecks,
	runFnsTaxCertificatePreflight,
} from "../egiszRemdEngine";

export function useFnsTaxState(
	initialFnsPayload: Partial<FnsTaxCertificatePayload> | undefined,
	clinic: EgiszClinicInfo,
	doctor: EgiszDoctorInfo,
	doctorSig?: GostSignatureInfo,
	moSig?: GostSignatureInfo,
) {
	const isDemo = isDemoShowcaseMode();
	const [taxDocNumber, setTaxDocNumber] = useState<string>(initialFnsPayload?.documentNumber || (isDemo ? SAMPLE_FNS_TAX_1151156_PRESET.documentNumber : ""));
	const [taxYear, setTaxYear] = useState<number>(initialFnsPayload?.taxYear || (isDemo ? SAMPLE_FNS_TAX_1151156_PRESET.taxYear : new Date().getFullYear()));
	const [taxpayerName, setTaxpayerName] = useState<string>(initialFnsPayload?.taxpayer?.fullName || (isDemo ? SAMPLE_FNS_TAX_1151156_PRESET.taxpayer.fullName : ""));
	const [taxpayerInn, setTaxpayerInn] = useState<string>(initialFnsPayload?.taxpayer?.inn || (isDemo ? SAMPLE_FNS_TAX_1151156_PRESET.taxpayer.inn || "" : ""));
	const [taxpayerSnils, setTaxpayerSnils] = useState<string>(initialFnsPayload?.taxpayer?.snils || (isDemo ? SAMPLE_FNS_TAX_1151156_PRESET.taxpayer.snils || "" : ""));
	const [taxpayerBirthDate] = useState<string>(initialFnsPayload?.taxpayer?.birthDate || (isDemo ? SAMPLE_FNS_TAX_1151156_PRESET.taxpayer.birthDate || "" : ""));
	const [taxpayerPassport] = useState<string>(initialFnsPayload?.taxpayer?.docSeriesNumber || (isDemo ? SAMPLE_FNS_TAX_1151156_PRESET.taxpayer.docSeriesNumber || "" : ""));
	const [taxPatientName, setTaxPatientName] = useState<string>(initialFnsPayload?.patient?.fullName || (isDemo ? SAMPLE_FNS_TAX_1151156_PRESET.patient.fullName : ""));
	const [taxPatientSnils, setTaxPatientSnils] = useState<string>(initialFnsPayload?.patient?.snils || (isDemo ? SAMPLE_FNS_TAX_1151156_PRESET.patient.snils || "" : ""));
	const [taxRelCode, setTaxRelCode] = useState<"1" | "2" | "3" | "4">(initialFnsPayload?.patient?.relationshipCode || (isDemo ? SAMPLE_FNS_TAX_1151156_PRESET.patient.relationshipCode : "1"));
	const [taxPayments, setTaxPayments] = useState<FnsTaxPaymentItem[]>(initialFnsPayload?.payments || (isDemo ? SAMPLE_FNS_TAX_1151156_PRESET.payments : []));
	const [taxSignerName, setTaxSignerName] = useState<string>(initialFnsPayload?.signer?.fullName || (isDemo ? SAMPLE_FNS_TAX_1151156_PRESET.signer.fullName : ""));
	const [taxSignerPos] = useState<string>(initialFnsPayload?.signer?.position || (isDemo ? SAMPLE_FNS_TAX_1151156_PRESET.signer.position : "Главный врач"));

	const fnsPayload: FnsTaxCertificatePayload = useMemo(() => ({
		documentNumber: taxDocNumber, documentDate: new Date().toISOString(), taxYear,
		clinic: { name: clinic.clinicName, inn: clinic.clinicInn, kpp: clinic.clinicKpp, ogrn: clinic.clinicOgrn, phone: clinic.clinicPhone, email: clinic.clinicEmail },
		taxpayer: { fullName: taxpayerName, inn: taxpayerInn, snils: taxpayerSnils, birthDate: taxpayerBirthDate, docTypeCode: "21", docSeriesNumber: taxpayerPassport },
		patient: {
			fullName: taxPatientName, snils: taxPatientSnils, relationshipCode: taxRelCode,
			relationshipName: taxRelCode === "1" ? "Сам налогоплательщик" : taxRelCode === "2" ? "Супруг (супруга)" : taxRelCode === "3" ? "Родитель" : "Ребенок / Подопечный",
		},
		payments: taxPayments, signer: { fullName: taxSignerName, position: taxSignerPos, snils: clinic.chiefDoctorSnils || doctor.doctorSnils },
		doctorSignature: doctorSig, moSignature: moSig,
	}), [taxDocNumber, taxYear, clinic, doctor, taxpayerName, taxpayerInn, taxpayerSnils, taxpayerBirthDate, taxpayerPassport, taxPatientName, taxPatientSnils, taxRelCode, taxPayments, taxSignerName, taxSignerPos, doctorSig, moSig]);

	const fnsPreflightReport = useMemo(() => runFnsTaxCertificatePreflight(fnsPayload), [fnsPayload]);
	const handleAddTaxPayment = () => setTaxPayments((prev) => [...prev, { id: `PAY-${Date.now()}`, date: new Date().toISOString().slice(0, 10), serviceCode: "1", serviceDescription: "Терапевтический прием и лечение зуба", amountKopecks: 1000000 }]);
	const handleRemoveTaxPayment = (index: number) => setTaxPayments((prev) => prev.filter((_, i) => i !== index));
	const handleUpdateTaxPaymentAmount = (index: number, rublesStr: string) => {
		const kops = parseRublesToKopecks(rublesStr);
		setTaxPayments((prev) => prev.map((p, i) => (i === index ? { ...p, amountKopecks: kops } : p)));
	};

	return {
		taxDocNumber, setTaxDocNumber, taxYear, setTaxYear, taxpayerName, setTaxpayerName, taxpayerInn, setTaxpayerInn,
		taxpayerSnils, setTaxpayerSnils, taxpayerBirthDate, taxpayerPassport, taxPatientName, setTaxPatientName,
		taxPatientSnils, setTaxPatientSnils, taxRelCode, setTaxRelCode, taxPayments, setTaxPayments, taxSignerName,
		setTaxSignerName, taxSignerPos, fnsPayload, fnsPreflightReport, handleAddTaxPayment, handleRemoveTaxPayment,
		handleUpdateTaxPaymentAmount,
	};
}
