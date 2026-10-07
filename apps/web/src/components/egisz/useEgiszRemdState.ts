/**
 * useEgiszRemdState.ts
 *
 * Custom React Hook encapsulating Dental SEMD & FNS Tax payload state,
 * XML generation, and Preflight validation computations.
 * Compliant with Orders 804n, 947n, ED-7-11/755@ and 63-FZ.
 */

import { useMemo, useState } from "react";
import { isDemoShowcaseMode } from "../../lib/demoMode.js";
import {
	DEFAULT_EGISZ_CLINIC_PRESET,
	DEFAULT_EGISZ_DOCTOR_PRESET,
	type EgiszClinicInfo,
	type EgiszDentalCdaPayload,
	type EgiszDentalSemdCode,
	type EgiszDiagnosisItem,
	type EgiszDoctorInfo,
	type EgiszPatientInfo,
	type EgiszPreflightReport,
	type EgiszProcedureItem,
	type FnsTaxCertificatePayload,
	type FnsTaxPaymentItem,
	type FnsTaxPreflightReport,
	type GostSignatureInfo,
	SAMPLE_043U_PATIENT_PRESET,
	SAMPLE_DENTAL_SEMD_105_PRESET,
	SAMPLE_FNS_TAX_1151156_PRESET,
	generateEgiszDentalCdaXml,
	generateFnsTaxCertificatePrintHtml,
	generateFnsTaxCertificateXml,
	generateForm043uPrintHtml,
	parseRublesToKopecks,
	runEgisz043uPreflight,
	runFnsTaxCertificatePreflight,
	validateXmlStructure,
} from "./egiszRemdEngine";

export interface UseEgiszRemdStateProps {
	readonly initialPayload?: Partial<EgiszDentalCdaPayload> | undefined;
	readonly initialXmlPayload?: any | undefined;
	readonly initialFnsPayload?: Partial<FnsTaxCertificatePayload> | undefined;
	readonly activeDocType: "cda_semd" | "fns_tax";
	readonly doctorSig?: GostSignatureInfo | undefined;
	readonly moSig?: GostSignatureInfo | undefined;
}

