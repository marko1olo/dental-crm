/**
 * useClinicalSemdState.ts — Sub-hook managing Dental SEMD (Order 947n / 804n) clinical payload.
 * Mandate 8b compliant (<= 120 lines).
 */

import { useMemo, useState } from "react";
import { isDemoShowcaseMode } from "../../../lib/demoMode.js";
import {
	DEFAULT_EGISZ_CLINIC_PRESET,
	DEFAULT_EGISZ_DOCTOR_PRESET,
	SAMPLE_043U_PATIENT_PRESET,
	SAMPLE_DENTAL_SEMD_105_PRESET,
	type EgiszClinicInfo,
	type EgiszDentalCdaPayload,
	type EgiszDentalSemdCode,
	type EgiszDiagnosisItem,
	type EgiszDoctorInfo,
	type EgiszPatientInfo,
	type EgiszProcedureItem,
	type GostSignatureInfo,
	runEgisz043uPreflight,
} from "../egiszRemdEngine";

export function useClinicalSemdState(
	effectivePayload?: Partial<EgiszDentalCdaPayload>,
	doctorSig?: GostSignatureInfo,
	moSig?: GostSignatureInfo,
) {
	const isDemo = isDemoShowcaseMode();
	const [semdDocCode, setSemdDocCode] = useState<EgiszDentalSemdCode>((effectivePayload?.docTypeCode as EgiszDentalSemdCode) || "105");
	const [clinic] = useState<EgiszClinicInfo>(effectivePayload?.clinic || DEFAULT_EGISZ_CLINIC_PRESET);
	const [doctor, setDoctor] = useState<EgiszDoctorInfo>(effectivePayload?.doctor || DEFAULT_EGISZ_DOCTOR_PRESET);
	const [patient, setPatient] = useState<EgiszPatientInfo>(effectivePayload?.patient || SAMPLE_043U_PATIENT_PRESET);

	const [complaints, setComplaints] = useState<string>(effectivePayload?.complaints || (isDemo ? SAMPLE_DENTAL_SEMD_105_PRESET.complaints : ""));
	const [anamnesisMorbi, setAnamnesisMorbi] = useState<string>(effectivePayload?.anamnesisMorbi || (isDemo ? SAMPLE_DENTAL_SEMD_105_PRESET.anamnesisMorbi || "" : ""));
	const [anamnesisVitae] = useState<string>(effectivePayload?.anamnesisVitae || (isDemo ? SAMPLE_DENTAL_SEMD_105_PRESET.anamnesisVitae || "" : ""));
	const [toothStates, setToothStates] = useState<Record<number, string>>(effectivePayload?.toothStates || (isDemo ? SAMPLE_DENTAL_SEMD_105_PRESET.toothStates : {}));
	const [toothSurfaces] = useState<Record<number, string[]>>(effectivePayload?.toothSurfaces || (isDemo ? SAMPLE_DENTAL_SEMD_105_PRESET.toothSurfaces || {} : {}));
	const [diagnoses, setDiagnoses] = useState<EgiszDiagnosisItem[]>(effectivePayload?.diagnoses || (isDemo ? SAMPLE_DENTAL_SEMD_105_PRESET.diagnoses : []));
	const [procedures, setProcedures] = useState<EgiszProcedureItem[]>(effectivePayload?.procedures || (isDemo ? SAMPLE_DENTAL_SEMD_105_PRESET.procedures : []));
	const [treatmentDesc] = useState<string>(effectivePayload?.treatmentProtocolDescription || (isDemo ? SAMPLE_DENTAL_SEMD_105_PRESET.treatmentProtocolDescription || "" : ""));
	const [recommendations] = useState<string>(effectivePayload?.recommendations || (isDemo ? SAMPLE_DENTAL_SEMD_105_PRESET.recommendations : ""));
	const [nextVisitDate] = useState<string>(effectivePayload?.nextVisitDate ? String(effectivePayload.nextVisitDate) : (isDemo ? "2027-02-28" : ""));
	const [selectedTooth, setSelectedTooth] = useState<number>(46);

	const semdPayload: EgiszDentalCdaPayload = useMemo(() => ({
		docTypeCode: semdDocCode,
		documentUuid: `DOC-${semdDocCode}-${Date.now()}`,
		documentVersion: 1,
		encounterDate: new Date().toISOString(),
		clinic, doctor, patient, complaints, anamnesisMorbi, anamnesisVitae,
		toothStates, toothSurfaces, diagnoses, procedures,
		treatmentProtocolDescription: treatmentDesc,
		recommendations, nextVisitDate, doctorSignature: doctorSig, moSignature: moSig,
	}), [semdDocCode, clinic, doctor, patient, complaints, anamnesisMorbi, anamnesisVitae, toothStates, toothSurfaces, diagnoses, procedures, treatmentDesc, recommendations, nextVisitDate, doctorSig, moSig]);

	const cdaPreflightReport = useMemo(() => runEgisz043uPreflight(semdPayload), [semdPayload]);

	const handleUpdateToothStatus = (toothNum: number, statusKey: string) => setToothStates((prev) => ({ ...prev, [toothNum]: statusKey }));
	const handleAddDiagnosis = () => setDiagnoses((prev) => [...prev, { icd10Code: "K02.1", icd10Name: "Кариес дентина", isPrimary: prev.length === 0, tooth: selectedTooth, surfaces: ["O"] }]);
	const handleRemoveDiagnosis = (index: number) => setDiagnoses((prev) => prev.filter((_, i) => i !== index));
	const handleAddProcedure = () => setProcedures((prev) => [...prev, { code: "B01.065.001", name: "Прием (осмотр, консультация) врача-стоматолога-терапевта первичный", tooth: selectedTooth, quantity: 1 }]);
	const handleRemoveProcedure = (index: number) => setProcedures((prev) => prev.filter((_, i) => i !== index));

	return {
		semdDocCode, setSemdDocCode, clinic, doctor, setDoctor, patient, setPatient,
		complaints, setComplaints, anamnesisMorbi, setAnamnesisMorbi, anamnesisVitae,
		toothStates, setToothStates, toothSurfaces, diagnoses, procedures, treatmentDesc,
		recommendations, nextVisitDate, selectedTooth, setSelectedTooth, semdPayload,
		cdaPreflightReport, handleUpdateToothStatus, handleAddDiagnosis, handleRemoveDiagnosis,
		handleAddProcedure, handleRemoveProcedure,
	};
}
