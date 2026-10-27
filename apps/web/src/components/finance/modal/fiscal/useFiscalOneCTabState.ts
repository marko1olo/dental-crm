import { useState, useMemo } from "react";
import {
	generateOneCEnterpriseXml,
	type OneCDocumentType,
	type OneCExportParams,
} from "@dental/shared";
import type { TreatmentPlanItem } from "../../../treatment-plans/types";
import { showToast } from "../../../GlobalToast";
import { numberToWordsRu } from "../../invoiceEngine";
import { formatMoneyRu } from "./fiscalModalRefundLogic";

export interface UseFiscalOneCTabStateParams {
	readonly activeItems: readonly TreatmentPlanItem[];
	readonly totalSumRub: number;
	readonly patientId: string;
	readonly patientName: string;
	readonly patientPhone: string;
	readonly customerContact: string;
	readonly cashierFullName: string;
	readonly clinicName: string;
}

export function useFiscalOneCTabState(p: UseFiscalOneCTabStateParams) {
	const [actNumber, setActNumber] = useState<string>(
		`АКТ-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
	);
	const [contractNumber, setContractNumber] = useState<string>(
		`ДОГ-${new Date().getFullYear()}/${(p.patientId || "patient").slice(0, 5).toUpperCase()}`,
	);
	const [oneCDocType, setOneCDocType] = useState<OneCDocumentType>("act");
	const [oneCDocDate, setOneCDocDate] = useState<string>(new Date().toISOString().slice(0, 10));
	const [oneCDocTime] = useState<string>("12:00:00");
	const [oneCClinicInn, setOneCClinicInn] = useState<string>("");
	const [oneCClinicKpp, setOneCClinicKpp] = useState<string>("");
	const [oneCPatientInn, setOneCPatientInn] = useState<string>("");
	const [oneCPatientAddress, setOneCPatientAddress] = useState<string>("");

	const oneCExportParams: OneCExportParams = useMemo(() => {
		const effectiveDate = oneCDocDate || new Date().toISOString().slice(0, 10);
		return {
			exportId: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
			generatedAt: new Date().toISOString(),
			clinic: {
				id: "clinic-dente",
				name: p.clinicName,
				fullName: p.clinicName,
				inn: oneCClinicInn,
				kpp: oneCClinicKpp,
				isLegalEntity: true,
				phone: "",
				address: "г. Москва, Ломоносовский проспект, д. 24",
				bankAccount: "40702810938000012345",
				bankBik: "044525225",
				bankName: "ПАО СБЕРБАНК",
				bankCorrAccount: "30101810400000000225",
			},
			documents: [
				{
					id: `doc-${actNumber}`,
					number: actNumber,
					documentDate: effectiveDate,
					documentTime: oneCDocTime,
					docType: oneCDocType,
					operationName:
						oneCDocType === "act" ? "Реализация товаров и услуг"
						: oneCDocType === "invoice" ? "Заказ покупателя"
						: oneCDocType === "cash_order" ? "Приходный кассовый ордер"
						: "Оплата платежной картой",
					patient: {
						id: p.patientId,
						name: p.patientName,
						fullName: p.patientName,
						inn: oneCPatientInn.trim() || null,
						phone: p.customerContact || p.patientPhone || null,
						address: oneCPatientAddress || null,
						isLegalEntity: false,
					},
					items: p.activeItems.map((it, idx) => {
						const qty = it.quantity && it.quantity > 0 ? it.quantity : 1;
						const unitPriceKop = Math.round(it.priceRub * 100);
						const discKop = Math.round((it.discountRub || 0) * 100);
						return {
							id: it.id || `item-${idx + 1}`,
							code804n: it.code804n || null,
							name: it.name,
							toothNumber: it.toothNumber ? Number(it.toothNumber) : null,
							quantity: qty,
							priceKopecks: unitPriceKop,
							discountPercent: it.discountRub ? Math.round((it.discountRub / (it.priceRub * qty)) * 100) : 0,
							totalKopecks: Math.max(0, unitPriceKop * qty - discKop),
							vatRate: "Без НДС",
							vatAmountKopecks: 0,
						};
					}),
					totalKopecks: Math.round(p.totalSumRub * 100),
					contractNumber: contractNumber || null,
					contractDate: effectiveDate,
					attendingDoctorName: p.cashierFullName,
					comment: `Выгрузка из CRM DENTE: ${actNumber}`,
				},
			],
		};
	}, [p, oneCClinicInn, oneCClinicKpp, actNumber, oneCDocDate, oneCDocTime, oneCDocType, oneCPatientInn, oneCPatientAddress, contractNumber]);

	const oneCXmlPreview = useMemo(() => {
		try {
			return generateOneCEnterpriseXml(oneCExportParams);
		} catch (err) {
			return `<!-- Ошибка формирования XML: ${err instanceof Error ? err.message : String(err)} -->`;
		}
	}, [oneCExportParams]);

	const handleCopyActData = () => {
		const lines = [
			`АКТ № ${actNumber} СДАЧИ-ПРИЕМКИ ВЫПОЛНЕННЫХ СТОМАТОЛОГИЧЕСКИХ РАБОТ (ОКАЗАННЫХ УСЛУГ)`,
			`Дата: ${new Date().toLocaleDateString("ru-RU")}`,
			`К договору оказания платных медицинских услуг: № ${contractNumber}`,
			`Исполнитель: ${p.clinicName}`,
			`Пациент (Заказчик): ${p.patientName}`,
			``,
			`ОКАЗАННЫЕ МЕДИЦИНСКИЕ УСЛУГИ:`,
			...p.activeItems.map((it, i) => {
				const toothPart = it.toothNumber ? ` [Зуб ${it.toothNumber}]` : "";
				const codePart = it.code804n ? ` (${it.code804n})` : "";
				const qty = it.quantity || 1;
				const sum = it.priceRub * qty - (it.discountRub || 0);
				return `${i + 1}. ${it.name}${codePart}${toothPart} — ${qty} шт. × ${formatMoneyRu(it.priceRub)} = ${formatMoneyRu(sum)}`;
			}),
			``,
			`ИТОГО ОКАЗАНО УСЛУГ: ${formatMoneyRu(p.totalSumRub)}`,
			`Сумма прописью: ${numberToWordsRu(p.totalSumRub)}`,
			``,
			`УСЛОВИЯ ПРИЕМКИ:`,
			`Вышеперечисленные медицинские услуги выполнены в полном объеме, надлежащего качества и в установленные сроки.`,
			`Заказчик претензий по объему, качеству и срокам оказания услуг к Исполнителю не имеет.`,
			``,
			`Исполнитель: _________________ / ${p.cashierFullName}`,
			`Заказчик:    _________________ / ${p.patientName}`,
		];
		navigator.clipboard.writeText(lines.join("\n"));
		showToast("Текст Акта выполненных работ скопирован в буфер!", "success", 2500);
	};

	return {
		actNumber, setActNumber,
		contractNumber, setContractNumber,
		oneCDocType, setOneCDocType,
		oneCDocDate, setOneCDocDate,
		oneCDocTime,
		oneCClinicInn, setOneCClinicInn,
		oneCClinicKpp, setOneCClinicKpp,
		oneCPatientInn, setOneCPatientInn,
		oneCPatientAddress, setOneCPatientAddress,
		oneCExportParams,
		oneCXmlPreview,
		handleCopyActData,
	};
}
