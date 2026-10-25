/**
 * apps/web/src/components/sanpin/journalModules/sanpinJournalTypes.ts
 *
 * Layer 0: Data contracts, TypeScript types for SanPin Sterilization Journal.
 * Mandate 8b: strictly <= 120 lines.
 */

export interface SanPinCycleEntry {
	id: string;
	date: string;
	time: string;
	cycleNumber: number;
	autoclaveCode: string;
	autoclaveModel: string;
	temperatureC: number;
	pressureBar: number;
	durationMin: number;
	regimeName: string;
	indicatorClass: "4" | "5" | "6";
	colorBefore: string;
	colorBeforeHex: string;
	colorAfter: string;
	colorAfterHex: string;
	isIndicatorNorm: boolean;
	pouchCodes: string[];
	itemsSummary: string;
	operatorName: string;
	status: "passed" | "warning" | "failed";
	batchSize?: number;
	batchBarcode?: string;
	psoStatus?: "norm" | "defect" | "none";
	kraftPouchesCount?: number;
}

export type SanPinJournalPeriod = "day" | "week" | "month";

export interface SanPinSterilizationJournalProps {
	readonly initialFilterAutoclave?: string | undefined;
	readonly className?: string | undefined;
	readonly onOpenEquipmentModal?: (() => void) | undefined;
	readonly onOpenNewCycleModal?: (() => void) | undefined;
}

export { DEFAULT_CYCLES } from "./sanpinDefaultCycles";
