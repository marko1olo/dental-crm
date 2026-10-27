import type { OneCExportItem } from "../OneCExportButton";

export interface Billing1CExportModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly items: readonly OneCExportItem[];
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly patientAddress?: string | undefined;
	readonly patientInn?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly clinicInn?: string | undefined;
	readonly clinicKpp?: string | undefined;
	readonly contractNumber?: string | undefined;
	readonly contractDate?: string | undefined;
	readonly actNumber?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly totalRub?: number | undefined;
}

export function formatMoney(amount: number): string {
	return `${amount.toLocaleString("ru-RU", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})} ₽`;
}

export function triggerXmlDownload(xmlContent: string, filename: string) {
	const blob = new Blob([xmlContent], { type: "application/xml;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = filename;
	document.body.appendChild(anchor);
	anchor.click();
	document.body.removeChild(anchor);
	URL.revokeObjectURL(url);
}