export function useEgiszRemdState({
	initialPayload,
	initialXmlPayload,
	initialFnsPayload,
	activeDocType,
	doctorSig,
	moSig,
}: UseEgiszRemdStateProps) {
	const isDemo = isDemoShowcaseMode();
	const effectivePayload = (initialPayload || initialXmlPayload) as Partial<EgiszDentalCdaPayload> | undefined;

	// 1. Dental SEMD Payload State
	const [semdDocCode, setSemdDocCode] = useState<EgiszDentalSemdCode>(
		(effectivePayload?.docTypeCode as EgiszDentalSemdCode) || "105",
	);
	const [clinic] = useState<EgiszClinicInfo>(
		effectivePayload?.clinic || DEFAULT_EGISZ_CLINIC_PRESET,
	);
	const [doctor, setDoctor] = useState<EgiszDoctorInfo>(
		effectivePayload?.doctor || DEFAULT_EGISZ_DOCTOR_PRESET,
	);
	const [patient, setPatient] = useState<EgiszPatientInfo>(
		effectivePayload?.patient || SAMPLE_043U_PATIENT_PRESET,
	);

	const [complaints, setComplaints] = useState<string>(
		effectivePayload?.complaints || (isDemo ? SAMPLE_DENTAL_SEMD_105_PRESET.complaints : ""),
	);
	const [anamnesisMorbi, setAnamnesisMorbi] = useState<string>(
		effectivePayload?.anamnesisMorbi || (isDemo ? SAMPLE_DENTAL_SEMD_105_PRESET.anamnesisMorbi || "" : ""),
	);
	const [anamnesisVitae] = useState<string>(
		effectivePayload?.anamnesisVitae || (isDemo ? SAMPLE_DENTAL_SEMD_105_PRESET.anamnesisVitae || "" : ""),
	);
	const [toothStates, setToothStates] = useState<Record<number, string>>(
		effectivePayload?.toothStates || (isDemo ? SAMPLE_DENTAL_SEMD_105_PRESET.toothStates : {}),
	);
	const [toothSurfaces] = useState<Record<number, string[]>>(
		effectivePayload?.toothSurfaces || (isDemo ? SAMPLE_DENTAL_SEMD_105_PRESET.toothSurfaces || {} : {}),
	);
	const [diagnoses, setDiagnoses] = useState<EgiszDiagnosisItem[]>(
		effectivePayload?.diagnoses || (isDemo ? SAMPLE_DENTAL_SEMD_105_PRESET.diagnoses : []),
	);
	const [procedures, setProcedures] = useState<EgiszProcedureItem[]>(
		effectivePayload?.procedures || (isDemo ? SAMPLE_DENTAL_SEMD_105_PRESET.procedures : []),
	);
	const [treatmentDesc] = useState<string>(
		effectivePayload?.treatmentProtocolDescription || (isDemo ? SAMPLE_DENTAL_SEMD_105_PRESET.treatmentProtocolDescription || "" : ""),
	);
	const [recommendations] = useState<string>(
		effectivePayload?.recommendations || (isDemo ? SAMPLE_DENTAL_SEMD_105_PRESET.recommendations : ""),
	);
	const [nextVisitDate] = useState<string>(
		effectivePayload?.nextVisitDate ? String(effectivePayload.nextVisitDate) : (isDemo ? "2027-02-28" : ""),
	);

	// 2. FNS Tax Deduction Payload State
	const [taxDocNumber, setTaxDocNumber] = useState<string>(
		initialFnsPayload?.documentNumber || (isDemo ? SAMPLE_FNS_TAX_1151156_PRESET.documentNumber : ""),
	);
	const [taxYear, setTaxYear] = useState<number>(
		initialFnsPayload?.taxYear || (isDemo ? SAMPLE_FNS_TAX_1151156_PRESET.taxYear : new Date().getFullYear()),
	);
	const [taxpayerName, setTaxpayerName] = useState<string>(
		initialFnsPayload?.taxpayer?.fullName || (isDemo ? SAMPLE_FNS_TAX_1151156_PRESET.taxpayer.fullName : ""),
	);
	const [taxpayerInn, setTaxpayerInn] = useState<string>(
		initialFnsPayload?.taxpayer?.inn || (isDemo ? SAMPLE_FNS_TAX_1151156_PRESET.taxpayer.inn || "" : ""),
	);
	const [taxpayerSnils, setTaxpayerSnils] = useState<string>(
		initialFnsPayload?.taxpayer?.snils || (isDemo ? SAMPLE_FNS_TAX_1151156_PRESET.taxpayer.snils || "" : ""),
	);
	const [taxpayerBirthDate] = useState<string>(
		initialFnsPayload?.taxpayer?.birthDate || (isDemo ? SAMPLE_FNS_TAX_1151156_PRESET.taxpayer.birthDate || "" : ""),
	);
	const [taxpayerPassport] = useState<string>(
		initialFnsPayload?.taxpayer?.docSeriesNumber || (isDemo ? SAMPLE_FNS_TAX_1151156_PRESET.taxpayer.docSeriesNumber || "" : ""),
	);

	const [taxPatientName, setTaxPatientName] = useState<string>(
		initialFnsPayload?.patient?.fullName || (isDemo ? SAMPLE_FNS_TAX_1151156_PRESET.patient.fullName : ""),
	);
	const [taxPatientSnils, setTaxPatientSnils] = useState<string>(
		initialFnsPayload?.patient?.snils || (isDemo ? SAMPLE_FNS_TAX_1151156_PRESET.patient.snils || "" : ""),
	);
	const [taxRelCode, setTaxRelCode] = useState<"1" | "2" | "3" | "4">(
		initialFnsPayload?.patient?.relationshipCode || (isDemo ? SAMPLE_FNS_TAX_1151156_PRESET.patient.relationshipCode : "1"),
	);

	const [taxPayments, setTaxPayments] = useState<FnsTaxPaymentItem[]>(
		initialFnsPayload?.payments || (isDemo ? SAMPLE_FNS_TAX_1151156_PRESET.payments : []),
	);
	const [taxSignerName, setTaxSignerName] = useState<string>(
		initialFnsPayload?.signer?.fullName || (isDemo ? SAMPLE_FNS_TAX_1151156_PRESET.signer.fullName : ""),
	);
	const [taxSignerPos] = useState<string>(
		initialFnsPayload?.signer?.position || (isDemo ? SAMPLE_FNS_TAX_1151156_PRESET.signer.position : "Главный врач"),
	);

	// Odontogram selection state
	const [selectedTooth, setSelectedTooth] = useState<number>(46);

	// Build Full CDA Payload
	const semdPayload: EgiszDentalCdaPayload = useMemo(() => {
		return {
			docTypeCode: semdDocCode,
			documentUuid: `DOC-${semdDocCode}-${Date.now()}`,
			documentVersion: 1,
			encounterDate: new Date().toISOString(),
			clinic,
			doctor,
			patient,
			complaints,
			anamnesisMorbi,
			anamnesisVitae,
			toothStates,
			toothSurfaces,
			diagnoses,
			procedures,
			treatmentProtocolDescription: treatmentDesc,
			recommendations,
			nextVisitDate,
			doctorSignature: doctorSig,
			moSignature: moSig,
		};
	}, [
		semdDocCode,
		clinic,
		doctor,
		patient,
		complaints,
		anamnesisMorbi,
		anamnesisVitae,
		toothStates,
		toothSurfaces,
		diagnoses,
		procedures,
		treatmentDesc,
		recommendations,
		nextVisitDate,
		doctorSig,
		moSig,
	]);

	// Build Full FNS Tax Payload
	const fnsPayload: FnsTaxCertificatePayload = useMemo(() => {
		return {
			documentNumber: taxDocNumber,
			documentDate: new Date().toISOString(),
			taxYear,
			clinic: {
				name: clinic.clinicName,
				inn: clinic.clinicInn,
				kpp: clinic.clinicKpp,
				ogrn: clinic.clinicOgrn,
				phone: clinic.clinicPhone,
				email: clinic.clinicEmail,
			},
			taxpayer: {
				fullName: taxpayerName,
				inn: taxpayerInn,
				snils: taxpayerSnils,
				birthDate: taxpayerBirthDate,
				docTypeCode: "21",
				docSeriesNumber: taxpayerPassport,
			},
			patient: {
				fullName: taxPatientName,
				snils: taxPatientSnils,
				relationshipCode: taxRelCode,
				relationshipName:
					taxRelCode === "1"
						? "Сам налогоплательщик"
						: taxRelCode === "2"
						? "Супруг (супруга)"
						: taxRelCode === "3"
						? "Родитель"
						: "Ребенок / Подопечный",
			},
			payments: taxPayments,
			signer: {
				fullName: taxSignerName,
				position: taxSignerPos,
				snils: clinic.chiefDoctorSnils || doctor.doctorSnils,
			},
			doctorSignature: doctorSig,
			moSignature: moSig,
		};
	}, [
		taxDocNumber,
		taxYear,
		clinic,
		doctor,
		taxpayerName,
		taxpayerInn,
		taxpayerSnils,
		taxpayerBirthDate,
		taxpayerPassport,
		taxPatientName,
		taxPatientSnils,
		taxRelCode,
		taxPayments,
		taxSignerName,
		taxSignerPos,
		doctorSig,
		moSig,
	]);

	// Preflight validation reports
	const cdaPreflightReport: EgiszPreflightReport = useMemo(() => {
		return runEgisz043uPreflight(semdPayload);
	}, [semdPayload]);

	const fnsPreflightReport: FnsTaxPreflightReport = useMemo(() => {
		return runFnsTaxCertificatePreflight(fnsPayload);
	}, [fnsPayload]);

	// Active XML output
	const generatedXml = useMemo(() => {
		if (activeDocType === "cda_semd") {
			return generateEgiszDentalCdaXml(semdPayload);
		}
		return generateFnsTaxCertificateXml(fnsPayload);
	}, [activeDocType, semdPayload, fnsPayload]);

	// Active XML Structure Validation
	const xmlValidation = useMemo(() => {
		return validateXmlStructure(generatedXml);
	}, [generatedXml]);

	// Preflight report to display
	const activePreflight = activeDocType === "cda_semd" ? cdaPreflightReport : fnsPreflightReport;

	// Printable HTML
	const printableHtml = useMemo(() => {
		return activeDocType === "cda_semd"
			? generateForm043uPrintHtml(semdPayload)
			: generateFnsTaxCertificatePrintHtml(fnsPayload);
	}, [activeDocType, semdPayload, fnsPayload]);

	// Handlers
	const handleUpdateToothStatus = (toothNum: number, statusKey: string) => {
		setToothStates((prev) => ({
			...prev,
			[toothNum]: statusKey,
		}));
	};

	const handleAddDiagnosis = () => {
		const newDiag: EgiszDiagnosisItem = {
			icd10Code: "K02.1",
			icd10Name: "Кариес дентина",
			isPrimary: diagnoses.length === 0,
			tooth: selectedTooth,
			surfaces: ["O"],
		};
		setDiagnoses((prev) => [...prev, newDiag]);
	};

	const handleRemoveDiagnosis = (index: number) => {
		setDiagnoses((prev) => prev.filter((_, i) => i !== index));
	};

	const handleAddProcedure = () => {
		const newProc: EgiszProcedureItem = {
			code: "B01.065.001",
			name: "Прием (осмотр, консультация) врача-стоматолога-терапевта первичный",
			tooth: selectedTooth,
			quantity: 1,
		};
		setProcedures((prev) => [...prev, newProc]);
	};

	const handleRemoveProcedure = (index: number) => {
		setProcedures((prev) => prev.filter((_, i) => i !== index));
	};

	const handleAddTaxPayment = () => {
		const newPay: FnsTaxPaymentItem = {
			id: `PAY-${Date.now()}`,
			date: new Date().toISOString().slice(0, 10),
			serviceCode: "1",
			serviceDescription: "Терапевтический прием и лечение зуба",
			amountKopecks: 1000000,
		};
		setTaxPayments((prev) => [...prev, newPay]);
	};

	const handleRemoveTaxPayment = (index: number) => {
		setTaxPayments((prev) => prev.filter((_, i) => i !== index));
	};

	const handleUpdateTaxPaymentAmount = (index: number, rublesStr: string) => {
		const kops = parseRublesToKopecks(rublesStr);
		setTaxPayments((prev) =>
			prev.map((p, i) => (i === index ? { ...p, amountKopecks: kops } : p)),
		);
	};

	return {
		semdDocCode,
		setSemdDocCode,
		clinic,
		doctor,
		setDoctor,
		patient,
		setPatient,
		complaints,
		setComplaints,
		anamnesisMorbi,
		setAnamnesisMorbi,
		anamnesisVitae,
		toothStates,
		setToothStates,
		toothSurfaces,
		diagnoses,
		procedures,
		treatmentDesc,
		recommendations,
		nextVisitDate,
		taxDocNumber,
		setTaxDocNumber,
		taxYear,
		setTaxYear,
		taxpayerName,
		setTaxpayerName,
		taxpayerInn,
		setTaxpayerInn,
		taxpayerSnils,
		setTaxpayerSnils,
		taxpayerBirthDate,
		taxpayerPassport,
		taxPatientName,
		setTaxPatientName,
		taxPatientSnils,
		setTaxPatientSnils,
		taxRelCode,
		setTaxRelCode,
		taxPayments,
		setTaxPayments,
		taxSignerName,
		setTaxSignerName,
		taxSignerPos,
		selectedTooth,
		setSelectedTooth,
		semdPayload,
		fnsPayload,
		cdaPreflightReport,
		fnsPreflightReport,
		activePreflight,
		generatedXml,
		xmlValidation,
		printableHtml,
		handleUpdateToothStatus,
		handleAddDiagnosis,
		handleRemoveDiagnosis,
		handleAddProcedure,
		handleRemoveProcedure,
		handleAddTaxPayment,
		handleRemoveTaxPayment,
		handleUpdateTaxPaymentAmount,
	};
}
