import { useState, useMemo, useEffect } from "react";
import type { FamilyMemberPayerConfig, TaxDeductionCertificateParams, TaxDeductionRelationship } from "../taxDeductionEngine";
import { generateFamilyTaxDeductionBatch, extractTaxYearFromDate, normalizePaymentsForTaxCertificate } from "../taxDeductionEngine";
import { showToast } from "../../GlobalToast";
import { useOptionalAppLogicContext } from "../../../contexts/AppLogicContext.js";
import type { TaxDeductionCertificateModalProps, TaxDeductionTab } from "./types";
import { useTaxDeductionFamilyAndPayments } from "./useTaxDeductionFamilyAndPayments";
import { useTaxDeductionCalculation } from "./useTaxDeductionCalculation";
import { useTaxDeductionExportActions } from "./useTaxDeductionExportActions";

export function useTaxDeductionCertificate(props: TaxDeductionCertificateModalProps) {
	const { isOpen, patientName = "", patientBirthDate = "", patientInn = "", patientSnils = "", payerSnils: initialPayerSnils = "", payments = [], selectedYear: propSelectedYear, defaultTaxYear, patientId } = props;
	const appLogic = useOptionalAppLogicContext();
	const clinicProfile = appLogic?.clinic;

	const clinicName = props.clinicName || clinicProfile?.legalName || clinicProfile?.clinicName || "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»";
	const clinicInn = props.clinicInn || clinicProfile?.inn || "";
	const clinicKpp = props.clinicKpp || clinicProfile?.kpp || "";
	const clinicOgrn = props.clinicOgrn || clinicProfile?.ogrn || "";
	const clinicLicenseNumber = props.clinicLicenseNumber || clinicProfile?.medicalLicenseNumber || "";
	const clinicLicenseDate = props.clinicLicenseDate || clinicProfile?.medicalLicenseIssuedAt || "";
	const clinicAddress = props.clinicAddress || clinicProfile?.address || "";
	const chiefDoctorName = props.chiefDoctorName && props.chiefDoctorName !== "Руководитель клиники" ? props.chiefDoctorName : (clinicProfile as { chiefDoctorName?: string } | undefined)?.chiefDoctorName || "";

	const currentYear = new Date().getFullYear();
	const [activeTab, setActiveTab] = useState<TaxDeductionTab>(props.initialTab || "form");
	const [selectedYear, setSelectedYear] = useState<number>(() => propSelectedYear || defaultTaxYear || (payments.length > 0 ? Math.max(...payments.map((p) => extractTaxYearFromDate(p.dateIso)).filter((y) => !isNaN(y) && y > 2000)) : currentYear));
	const [payerRelationship, setPayerRelationship] = useState<TaxDeductionRelationship>("patient");
	const [payerFullName, setPayerFullName] = useState<string>(patientName);
	const [payerInn, setPayerInn] = useState<string>(patientInn);
	const [payerBirthDate, setPayerBirthDate] = useState<string>(patientBirthDate);
	const [payerSnils, setPayerSnils] = useState<string>(initialPayerSnils);
	const [patientSnilsState, setPatientSnilsState] = useState<string>(patientSnils);
	const [passportSeries, setPassportSeries] = useState<string>("");
	const [passportNumber, setPassportNumber] = useState<string>("");
	const [certificateNumber, setCertificateNumber] = useState<string>("1");
	const [taxOfficeCode, setTaxOfficeCode] = useState<string>("7701");
	const [isCopiedXml, setIsCopiedXml] = useState<boolean>(false);
	const [isManualAdjustment, setIsManualAdjustment] = useState<boolean>(false);
	const [manualCode01Rub, setManualCode01Rub] = useState<string>("");
	const [manualCode02Rub, setManualCode02Rub] = useState<string>("");
	const [manualAdjustmentReason, setManualAdjustmentReason] = useState<string>("");

	const { effectivePayments, isLoadingPayments, familyMembers } = useTaxDeductionFamilyAndPayments(props, appLogic, selectedYear);

	useEffect(() => {
		if (isOpen) {
			if (patientName) setPayerFullName(patientName);
			if (patientBirthDate) setPayerBirthDate(patientBirthDate);
			if (patientInn) setPayerInn(patientInn);
			if (patientSnils) setPatientSnilsState(patientSnils);
			if (initialPayerSnils) setPayerSnils(initialPayerSnils);
			if (propSelectedYear) setSelectedYear(propSelectedYear);
			else if (defaultTaxYear) setSelectedYear(defaultTaxYear);
		}
	}, [isOpen, patientName, patientBirthDate, patientInn, patientSnils, initialPayerSnils, propSelectedYear, defaultTaxYear]);

	const availableYears = useMemo(() => Array.from(new Set([currentYear - 2, currentYear - 1, currentYear, ...effectivePayments.map((p) => extractTaxYearFromDate(p.dateIso)).filter((y) => !isNaN(y) && y > 2000)])).sort((a, b) => a - b), [currentYear, effectivePayments]);
	const paymentsCountByYear = useMemo(() => {
		const counts: Record<number, number> = {};
		for (const p of effectivePayments) { const yr = extractTaxYearFromDate(p.dateIso); if (!isNaN(yr)) counts[yr] = (counts[yr] || 0) + 1; }
		return counts;
	}, [effectivePayments]);

	const handleFillFromPatient = () => { setPayerFullName(patientName); setPayerBirthDate(patientBirthDate); if (patientInn) setPayerInn(patientInn); setPayerRelationship("patient"); showToast("Данные плательщика заполнены из карточки пациента", "info"); };
	const handleSelectFamilyMember = (member: FamilyMemberPayerConfig | "self") => {
		if (member === "self") { handleFillFromPatient(); return; }
		setPayerFullName(member.person.fullName); setPayerInn(member.person.inn || ""); setPayerBirthDate(member.person.birthDate || ""); setPassportSeries(member.person.identityDocumentSeries || ""); setPassportNumber(member.person.identityDocumentNumber || ""); setPayerRelationship(member.relationship); showToast(`Выбран плательщик: ${member.person.fullName}`, "info");
	};

	const yearPayments = useMemo(() => isOpen ? normalizePaymentsForTaxCertificate(effectivePayments, selectedYear) : [], [isOpen, effectivePayments, selectedYear]);

	const getCertificateParams = (): TaxDeductionCertificateParams => ({
		certificateNumber, issueDateIso: new Date().toISOString(), taxYear: selectedYear, taxOfficeCode,
		clinic: { legalName: clinicName, inn: clinicInn, kpp: clinicKpp, ogrn: clinicOgrn, licenseNumber: clinicLicenseNumber, licenseDate: clinicLicenseDate, address: clinicAddress, chiefDoctorName },
		payer: { fullName: payerFullName, inn: payerInn, birthDate: payerBirthDate, identityDocumentSeries: passportSeries, identityDocumentNumber: passportNumber, relationship: payerRelationship, snils: payerSnils?.trim() || undefined },
		patient: { fullName: patientName, birthDate: patientBirthDate, inn: patientInn, snils: patientSnilsState?.trim() || undefined },
		payments: yearPayments,
	});

	const calc = useTaxDeductionCalculation({ isOpen, effectivePayments, selectedYear, isManualAdjustment, manualCode01Rub, manualCode02Rub, payerInn, passportSeries, passportNumber, getCertificateParams });
	const familyBatchResult = useMemo(() => isOpen ? generateFamilyTaxDeductionBatch({ clinic: { legalName: clinicName, inn: clinicInn, kpp: clinicKpp, ogrn: clinicOgrn, licenseNumber: clinicLicenseNumber, licenseDate: clinicLicenseDate, address: clinicAddress, chiefDoctorName }, taxYear: selectedYear, taxOfficeCode, patient: { fullName: patientName, inn: patientInn, birthDate: patientBirthDate, identityDocumentSeries: passportSeries, identityDocumentNumber: passportNumber }, familyMembers, payments: yearPayments, startCertificateNumber: certificateNumber }) : { batch: { taxYear: selectedYear, taxOfficeCode, clinic: { legalName: clinicName, inn: clinicInn, kpp: clinicKpp, ogrn: clinicOgrn, licenseNumber: clinicLicenseNumber, licenseDate: clinicLicenseDate, address: clinicAddress, chiefDoctorName }, certificates: [] }, summaries: [], grandTotalRub: 0, grandTotalKopecks: 0, grandTotalCode01Rub: 0, grandTotalCode01Kopecks: 0, grandTotalCode02Rub: 0, grandTotalCode02Kopecks: 0, grandTotalRefund13Rub: 0, grandTotalRefund13Kopecks: 0, grandTotalRefund15Rub: 0, grandTotalRefund15Kopecks: 0, certificatesCount: 0, totalPaymentsCount: 0 }, [isOpen, selectedYear, taxOfficeCode, clinicName, clinicInn, clinicKpp, clinicOgrn, clinicLicenseNumber, clinicLicenseDate, clinicAddress, chiefDoctorName, patientName, patientInn, patientBirthDate, passportSeries, passportNumber, familyMembers, yearPayments, certificateNumber]);

	const actions = useTaxDeductionExportActions({
		getCertificateParams, patientId, selectedYear, payerInn, yearPayments, totalRub: calc.targetYearSummary.totalRub,
		appLogic, familyBatchResult, xmlRepresentation: calc.xmlRepresentation, setIsCopiedXml,
		payerFullName, payerRelationship, payerBirthDate, patientName, patientBirthDate, patientInn,
	});

	return {
		activeTab, setActiveTab, selectedYear, setSelectedYear, payerRelationship, setPayerRelationship, payerFullName, setPayerFullName, payerInn, setPayerInn, payerBirthDate, setPayerBirthDate, payerSnils, setPayerSnils, patientSnils: patientSnilsState, setPatientSnils: setPatientSnilsState, passportSeries, setPassportSeries, passportNumber, setPassportNumber, certificateNumber, setCertificateNumber, taxOfficeCode, setTaxOfficeCode, isCopiedXml, isLoadingPayments, availableYears, paymentsCountByYear, isManualAdjustment, setIsManualAdjustment, manualCode01Rub, setManualCode01Rub, manualCode02Rub, setManualCode02Rub, manualAdjustmentReason, setManualAdjustmentReason, familyMembers, handleSelectFamilyMember, handleFillFromPatient, yearPayments, effectivePayments, clinicName, clinicInn, clinicKpp, clinicOgrn, clinicLicenseNumber, clinicLicenseDate, clinicAddress, chiefDoctorName, ...calc, familyBatchResult, ...actions,
	};
}
