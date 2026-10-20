import type { LinkedChairsideLabOrderInfo } from "./OrthopedicsChairsideLabOrderBanner.js";
import type { Order804nServiceItem } from "./orthopedicProtocols.js";

export interface OrthopedicsChairsidePanelProps {
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly activeToothFdi?: string | number | undefined;
	readonly selectedTeeth?: readonly (string | number)[] | undefined;
	readonly recentToothXrayUrl?: string | undefined;
	readonly initialLabOrder?: LinkedChairsideLabOrderInfo | null | undefined;
	readonly onConfirmFitting?: ((orderId?: string) => void) | undefined;
	readonly onToothSelect?: ((tooth: number) => void) | undefined;
	readonly onOpenLabOrder?: (() => void) | undefined;
	readonly onAddToInvoice?: ((services: readonly Order804nServiceItem[]) => void) | undefined;
	readonly isLocked?: boolean;
	readonly className?: string;
}

export function calculateDueDateStr(days: number): string {
	const d = new Date();
	let added = 0;
	while (added < days) {
		d.setDate(d.getDate() + 1);
		if (d.getDay() !== 0 && d.getDay() !== 6) added++;
	}
	return d.toISOString().slice(0, 10);
}
