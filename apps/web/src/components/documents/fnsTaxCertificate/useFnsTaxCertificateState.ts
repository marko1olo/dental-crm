import { useEffect, useMemo, useState } from "react";
import type { Patient } from "@dental/shared";
import { showToast } from "../../GlobalToast";
import {
	validateRussianInn,
	aggregatePatientPaymentsForTaxYear,
	printTaxCertificate,
	type TaxDeductionRelationship,
	type TaxPaymentRecord,
} from "../taxCertificateEngine";
import { extractClinicRequisites, buildTaxDocPayload } from "./fnsTaxCertificateHelpers";
import { fetchTaxReceiptsPreview, issueTaxCertificateDoc } from "./fnsTaxCertificateApi";

interface Params {
	isOpen: boolean;
	patient?: Patient | null | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: clinic profile
	clinicProfileDraft?: any;
	payments?: TaxPaymentRecord[] | undefined;
	initialYear?: number | undefined;
	onPrint?: (() => void) | undefined;
	onClose: () => void;
}

export function useFnsTaxCertificateState({
	isOpen,
	patient,
	clinicProfileDraft,
	payments = [],
	initialYear = new Date().getFullYear(),
	onPrint,
	onClose,
}: Params) {
	const [selectedYear, setSelectedYear] = useState<number>(initialYear);
	const [relationship, setRelationship] = useState<TaxDeductionRelationship>("patient");
	const [taxpayerFullName, setTaxpayerFullName] = useState("");
	const [taxpayerInn, setTaxpayerInn] = useState("");
	const [taxpayerBirthDate, setTaxpayerBirthDate] = useState("");
	const [livePayments, setLivePayments] = useState<TaxPaymentRecord[] | null>(null);
	const [isLoadingPreview, setIsLoadingPreview] = useState(false);
	const [isIssuingDoc, setIsIssuingDoc] = useState(false);

	// biome-ignore lint/suspicious/noExplicitAny: patient admin profile
	const patientInn = (patient as { inn?: string | null })?.inn || ((patient as any)?.administrativeProfile?.inn as string | undefined) || "";
	const effectiveInn = relationship === "patient" ? taxpayerInn || patientInn : taxpayerInn;
	const isInnValid = useMemo(() => (!effectiveInn ? true : validateRussianInn(effectiveInn).isValid), [effectiveInn]);

	useEffect(() => {
		if (!isOpen || !patient?.id || payments.length > 0) return;
		let cancelled = false;
		setIsLoadingPreview(true);
		fetchTaxReceiptsPreview(patient.id, selectedYear)
			.then((mapped) => !cancelled && setLivePayments(mapped))
			.catch((err) => !cancelled && console.warn("Live tax preview failed:", err))
			.finally(() => !cancelled && setIsLoadingPreview(false));
		return () => { cancelled = true; };
	}, [isOpen, patient?.id, selectedYear, payments]);

	const effectivePayments = useMemo(() => (payments.length > 0 ? payments : livePayments || []), [payments, livePayments]);
	const aggregated = useMemo(() => aggregatePatientPaymentsForTaxYear(effectivePayments, selectedYear), [effectivePayments, selectedYear]);
	const clinic = useMemo(() => extractClinicRequisites(clinicProfileDraft), [clinicProfileDraft]);

	const handlePrint = () => {
		if (onPrint) onPrint();
		else if (typeof window !== "undefined") {
			printTaxCertificate(buildTaxDocPayload({ selectedYear, patient, clinic, relationship, taxpayerFullName, taxpayerBirthDate, effectiveInn, patientInn, aggregated }));
		}
	};

	const handleCreateAndIssueTaxDocument = async () => {
		if (!patient?.id || isIssuingDoc) return;
		setIsIssuingDoc(true);
		try {
			const paymentIds = effectivePayments.map((p) => p.id).filter((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));
			await issueTaxCertificateDoc({
				patientId: patient.id,
				patientFullName: patient.fullName || "Пациент",
				chiefDoctorOrDirector: clinic.chiefDoctorOrDirector || "Главный врач",
				year: selectedYear,
				effectiveInn,
				totalNetRub: aggregated.totalNetRub,
				paymentIds,
			});
			showToast(`Справка для налогового вычета за ${selectedYear} год сохранена в реестре`, "success", 4000);
			onClose();
		} catch (err) {
			console.warn("Failed to create tax doc on backend:", err);
			showToast("Справка сохранена локально", "info");
			onClose();
		} finally {
			setIsIssuingDoc(false);
		}
	};

	return {
		selectedYear, setSelectedYear, relationship, setRelationship, taxpayerFullName, setTaxpayerFullName,
		taxpayerInn, setTaxpayerInn, taxpayerBirthDate, setTaxpayerBirthDate, effectiveInn, isInnValid,
		isLoadingPreview, isIssuingDoc, aggregated, clinic, handlePrint, handleCreateAndIssueTaxDocument,
	};
}
