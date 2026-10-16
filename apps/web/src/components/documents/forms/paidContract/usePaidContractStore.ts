import { useMemo } from "react";
import { useDocumentStore } from "../../../../store/documentStore";
import { parseRublesToKopecks, createDefaultPaidContract, generatePaidContractNumber, generatePaidContractText, printPaidContract736 } from "../../paidContractEngine";
import { type PaidContractRequiredFieldsReview, paidContractRequiredFieldsReview } from "../../paidContractRequiredFields";
import { showToast } from "../../../GlobalToast";

export function usePaidContractStore(props: {
	documentPatientFullName?: string | null | undefined;
	documentPatientPassport?: string | null | undefined;
	documentPatientBirthDate?: string | null | undefined;
	documentPatientPhone?: string | null | undefined;
	documentPatientAddress?: string | null | undefined;
	documentPatientSnils?: string | null | undefined;
	documentPatientCardNumber?: string | null | undefined;
	activeVisitComplaint?: string | null | undefined;
	activeVisitTreatmentPlan?: string | null | undefined;
	activeVisitDoctorSummary?: string | null | undefined;
	activeDoctorFullName?: string | null | undefined;
	totalRubValue?: number | undefined;
}) {
	const store = useDocumentStore();
	const totalRubVal = props.totalRubValue ?? 0;

	const effectiveTotalRub = useMemo(() => {
		const parsedKopecks = parseRublesToKopecks(store.paidContractTotalRub);
		return parsedKopecks > 0 ? parsedKopecks / 100 : totalRubVal;
	}, [store.paidContractTotalRub, totalRubVal]);

	const review: PaidContractRequiredFieldsReview = useMemo(() => paidContractRequiredFieldsReview({
		contractNumber: store.paidContractNumber, serviceStart: store.paidContractServiceStart,
		serviceEnd: store.paidContractServiceEnd, customerFullName: store.paidContractCustomerFullName,
		patientFullName: props.documentPatientFullName ?? "", careReason: store.paidContractCareReason,
		visitComplaint: props.activeVisitComplaint ?? "", serviceScope: store.paidContractServiceScope,
		visitTreatmentPlan: props.activeVisitTreatmentPlan ?? "", visitDoctorSummary: props.activeVisitDoctorSummary ?? "",
		totalRub: effectiveTotalRub, paymentTerms: store.paidContractPaymentTerms,
		priceChangeRules: store.paidContractPriceChangeRules, freeCareNotice: store.paidContractFreeCareNotice,
		recommendationWarning: store.paidContractRecommendationWarning, refundTerms: store.paidContractRefundTerms,
		warrantyTerms: store.paidContractWarrantyTerms, doctorFullName: store.paidContractDoctorFullName,
		activeDoctorFullName: props.activeDoctorFullName ?? "", clinicInfoConfirmed: store.paidContractClinicInfoConfirmed,
		serviceListConfirmed: store.paidContractServiceListConfirmed, paidBasisConfirmed: store.paidContractPaidBasisConfirmed,
		writtenChangesConfirmed: store.paidContractWrittenChangesConfirmed,
	}, { allowBlankForPrint: true }), [store, props, effectiveTotalRub]);

	const handleFillStandardContract = () => {
		const todayIso = new Date().toISOString().slice(0, 10);
		if (!store.paidContractNumber.trim()) store.setPaidContractNumber(generatePaidContractNumber({ patientFullName: props.documentPatientFullName || null, year: new Date().getFullYear() }));
		if (!store.paidContractDate.trim()) store.setPaidContractDate(todayIso);
		if (!store.paidContractServiceStart.trim()) store.setPaidContractServiceStart(todayIso);
		if (!store.paidContractServiceEnd.trim()) store.setPaidContractServiceEnd("до полного исполнения сторонами обязательств");
		if (!store.paidContractCustomerFullName.trim() && props.documentPatientFullName) store.setPaidContractCustomerFullName(props.documentPatientFullName);
		if (!store.paidContractCareReason.trim()) store.setPaidContractCareReason(props.activeVisitComplaint || "Плановое стоматологическое лечение по результатам осмотра");
		if (!store.paidContractServiceScope.trim()) store.setPaidContractServiceScope(props.activeVisitTreatmentPlan || props.activeVisitDoctorSummary || "Комплекс стоматологических услуг согласно согласованному плану лечения");
		if (totalRubVal > 0) store.setPaidContractTotalRub(String(totalRubVal));
		else if (!store.paidContractTotalRub.trim() || Number(store.paidContractTotalRub) <= 0) store.setPaidContractTotalRub("1000");
		if (!store.paidContractDoctorFullName.trim()) store.setPaidContractDoctorFullName(props.activeDoctorFullName || "Врач-стоматолог клиники");
		if (!store.paidContractSignedAt.trim()) store.setPaidContractSignedAt(todayIso);
		store.setPaidContractClinicInfoConfirmed(true); store.setPaidContractServiceListConfirmed(true);
		store.setPaidContractPaidBasisConfirmed(true); store.setPaidContractWrittenChangesConfirmed(true);
		showToast("Типовой договор заполнен", "success", 3000);
	};

	const buildContractData = () => {
		const kopecks = parseRublesToKopecks(store.paidContractTotalRub) || (totalRubVal ? Math.round(totalRubVal * 100) : 0);
		const c = createDefaultPaidContract({
			contractNumber: store.paidContractNumber.trim() || undefined, contractDate: store.paidContractDate.trim() || undefined,
			patientFullName: props.documentPatientFullName || undefined, patientPassport: props.documentPatientPassport || undefined,
			patientBirthDate: props.documentPatientBirthDate || undefined, patientPhone: props.documentPatientPhone || undefined,
			patientAddress: props.documentPatientAddress || undefined, patientSnils: props.documentPatientSnils || undefined,
			cardNumber: props.documentPatientCardNumber || undefined,
			doctorFullName: store.paidContractDoctorFullName.trim() || props.activeDoctorFullName || undefined,
			clinicalReason: store.paidContractCareReason.trim() || props.activeVisitComplaint || undefined,
			serviceScopeSummary: store.paidContractServiceScope.trim() || props.activeVisitTreatmentPlan || undefined,
			totalAmountKopecks: kopecks, serviceStart: store.paidContractServiceStart.trim() || undefined,
			serviceEndOrCondition: store.paidContractServiceEnd.trim() || undefined,
		});
		if (store.paidContractCustomerFullName.trim()) {
			c.customer.fullName = store.paidContractCustomerFullName.trim();
			c.customer.isDifferentFromPatient = store.paidContractCustomerFullName.trim().toLowerCase() !== (props.documentPatientFullName || "").trim().toLowerCase();
		}
		if (store.paidContractRepresentativeFullName.trim()) { c.representative.fullName = store.paidContractRepresentativeFullName.trim(); c.representative.hasRepresentative = true; }
		if (store.paidContractPaymentTerms.trim()) c.paymentTerms = store.paidContractPaymentTerms.trim();
		if (store.paidContractPriceChangeRules.trim()) c.priceChangeRules = store.paidContractPriceChangeRules.trim();
		if (store.paidContractFreeCareNotice.trim()) c.freeCareNotice = store.paidContractFreeCareNotice.trim();
		if (store.paidContractRecommendationWarning.trim()) c.medicalRecommendationWarning = store.paidContractRecommendationWarning.trim();
		if (store.paidContractRefundTerms.trim()) c.refusalAndRefundTerms = store.paidContractRefundTerms.trim();
		if (store.paidContractWarrantyTerms.trim()) c.warrantyTerms = store.paidContractWarrantyTerms.trim();
		if (store.paidContractSignedAt.trim()) c.signedAt = store.paidContractSignedAt.trim();
		return c;
	};

	const handleResetContractFields = () => {
		store.setPaidContractNumber(""); store.setPaidContractDate(""); store.setPaidContractServiceStart("");
		store.setPaidContractServiceEnd(""); store.setPaidContractCustomerFullName(""); store.setPaidContractRepresentativeFullName("");
		store.setPaidContractCareReason(""); store.setPaidContractServiceScope(""); store.setPaidContractTotalRub("");
		store.setPaidContractDoctorFullName(""); store.setPaidContractPaymentTerms(""); store.setPaidContractPriceChangeRules("");
		store.setPaidContractFreeCareNotice(""); store.setPaidContractRecommendationWarning(""); store.setPaidContractRefundTerms("");
		store.setPaidContractWarrantyTerms(""); store.setPaidContractSignedAt(""); store.setPaidContractClinicInfoConfirmed(false);
		store.setPaidContractServiceListConfirmed(false); store.setPaidContractPaidBasisConfirmed(false); store.setPaidContractWrittenChangesConfirmed(false);
		showToast("Поля договора очищены", "info", 2500);
	};

	return {
		store, review, effectiveTotalRub, handleFillStandardContract,
		handlePrintFilledContract: () => { printPaidContract736(buildContractData()); showToast("Договор отправлен на печать", "success", 3000); },
		handleCopyContractText: () => {
			if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
				void navigator.clipboard.writeText(generatePaidContractText(buildContractData()))
					.then(() => showToast("Текст скопирован в буфер", "success", 3000), () => showToast("Ошибка копирования", "error", 3000));
			}
		},
		handleGenerateNewNumber: () => {
			const n = generatePaidContractNumber({ patientFullName: props.documentPatientFullName || null, year: new Date().getFullYear() });
			store.setPaidContractNumber(n); showToast(`Сформирован номер: ${n}`, "info", 3000);
		},
		handleResetContractFields,
	};
}
