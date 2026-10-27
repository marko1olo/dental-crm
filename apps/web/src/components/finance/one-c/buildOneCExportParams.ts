import type { OneCDocumentType, OneCExportParams } from "@dental/shared";
import type { OneCExportItem } from "../OneCExportButton";

export interface BuildOneCExportParamsInput {
	readonly actNumber: string;
	readonly docDate: string;
	readonly docType: OneCDocumentType;
	readonly clinicName: string;
	readonly clinicInn: string;
	readonly clinicKpp: string;
	readonly patientId: string;
	readonly patientName: string;
	readonly patientPhone?: string;
	readonly patientAddress?: string;
	readonly items: readonly OneCExportItem[];
	readonly calculatedTotalRub: number;
	readonly selectedContract?: string;
	readonly selectedContractDate?: string;
	readonly customDoctorName: string;
}

export function buildOneCExportParams(p: BuildOneCExportParamsInput): OneCExportParams {
	return {
		exportId: `exp-${Date.now()}`,
		generatedAt: new Date().toISOString(),
		clinic: {
			id: "clinic-dente",
			name: p.clinicName,
			fullName: p.clinicName,
			inn: p.clinicInn,
			kpp: p.clinicKpp,
			isLegalEntity: true,
			phone: "",
			address: "г. Москва, ул. Стоматологическая, д. 10",
		},
		documents: [
			{
				id: `doc-${p.actNumber}`,
				number: p.actNumber,
				documentDate: p.docDate,
				documentTime: "12:00:00",
				docType: p.docType,
				operationName: p.docType === "act" ? "Реализация медицинских услуг" : "Заказ покупателя",
				patient: {
					id: p.patientId,
					name: p.patientName,
					fullName: p.patientName,
					phone: p.patientPhone || null,
					address: p.patientAddress || null,
					isLegalEntity: false,
				},
				items: p.items.map((it, idx) => {
					const qty = it.quantity && it.quantity > 0 ? it.quantity : 1;
					const unitPriceKop = Math.round(it.priceRub * 100);
					const discKop = Math.round((it.discountRub || 0) * 100);
					const grossKop = unitPriceKop * qty;
					return {
						id: it.id || `item-${idx + 1}`,
						code804n: it.code804n || null,
						name: it.name,
						toothNumber: it.toothNumber ? Number(it.toothNumber) : null,
						quantity: qty,
						priceKopecks: unitPriceKop,
						discountPercent: grossKop > 0 && discKop > 0 ? Math.min(100, Math.round((discKop / grossKop) * 100)) : 0,
						totalKopecks: Math.max(0, grossKop - discKop),
						vatRate: "Без НДС",
						vatAmountKopecks: 0,
					};
				}),
				totalKopecks: Math.round(p.calculatedTotalRub * 100),
				contractNumber: p.selectedContract || null,
				contractDate: p.selectedContractDate || null,
				attendingDoctorName: p.customDoctorName,
				comment: `Выгрузка из CRM DENTE: ${p.actNumber}`,
			},
		],
	};
}
