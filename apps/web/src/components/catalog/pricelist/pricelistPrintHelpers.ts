import { generatePrintablePricelistHtml } from "./servicePricelistEngine";
import type {
	PriceTierKind,
	ServicePricelistItem,
} from "./servicePricelistPresets";

export interface PricelistPrintClinicMeta {
	readonly clinicName: string;
	readonly clinicAddress: string;
	readonly clinicPhone: string;
	readonly clinicLicense: string;
	readonly chiefDoctorName: string;
}

export type ClinicPrintMeta = PricelistPrintClinicMeta;

export function openPrintPricelistWindow(
	meta: PricelistPrintClinicMeta,
	items: readonly ServicePricelistItem[],
	tier: PriceTierKind,
	isConsumerCornerStand = false,
) {
	const printHtml = generatePrintablePricelistHtml(
		{
			clinicName: meta.clinicName,
			clinicAddress: meta.clinicAddress,
			clinicPhone: meta.clinicPhone,
			clinicLicense: meta.clinicLicense,
			chiefDoctorName: meta.chiefDoctorName,
			effectiveDateRu: new Date().toLocaleDateString("ru-RU"),
			isConsumerCornerStand,
		},
		items,
		isConsumerCornerStand ? "standard" : tier,
	);

	const printWindow = window.open("", "_blank", "width=900,height=1000");
	if (printWindow) {
		printWindow.document.open();
		printWindow.document.write(printHtml);
		printWindow.document.close();
		printWindow.focus();
		setTimeout(() => {
			printWindow.print();
		}, 300);
	}
}
