import { useState, useMemo } from "react";
import type { TreatmentPlanItem } from "../../../treatment-plans/types";
import { showToast } from "../../../GlobalToast";
import {
	calculateTaxDeductionBreakdown,
	generateTaxDeductionCertificate,
	type FiscalReceipt54FzResult,
	type TaxDeductionRelationship,
} from "../../fiscalReceiptEngine";
import { formatMoneyRu } from "./fiscalModalRefundLogic";

export interface UseFiscalTaxCertificateParams {
	readonly activeItems: readonly TreatmentPlanItem[];
	readonly patientName: string;
	readonly fiscalReceipt: FiscalReceipt54FzResult;
}

export function useFiscalTaxCertificateTabState({
	activeItems,
	patientName,
	fiscalReceipt,
}: UseFiscalTaxCertificateParams) {
	const [payerFullName, setPayerFullName] = useState<string>(patientName);
	const [payerInn, setPayerInn] = useState<string>("");
	const [payerRelationship, setPayerRelationship] = useState<TaxDeductionRelationship>("self");
	const [taxYear, setTaxYear] = useState<number>(new Date().getFullYear());

	const taxDeductionBreakdown = useMemo(() => {
		return calculateTaxDeductionBreakdown(activeItems);
	}, [activeItems]);

	const taxDeductionCert = useMemo(() => {
		return generateTaxDeductionCertificate({
			receipt: fiscalReceipt,
			payerFullName: payerFullName.trim() || patientName,
			payerInn: payerInn.trim() || undefined,
			payerRelationship,
			taxYear,
		});
	}, [fiscalReceipt, payerFullName, patientName, payerInn, payerRelationship, taxYear]);

	const handleCopyCertData = () => {
		const text = `СПРАВКА ОБ ОПЛАТЕ МЕДИЦИНСКИХ УСЛУГ ДЛЯ ФНС (КНД 1151156)
Номер: ${taxDeductionCert.certificateNumber}
Клиника: ${taxDeductionCert.clinicLegalName} (ИНН ${taxDeductionCert.clinicInn} / КПП ${taxDeductionCert.clinicKpp})
Налогоплательщик: ${taxDeductionCert.payerFullName} (Степень родства: ${taxDeductionCert.payerRelationshipLabel}, Код ${taxDeductionCert.payerRelationshipCode})
Пациент: ${taxDeductionCert.patientFullName}
Налоговый период: ${taxDeductionCert.taxYear} год
Сумма по Коду 01 (Стандартное лечение): ${formatMoneyRu(taxDeductionCert.breakdown.code01Rub)}
Сумма по Коду 02 (Дорогостоящее лечение): ${formatMoneyRu(taxDeductionCert.breakdown.code02Rub)}
ИТОГО к вычету: ${formatMoneyRu(taxDeductionCert.breakdown.totalRub)}
Оценка возврата НДФЛ (13%): ${formatMoneyRu(taxDeductionCert.breakdown.refund13EstimateRub)}`;
		navigator.clipboard.writeText(text);
		showToast("Данные справки скопированы в буфер обмена!", "success", 2500);
	};

	return {
		payerFullName,
		setPayerFullName,
		payerInn,
		setPayerInn,
		payerRelationship,
		setPayerRelationship,
		taxYear,
		setTaxYear,
		taxDeductionBreakdown,
		taxDeductionCert,
		handleCopyCertData,
	};
}
