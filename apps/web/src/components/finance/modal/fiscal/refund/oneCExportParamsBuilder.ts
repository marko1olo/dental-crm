import type { OneCDocumentType, OneCExportParams } from "@dental/shared";
import type { TreatmentPlanItem } from "../../../../treatment-plans/types";

export interface BuildOneCExportParamsInput {
	readonly clinicName: string;
	readonly oneCClinicInn: string;
	readonly oneCClinicKpp: string;
	readonly actNumber: string;
	readonly oneCDocDate: string;
	readonly oneCDocTime: string;
	readonly oneCDocType: OneCDocumentType;
	readonly patientId: string;
	readonly patientName: string;
	readonly oneCPatientInn: string;
	readonly customerContact?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly oneCPatientAddress: string;
	readonly activeItems: readonly TreatmentPlanItem[];
	readonly totalSumRub: number;
	readonly contractNumber: string;
	readonly cashierFullName?: string | undefined;
}

export function buildOneCExportParams(p: BuildOneCExportParamsInput): OneCExportParams {
	const effectiveDate = p.oneCDocDate || new Date().toISOString().slice(0, 10);
	return {
		exportId: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
		generatedAt: new Date().toISOString(),
		clinic: {
			id: "clinic-dente",
			name: p.clinicName,
			fullName: p.clinicName,
			inn: p.oneCClinicInn,
			kpp: p.oneCClinicKpp,
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
				id: `doc-${p.actNumber}`,
				number: p.actNumber,
				documentDate: effectiveDate,
				documentTime: p.oneCDocTime,
				docType: p.oneCDocType,
				operationName:
					p.oneCDocType === "act"
						? "Реализация товаров и услуг"
						: p.oneCDocType === "invoice"
							? "Заказ покупателя"
							: p.oneCDocType === "cash_order"
								? "Приходный кассовый ордер"
								: "Оплата платежной картой",
				patient: {
					id: p.patientId,
					name: p.patientName,
					fullName: p.patientName,
					inn: p.oneCPatientInn.trim() || null,
					phone: p.customerContact || p.patientPhone || null,
					address: p.oneCPatientAddress || null,
					isLegalEntity: false,
				},
				items: p.activeItems.map((it, idx) => {
					const qty = it.quantity && it.quantity > 0 ? it.quantity : 1;
					const unitPriceKop = Math.round(it.priceRub * 100);
					const discKop = Math.round((it.discountRub || 0) * 100);
					const totalKop = Math.max(0, unitPriceKop * qty - discKop);
					return {
						id: it.id || `item-${idx + 1}`,
						code804n: it.code804n || null,
						name: it.name,
						toothNumber: it.toothNumber ? Number(it.toothNumber) : null,
						quantity: qty,
						priceKopecks: unitPriceKop,
						discountPercent: it.discountRub ? Math.round((it.discountRub / (it.priceRub * qty)) * 100) : 0,
						totalKopecks: totalKop,
						vatRate: "Без НДС",
						vatAmountKopecks: 0,
					};
				}),
				totalKopecks: Math.round(p.totalSumRub * 100),
				contractNumber: p.contractNumber || null,
				contractDate: effectiveDate,
				attendingDoctorName: p.cashierFullName,
				comment: `Выгрузка из CRM DENTE: ${p.actNumber}`,
			},
		],
	};
}
