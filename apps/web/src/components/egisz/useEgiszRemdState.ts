/**
 * useEgiszRemdState.ts — Dental SEMD & FNS Tax payload state, XML, and preflight computations.
 * Mandate 8b compliant (<= 120 lines). Decomposed into ./remdState/
 */

import { useMemo } from "react";
import {
	type EgiszDentalCdaPayload,
	generateEgiszDentalCdaXml,
	generateFnsTaxCertificatePrintHtml,
	generateFnsTaxCertificateXml,
	generateForm043uPrintHtml,
	validateXmlStructure,
} from "./egiszRemdEngine";
import type { UseEgiszRemdStateProps } from "./remdState/remdStateTypes";
import { useClinicalSemdState } from "./remdState/useClinicalSemdState";
import { useFnsTaxState } from "./remdState/useFnsTaxState";

export type { UseEgiszRemdStateProps } from "./remdState/remdStateTypes";

export function useEgiszRemdState({
	initialPayload,
	initialXmlPayload,
	initialFnsPayload,
	activeDocType,
	doctorSig,
	moSig,
}: UseEgiszRemdStateProps) {
	const effectivePayload = (initialPayload || initialXmlPayload) as Partial<EgiszDentalCdaPayload> | undefined;

	const clinical = useClinicalSemdState(effectivePayload, doctorSig, moSig);
	const fns = useFnsTaxState(initialFnsPayload, clinical.clinic, clinical.doctor, doctorSig, moSig);

	const generatedXml = useMemo(() => {
		if (activeDocType === "cda_semd") {
			return generateEgiszDentalCdaXml(clinical.semdPayload);
		}
		return generateFnsTaxCertificateXml(fns.fnsPayload);
	}, [activeDocType, clinical.semdPayload, fns.fnsPayload]);

	const xmlValidation = useMemo(() => validateXmlStructure(generatedXml), [generatedXml]);
	const activePreflight = activeDocType === "cda_semd" ? clinical.cdaPreflightReport : fns.fnsPreflightReport;

	const printableHtml = useMemo(() => {
		return activeDocType === "cda_semd"
			? generateForm043uPrintHtml(clinical.semdPayload)
			: generateFnsTaxCertificatePrintHtml(fns.fnsPayload);
	}, [activeDocType, clinical.semdPayload, fns.fnsPayload]);

	return {
		semdDocCode: clinical.semdDocCode, setSemdDocCode: clinical.setSemdDocCode,
		clinic: clinical.clinic, doctor: clinical.doctor, setDoctor: clinical.setDoctor,
		patient: clinical.patient, setPatient: clinical.setPatient,
		complaints: clinical.complaints, setComplaints: clinical.setComplaints,
		anamnesisMorbi: clinical.anamnesisMorbi, setAnamnesisMorbi: clinical.setAnamnesisMorbi,
		anamnesisVitae: clinical.anamnesisVitae, toothStates: clinical.toothStates,
		setToothStates: clinical.setToothStates, toothSurfaces: clinical.toothSurfaces,
		diagnoses: clinical.diagnoses, procedures: clinical.procedures,
		treatmentDesc: clinical.treatmentDesc, recommendations: clinical.recommendations,
		nextVisitDate: clinical.nextVisitDate,
		taxDocNumber: fns.taxDocNumber, setTaxDocNumber: fns.setTaxDocNumber,
		taxYear: fns.taxYear, setTaxYear: fns.setTaxYear,
		taxpayerName: fns.taxpayerName, setTaxpayerName: fns.setTaxpayerName,
		taxpayerInn: fns.taxpayerInn, setTaxpayerInn: fns.setTaxpayerInn,
		taxpayerSnils: fns.taxpayerSnils, setTaxpayerSnils: fns.setTaxpayerSnils,
		taxpayerBirthDate: fns.taxpayerBirthDate, taxpayerPassport: fns.taxpayerPassport,
		taxPatientName: fns.taxPatientName, setTaxPatientName: fns.setTaxPatientName,
		taxPatientSnils: fns.taxPatientSnils, setTaxPatientSnils: fns.setTaxPatientSnils,
		taxRelCode: fns.taxRelCode, setTaxRelCode: fns.setTaxRelCode,
		taxPayments: fns.taxPayments, setTaxPayments: fns.setTaxPayments,
		taxSignerName: fns.taxSignerName, setTaxSignerName: fns.setTaxSignerName,
		taxSignerPos: fns.taxSignerPos,
		selectedTooth: clinical.selectedTooth, setSelectedTooth: clinical.setSelectedTooth,
		semdPayload: clinical.semdPayload, fnsPayload: fns.fnsPayload,
		cdaPreflightReport: clinical.cdaPreflightReport, fnsPreflightReport: fns.fnsPreflightReport,
		activePreflight, generatedXml, xmlValidation, printableHtml,
		handleUpdateToothStatus: clinical.handleUpdateToothStatus,
		handleAddDiagnosis: clinical.handleAddDiagnosis,
		handleRemoveDiagnosis: clinical.handleRemoveDiagnosis,
		handleAddProcedure: clinical.handleAddProcedure,
		handleRemoveProcedure: clinical.handleRemoveProcedure,
		handleAddTaxPayment: fns.handleAddTaxPayment,
		handleRemoveTaxPayment: fns.handleRemoveTaxPayment,
		handleUpdateTaxPaymentAmount: fns.handleUpdateTaxPaymentAmount,
	};
}
